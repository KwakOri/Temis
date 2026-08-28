-- Decouple the workflow status of a custom thumbnail order from the
-- template access that an administrator grants while completing the work.
-- Status changes must remain reversible without implicitly revoking access.

ALTER TABLE public.custom_thumbnail_orders
  DROP CONSTRAINT IF EXISTS custom_thumbnail_orders_completed_consistency_check;

CREATE TABLE IF NOT EXISTS public.custom_thumbnail_order_template_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL
    REFERENCES public.custom_thumbnail_orders(id) ON DELETE CASCADE,
  template_id UUID NOT NULL
    REFERENCES public.templates(id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL
    REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  granted_by BIGINT REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_by BIGINT REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT custom_thumbnail_order_template_grants_revocation_check
    CHECK (
      (revoked_at IS NULL AND revoked_by IS NULL)
      OR (revoked_at IS NOT NULL)
    )
);

COMMENT ON TABLE public.custom_thumbnail_order_template_grants IS
  'Per-order audit trail for thumbnail template access grants. Workflow status changes do not revoke active grants.';
COMMENT ON COLUMN public.custom_thumbnail_order_template_grants.template_id IS
  'Template granted for this order. Multiple templates may be granted to one order.';
COMMENT ON COLUMN public.custom_thumbnail_order_template_grants.revoked_at IS
  'Explicit revocation timestamp; status changes never populate this column.';

