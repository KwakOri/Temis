-- =====================================================
-- Royalty rules, snapshots, and settlement batches
-- =====================================================

CREATE TABLE IF NOT EXISTS public.artist_royalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL
    REFERENCES public.artists(id) ON DELETE CASCADE,
  template_id UUID
    REFERENCES public.templates(id) ON DELETE CASCADE,
  royalty_type TEXT NOT NULL
    CHECK (royalty_type IN ('fixed', 'percentage')),
  royalty_value NUMERIC(12, 2) NOT NULL
    CHECK (royalty_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CHECK (
    royalty_type <> 'percentage'
    OR royalty_value <= 100
  )
);

COMMENT ON TABLE public.artist_royalty_rules IS '작가 기본/템플릿별 로열티 산정 규칙';
COMMENT ON COLUMN public.artist_royalty_rules.template_id IS 'NULL이면 작가 기본 로열티, 값이 있으면 해당 템플릿 override';
COMMENT ON COLUMN public.artist_royalty_rules.royalty_type IS 'fixed: 고정 금액, percentage: 판매 금액 대비 비율';
COMMENT ON COLUMN public.artist_royalty_rules.royalty_value IS 'fixed면 원 단위 금액, percentage면 퍼센트 값';

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_royalty_rules_default_unique
  ON public.artist_royalty_rules(artist_id)
  WHERE template_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_royalty_rules_template_unique
  ON public.artist_royalty_rules(artist_id, template_id)
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artist_royalty_rules_artist_id
  ON public.artist_royalty_rules(artist_id);

CREATE INDEX IF NOT EXISTS idx_artist_royalty_rules_template_id
  ON public.artist_royalty_rules(template_id);

CREATE OR REPLACE FUNCTION public.update_artist_royalty_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_artist_royalty_rules_updated_at
  ON public.artist_royalty_rules;

CREATE TRIGGER trigger_artist_royalty_rules_updated_at
  BEFORE UPDATE ON public.artist_royalty_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_artist_royalty_rules_updated_at();

CREATE TABLE IF NOT EXISTS public.royalty_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_month DATE NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid'
    CHECK (status IN ('draft', 'paid', 'cancelled')),
  total_amount INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  created_by BIGINT
    REFERENCES public.users(id) ON DELETE SET NULL,
  paid_by BIGINT
    REFERENCES public.users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CHECK (period_from <= period_to)
);

COMMENT ON TABLE public.royalty_settlement_batches IS '로열티 지급 처리 묶음(월별/작가별 정산 회차)';
COMMENT ON COLUMN public.royalty_settlement_batches.settlement_month IS '정산 기준 월의 1일';
COMMENT ON COLUMN public.royalty_settlement_batches.period_from IS '정산 대상 판매 시작일';
COMMENT ON COLUMN public.royalty_settlement_batches.period_to IS '정산 대상 판매 종료일';

CREATE INDEX IF NOT EXISTS idx_royalty_settlement_batches_month
  ON public.royalty_settlement_batches(settlement_month DESC);

