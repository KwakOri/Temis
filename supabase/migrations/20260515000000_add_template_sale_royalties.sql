-- =====================================================
-- Template Sale Royalties
-- =====================================================

CREATE TABLE IF NOT EXISTS public.template_sale_royalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_sale_id UUID NOT NULL
    REFERENCES public.template_sales(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL
    REFERENCES public.artists(id) ON DELETE RESTRICT,
  artist_name_snapshot TEXT NOT NULL,
  royalty_amount INTEGER NOT NULL DEFAULT 0 CHECK (royalty_amount >= 0),
  status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid')),
  paid_at TIMESTAMPTZ,
  paid_by BIGINT
    REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_sale_id, artist_id)
);

COMMENT ON TABLE public.template_sale_royalties IS '판매 건별 작가 로열티 지급 상태';
COMMENT ON COLUMN public.template_sale_royalties.template_sale_id IS '원본 템플릿 판매 로그 ID';
COMMENT ON COLUMN public.template_sale_royalties.artist_id IS '판매 시점 로열티 대상 작가 ID';
COMMENT ON COLUMN public.template_sale_royalties.artist_name_snapshot IS '판매 시점 작가 표시 이름';
COMMENT ON COLUMN public.template_sale_royalties.royalty_amount IS '작가에게 지급할 로열티 금액(원)';
COMMENT ON COLUMN public.template_sale_royalties.status IS '로열티 지급 상태(unpaid, paid)';

CREATE INDEX IF NOT EXISTS idx_template_sale_royalties_template_sale_id
  ON public.template_sale_royalties(template_sale_id);
CREATE INDEX IF NOT EXISTS idx_template_sale_royalties_artist_id
  ON public.template_sale_royalties(artist_id);
CREATE INDEX IF NOT EXISTS idx_template_sale_royalties_status
  ON public.template_sale_royalties(status);
CREATE INDEX IF NOT EXISTS idx_template_sale_royalties_paid_at
  ON public.template_sale_royalties(paid_at DESC);

CREATE OR REPLACE FUNCTION public.update_template_sale_royalties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_template_sale_royalties_updated_at
  ON public.template_sale_royalties;

CREATE TRIGGER trigger_template_sale_royalties_updated_at
  BEFORE UPDATE ON public.template_sale_royalties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_sale_royalties_updated_at();

-- Create royalty rows from the artists linked at the sale time.
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
    status
  )
  SELECT
    NEW.id,
    a.id,
    a.name,
    0,
    'unpaid'
  FROM public.template_artists ta
  JOIN public.artists a
    ON a.id = ta.artist_id
  WHERE ta.template_id = NEW.template_id
    AND a.is_active = true
  ORDER BY ta.is_primary DESC, ta.display_order ASC, a.name ASC
  ON CONFLICT (template_sale_id, artist_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_template_sale_royalties_on_template_sale
  ON public.template_sales;

CREATE TRIGGER trigger_sync_template_sale_royalties_on_template_sale
  AFTER INSERT OR UPDATE OF status ON public.template_sales
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.sync_template_sale_royalties_from_template_sale();

-- Backfill existing completed template sales. Existing artist mappings are assumed stable.
INSERT INTO public.template_sale_royalties (
  template_sale_id,
  artist_id,
  artist_name_snapshot,
  royalty_amount,
  status
)
SELECT
  ts.id,
  a.id,
  a.name,
  0,
  'unpaid'
FROM public.template_sales ts
JOIN public.template_artists ta
  ON ta.template_id = ts.template_id
JOIN public.artists a
  ON a.id = ta.artist_id
WHERE ts.status = 'completed'
  AND a.is_active = true
ON CONFLICT (template_sale_id, artist_id) DO NOTHING;

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
  tp.plan AS plan_name
FROM public.template_sale_royalties tsr
JOIN public.template_sales ts
  ON ts.id = tsr.template_sale_id
LEFT JOIN public.template_plans tp
  ON tp.id = ts.plan_id;

COMMENT ON VIEW public.template_sale_royalty_details IS '관리자 로열티 조회용 조인 뷰';

GRANT ALL ON TABLE public.template_sale_royalties TO anon;
GRANT ALL ON TABLE public.template_sale_royalties TO authenticated;
GRANT ALL ON TABLE public.template_sale_royalties TO service_role;

GRANT SELECT ON TABLE public.template_sale_royalty_details TO anon;
GRANT SELECT ON TABLE public.template_sale_royalty_details TO authenticated;
GRANT SELECT ON TABLE public.template_sale_royalty_details TO service_role;

GRANT ALL ON FUNCTION public.update_template_sale_royalties_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_template_sale_royalties_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_template_sale_royalties_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.sync_template_sale_royalties_from_template_sale() TO anon;
GRANT ALL ON FUNCTION public.sync_template_sale_royalties_from_template_sale() TO authenticated;
GRANT ALL ON FUNCTION public.sync_template_sale_royalties_from_template_sale() TO service_role;