CREATE UNIQUE INDEX IF NOT EXISTS
  custom_thumbnail_order_template_grants_active_key
  ON public.custom_thumbnail_order_template_grants(order_id, template_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS
  idx_custom_thumbnail_order_template_grants_order
  ON public.custom_thumbnail_order_template_grants(order_id, granted_at DESC);
CREATE INDEX IF NOT EXISTS
  idx_custom_thumbnail_order_template_grants_user_template
  ON public.custom_thumbnail_order_template_grants(user_id, template_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.custom_thumbnail_order_template_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.custom_thumbnail_order_template_grants FROM anon, authenticated;
GRANT ALL ON TABLE public.custom_thumbnail_order_template_grants TO service_role;

-- Backfill only historical completions for which the effective access row is
-- present. A completed status without access remains an explicit
-- "completed / access not granted" state for an operator to resolve.
INSERT INTO public.custom_thumbnail_order_template_grants (
  order_id,
  template_id,
  user_id,
  granted_by,
  granted_at
)
SELECT
  o.id,
  o.result_template_id,
  o.user_id,
  ta.granted_by,
  COALESCE(ta.granted_at, o.completed_at, now())
FROM public.custom_thumbnail_orders o
JOIN public.template_access ta
  ON ta.template_id = o.result_template_id
 AND ta.user_id = o.user_id
WHERE o.status = 'completed'
  AND o.result_template_id IS NOT NULL
ON CONFLICT (order_id, template_id) WHERE revoked_at IS NULL DO NOTHING;

-- Completion remains the operation that grants access and moves the order to
-- completed. It no longer rejects a template because another customer has it,
-- and it can be repeated for an additional template on the same order.
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
  v_grant public.custom_thumbnail_order_template_grants%ROWTYPE;
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

  SELECT *
  INTO v_template
  FROM public.templates
  WHERE id = p_result_template_id
  FOR UPDATE;

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
      AND published_revision_no IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'result template % has no published Studio document', p_result_template_id
      USING ERRCODE = 'check_violation';
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
        -- A purchase-derived entitlement is shared with this order grant.
        -- Preserve its plan and provenance instead of turning it into an
        -- order-only row that a later revoke could delete.
        granted_by = CASE
          WHEN public.template_access.template_plan_id IS NULL
            THEN EXCLUDED.granted_by
          ELSE public.template_access.granted_by
        END,
        granted_at = CASE
          WHEN public.template_access.template_plan_id IS NULL
            THEN now()
          ELSE public.template_access.granted_at
        END,
        template_plan_id = public.template_access.template_plan_id
  RETURNING * INTO v_access;

  INSERT INTO public.custom_thumbnail_order_template_grants (
    order_id,
    template_id,
    user_id,
    granted_by
  )
  VALUES (
    v_order.id,
    p_result_template_id,
    v_order.user_id,
    p_admin_id
  )
  ON CONFLICT (order_id, template_id) WHERE revoked_at IS NULL DO UPDATE
    SET granted_by = EXCLUDED.granted_by
  RETURNING * INTO v_grant;

  UPDATE public.custom_thumbnail_orders
  SET result_template_id = COALESCE(result_template_id, p_result_template_id),
      status = 'completed',
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'access', to_jsonb(v_access),
    'grant', to_jsonb(v_grant)
  );
END;
$$;

COMMENT ON FUNCTION public.complete_custom_thumbnail_order(UUID, UUID, BIGINT)
IS 'Atomically validates and grants a private published Studio thumbnail, records the order grant, and marks the order completed. Multiple customers and multiple templates per order are supported.';

REVOKE EXECUTE ON FUNCTION public.complete_custom_thumbnail_order(UUID, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_custom_thumbnail_order(UUID, UUID, BIGINT)
  TO service_role;

-- Access removal is an explicit operation. It is intentionally not coupled to
-- changing an order status. The shared template_access row is removed only
-- when no other active order grant keeps the same user/template entitlement.
CREATE OR REPLACE FUNCTION public.revoke_custom_thumbnail_order_template_grant(
  p_order_id UUID,
  p_grant_id UUID,
  p_admin_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.custom_thumbnail_orders%ROWTYPE;
  v_grant public.custom_thumbnail_order_template_grants%ROWTYPE;
  v_template public.templates%ROWTYPE;
  v_access_deleted BOOLEAN := false;
BEGIN
  -- Serialize grant/revoke operations for one order first. The template lock
  -- below then serializes access changes shared by different orders.
  SELECT *
  INTO v_order
  FROM public.custom_thumbnail_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom thumbnail order % not found', p_order_id
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT *
  INTO v_grant
  FROM public.custom_thumbnail_order_template_grants
  WHERE id = p_grant_id
    AND order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom thumbnail order template grant % not found for order %', p_grant_id, p_order_id
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT *
  INTO v_template
  FROM public.templates
  WHERE id = v_grant.template_id
  FOR UPDATE;

  IF v_grant.revoked_at IS NULL THEN
    UPDATE public.custom_thumbnail_order_template_grants
    SET revoked_by = p_admin_id,
        revoked_at = now()
    WHERE id = p_grant_id
    RETURNING * INTO v_grant;

    IF NOT EXISTS (
      SELECT 1
      FROM public.custom_thumbnail_order_template_grants
      WHERE template_id = v_grant.template_id
        AND user_id = v_grant.user_id
        AND revoked_at IS NULL
    ) THEN
      DELETE FROM public.template_access
      WHERE template_id = v_grant.template_id
        AND user_id = v_grant.user_id
        -- Do not remove an entitlement that was created by a purchase or
        -- another non-order flow. Only order-owned access is revocable here.
        AND template_plan_id IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.template_purchase_requests tpr
          WHERE tpr.template_id = v_grant.template_id
            AND tpr.user_id = v_grant.user_id
            AND tpr.status = 'completed'
        );
      v_access_deleted := FOUND;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'grant', to_jsonb(v_grant),
    'accessDeleted', v_access_deleted
  );
END;
$$;

COMMENT ON FUNCTION public.revoke_custom_thumbnail_order_template_grant(UUID, UUID, BIGINT)
IS 'Explicitly revokes one thumbnail order grant and removes shared template access only when no other active grant remains.';

REVOKE EXECUTE ON FUNCTION public.revoke_custom_thumbnail_order_template_grant(UUID, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_custom_thumbnail_order_template_grant(UUID, UUID, BIGINT)
  TO service_role;