CREATE INDEX IF NOT EXISTS idx_royalty_settlement_batches_paid_at
  ON public.royalty_settlement_batches(paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_royalty_settlement_batches_status
  ON public.royalty_settlement_batches(status);

CREATE OR REPLACE FUNCTION public.update_royalty_settlement_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_royalty_settlement_batches_updated_at
  ON public.royalty_settlement_batches;

CREATE TRIGGER trigger_royalty_settlement_batches_updated_at
  BEFORE UPDATE ON public.royalty_settlement_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_royalty_settlement_batches_updated_at();

ALTER TABLE public.template_sale_royalties
  ADD COLUMN IF NOT EXISTS royalty_rule_id UUID
    REFERENCES public.artist_royalty_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS royalty_source TEXT NOT NULL DEFAULT 'missing'
    CHECK (royalty_source IN ('artist', 'template', 'manual', 'missing')),
  ADD COLUMN IF NOT EXISTS royalty_type_snapshot TEXT
    CHECK (
      royalty_type_snapshot IS NULL
      OR royalty_type_snapshot IN ('fixed', 'percentage')
    ),
  ADD COLUMN IF NOT EXISTS royalty_value_snapshot NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS settlement_batch_id UUID
    REFERENCES public.royalty_settlement_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_template_sale_royalties_royalty_rule_id
  ON public.template_sale_royalties(royalty_rule_id);

CREATE INDEX IF NOT EXISTS idx_template_sale_royalties_royalty_source
  ON public.template_sale_royalties(royalty_source);

CREATE INDEX IF NOT EXISTS idx_template_sale_royalties_settlement_batch_id
  ON public.template_sale_royalties(settlement_batch_id);

CREATE OR REPLACE FUNCTION public.calculate_template_sale_royalty(
  p_template_id UUID,
  p_artist_id UUID,
  p_sale_amount INTEGER
)
RETURNS TABLE (
  royalty_rule_id UUID,
  royalty_source TEXT,
  royalty_type TEXT,
  royalty_value NUMERIC,
  royalty_amount INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_rule AS (
    SELECT
      arr.id,
      CASE
        WHEN arr.template_id IS NOT NULL THEN 'template'::text
        ELSE 'artist'::text
      END AS source,
      arr.royalty_type,
      arr.royalty_value
    FROM public.artist_royalty_rules arr
    WHERE arr.artist_id = p_artist_id
      AND (
        arr.template_id = p_template_id
        OR arr.template_id IS NULL
      )
    ORDER BY
      CASE WHEN arr.template_id = p_template_id THEN 0 ELSE 1 END,
      arr.updated_at DESC
    LIMIT 1
  )
  SELECT
    matched_rule.id,
    matched_rule.source,
    matched_rule.royalty_type,
    matched_rule.royalty_value,
    GREATEST(
      0,
      CASE
        WHEN matched_rule.royalty_type = 'fixed' THEN
          ROUND(matched_rule.royalty_value)
        WHEN matched_rule.royalty_type = 'percentage' THEN
          ROUND(COALESCE(p_sale_amount, 0)::numeric * matched_rule.royalty_value / 100)
        ELSE 0
      END
    )::integer
  FROM matched_rule;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::uuid,
      'missing'::text,
      NULL::text,
      NULL::numeric,
      0::integer;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.recalculate_royalty_settlement_batch(
  p_batch_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_total_amount INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(royalty_amount), 0)::integer,
    COUNT(*)::integer
  INTO v_total_amount, v_total_count
  FROM public.template_sale_royalties
  WHERE settlement_batch_id = p_batch_id
    AND status = 'paid';

  UPDATE public.royalty_settlement_batches
  SET
    total_amount = v_total_amount,
    total_count = v_total_count,
    status = CASE
      WHEN v_total_count = 0 THEN 'cancelled'
      WHEN status = 'cancelled' THEN 'paid'
      ELSE status
    END
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_template_sale_royalties_from_template_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.template_sale_royalties (
    template_sale_id,
    artist_id,
    artist_name_snapshot,
    royalty_amount,
    status,
    royalty_rule_id,
    royalty_source,
    royalty_type_snapshot,
    royalty_value_snapshot
  )
  SELECT
    NEW.id,
    a.id,
    a.name,
    calculated.royalty_amount,
    'unpaid',
    calculated.royalty_rule_id,
    calculated.royalty_source,
    calculated.royalty_type,
    calculated.royalty_value
  FROM public.template_artists ta
  JOIN public.artists a
    ON a.id = ta.artist_id
  CROSS JOIN LATERAL public.calculate_template_sale_royalty(
    NEW.template_id,
    a.id,
    NEW.amount_paid
  ) calculated
  WHERE ta.template_id = NEW.template_id
    AND a.is_active = true
  ORDER BY ta.is_primary DESC, ta.display_order ASC, a.name ASC
  ON CONFLICT (template_sale_id, artist_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW public.template_sale_royalty_details AS
SELECT
  tsr.id,
  tsr.template_sale_id,
  tsr.artist_id,
  tsr.artist_name_snapshot,
  tsr.royalty_amount,
  tsr.status,
  tsr.paid_at,
  tsr.paid_by,
  tsr.created_at,
  tsr.updated_at,
  ts.purchase_request_id,
  ts.template_id,
  ts.plan_id,
  ts.user_id,
  ts.amount_paid AS sale_amount,
  ts.currency,
  ts.status AS sale_status,
  ts.paid_at AS sale_paid_at,
  ts.depositor_name,
  ts.template_name_snapshot,
  tp.plan AS plan_name,
  tsr.royalty_rule_id,
  tsr.royalty_source,
  tsr.royalty_type_snapshot,
  tsr.royalty_value_snapshot,
  tsr.settlement_batch_id,
  rsb.title AS settlement_batch_title,
  rsb.status AS settlement_batch_status,
  rsb.settlement_month
FROM public.template_sale_royalties tsr
JOIN public.template_sales ts
  ON ts.id = tsr.template_sale_id
LEFT JOIN public.template_plans tp
  ON tp.id = ts.plan_id
LEFT JOIN public.royalty_settlement_batches rsb
  ON rsb.id = tsr.settlement_batch_id;

GRANT ALL ON TABLE public.artist_royalty_rules TO anon;
GRANT ALL ON TABLE public.artist_royalty_rules TO authenticated;
GRANT ALL ON TABLE public.artist_royalty_rules TO service_role;

GRANT ALL ON TABLE public.royalty_settlement_batches TO anon;
GRANT ALL ON TABLE public.royalty_settlement_batches TO authenticated;
GRANT ALL ON TABLE public.royalty_settlement_batches TO service_role;

GRANT ALL ON FUNCTION public.update_artist_royalty_rules_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_artist_royalty_rules_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_artist_royalty_rules_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.update_royalty_settlement_batches_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_royalty_settlement_batches_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_royalty_settlement_batches_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.calculate_template_sale_royalty(UUID, UUID, INTEGER) TO anon;
GRANT ALL ON FUNCTION public.calculate_template_sale_royalty(UUID, UUID, INTEGER) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_template_sale_royalty(UUID, UUID, INTEGER) TO service_role;

GRANT ALL ON FUNCTION public.recalculate_royalty_settlement_batch(UUID) TO anon;
GRANT ALL ON FUNCTION public.recalculate_royalty_settlement_batch(UUID) TO authenticated;
GRANT ALL ON FUNCTION public.recalculate_royalty_settlement_batch(UUID) TO service_role;
