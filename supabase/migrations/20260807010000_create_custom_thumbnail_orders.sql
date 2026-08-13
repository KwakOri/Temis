-- Custom thumbnail orders are intentionally separate from timetable orders.
-- The browser must use server APIs for this table; direct PostgREST access is
-- disabled so ownership and the pricing/acceptance gate cannot be bypassed.

CREATE TABLE IF NOT EXISTS public.custom_thumbnail_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  price_quoted INTEGER,
  depositor_name TEXT,
  contact TEXT NOT NULL,
  purpose TEXT NOT NULL,
  requirements TEXT NOT NULL,
  text_requirements TEXT,
  image_requirements TEXT,
  design_keywords TEXT,
  canvas_width INTEGER NOT NULL DEFAULT 3840,
  canvas_height INTEGER NOT NULL DEFAULT 2160,
  portfolio_consent BOOLEAN NOT NULL DEFAULT false,
  requested_deadline DATE,
  deadline DATE,
  result_template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  admin_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT custom_thumbnail_orders_status_check
    CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT custom_thumbnail_orders_canvas_check
    CHECK (canvas_width = 3840 AND canvas_height = 2160),
  CONSTRAINT custom_thumbnail_orders_completed_consistency_check
    CHECK (
      (status = 'completed' AND result_template_id IS NOT NULL AND completed_at IS NOT NULL)
      OR status <> 'completed'
    )
);

COMMENT ON TABLE public.custom_thumbnail_orders IS
  'Customer-specific 4K Thumbnail Studio orders; completed rows point to a private published template.';
COMMENT ON COLUMN public.custom_thumbnail_orders.result_template_id IS
  'Private published Studio thumbnail template delivered to the customer.';
COMMENT ON COLUMN public.custom_thumbnail_orders.portfolio_consent IS
  'Explicit customer consent for portfolio publication; false means private.';

CREATE TABLE IF NOT EXISTS public.custom_thumbnail_order_files (
  order_id UUID NOT NULL REFERENCES public.custom_thumbnail_orders(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, file_id, role),
  CONSTRAINT custom_thumbnail_order_files_role_check
    CHECK (role IN ('source', 'reference', 'deliverable'))
);

COMMENT ON TABLE public.custom_thumbnail_order_files IS
  'Explicit role-based file links for thumbnail orders; files.order_id remains timetable-only.';

CREATE INDEX IF NOT EXISTS idx_custom_thumbnail_orders_user_created_at
  ON public.custom_thumbnail_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_thumbnail_orders_status_deadline
  ON public.custom_thumbnail_orders(status, deadline);
CREATE INDEX IF NOT EXISTS idx_custom_thumbnail_orders_result_template_id
  ON public.custom_thumbnail_orders(result_template_id);
CREATE INDEX IF NOT EXISTS idx_custom_thumbnail_order_files_file_id
  ON public.custom_thumbnail_order_files(file_id);

CREATE OR REPLACE FUNCTION public.update_custom_thumbnail_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_custom_thumbnail_orders_updated_at
  ON public.custom_thumbnail_orders;
CREATE TRIGGER update_custom_thumbnail_orders_updated_at
  BEFORE UPDATE ON public.custom_thumbnail_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_thumbnail_orders_updated_at();

-- The row is present for an explicit operational switch, but remains disabled
-- until pricing, options, capacity and cutoff policy are finalized.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_options
    WHERE category = 'general'
      AND value = 'custom_thumbnail_orders'
  ) THEN
    INSERT INTO public.admin_options (
      category,
      label,
      value,
      description,
      price,
      is_discount,
      is_enabled
    )
    VALUES (
      'general',
      '썸네일 주문제작 접수',
      'custom_thumbnail_orders',
      '가격·옵션·슬롯 정책 확정 후에만 활성화합니다.',
      0,
      false,
      false
    );
  END IF;
END
$$;

-- These tables are accessed by server routes using the service-role client.
-- No authenticated/anon policy is intentionally added: default-deny RLS keeps
-- a browser key from reading another customer's private order or file links.
ALTER TABLE public.custom_thumbnail_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_thumbnail_order_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.custom_thumbnail_orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.custom_thumbnail_order_files FROM anon, authenticated;
GRANT ALL ON TABLE public.custom_thumbnail_orders TO service_role;
GRANT ALL ON TABLE public.custom_thumbnail_order_files TO service_role;

-- Completion is the only write that crosses the order/template/access boundary.
-- It validates the result template and performs access upsert plus order
-- completion in one transaction. Repeating the same request is idempotent.
CREATE OR REPLACE FUNCTION public.complete_custom_thumbnail_order(
  p_order_id UUID,
  p_result_template_id UUID,
  p_admin_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.custom_thumbnail_orders%ROWTYPE;
  v_template public.templates%ROWTYPE;
  v_access public.template_access%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM public.custom_thumbnail_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom thumbnail order % not found', p_order_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'cancelled custom thumbnail order % cannot be completed', p_order_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_order.result_template_id IS NOT NULL
     AND v_order.result_template_id <> p_result_template_id THEN
    RAISE EXCEPTION 'custom thumbnail order % already points to another result template', p_order_id
      USING ERRCODE = 'unique_violation';
  END IF;

  SELECT *
  INTO v_template
  FROM public.templates
  WHERE id = p_result_template_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'result template % not found', p_result_template_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_template.template_engine <> 'studio'
     OR v_template.template_kind <> 'thumbnail'
     OR v_template.is_public
     OR v_template.is_shop_visible
     OR v_template.status <> 'published' THEN
    RAISE EXCEPTION 'result template % must be a private published Studio thumbnail', p_result_template_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.template_studio_documents
    WHERE template_id = p_result_template_id
  ) THEN
    RAISE EXCEPTION 'result template % has no published Studio document', p_result_template_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.template_access
    WHERE template_id = p_result_template_id
      AND user_id <> v_order.user_id
  ) THEN
    RAISE EXCEPTION 'result template % is already assigned to another customer', p_result_template_id
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.template_access (
    template_id,
    user_id,
    access_level,
    granted_by,
    template_plan_id
  )
  VALUES (
    p_result_template_id,
    v_order.user_id,
    'write',
    p_admin_id,
    NULL
  )
  ON CONFLICT (template_id, user_id) DO UPDATE
    SET access_level = 'write',
        granted_by = EXCLUDED.granted_by,
        granted_at = now(),
        template_plan_id = NULL
  RETURNING * INTO v_access;

  UPDATE public.custom_thumbnail_orders
  SET result_template_id = p_result_template_id,
      status = 'completed',
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'access', to_jsonb(v_access)
  );
END;
$$;

COMMENT ON FUNCTION public.complete_custom_thumbnail_order(UUID, UUID, BIGINT)
IS 'Atomically validates and assigns a private published Studio thumbnail, grants customer write access, and completes the order idempotently.';

REVOKE EXECUTE ON FUNCTION public.complete_custom_thumbnail_order(UUID, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_custom_thumbnail_order(UUID, UUID, BIGINT)
  TO service_role;
