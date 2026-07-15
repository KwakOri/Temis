-- Step 6: purchase/access reconciliation.
-- 1) Deduplicate template_access rows that share (template_id, user_id),
--    keeping the earliest grant and dropping later duplicates.
-- 2) Enforce one access row per (template_id, user_id) going forward.
-- 3) Add an atomic RPC so purchase approval upserts the access row and
--    marks the purchase request completed in a single transaction,
--    instead of two separate client-side writes.

DELETE FROM public.template_access ta
USING public.template_access dup
WHERE ta.template_id = dup.template_id
  AND ta.user_id = dup.user_id
  AND (
    ta.granted_at > dup.granted_at
    OR (ta.granted_at = dup.granted_at AND ta.id > dup.id)
  );

ALTER TABLE public.template_access
  ADD CONSTRAINT template_access_template_id_user_id_key UNIQUE (template_id, user_id);

CREATE OR REPLACE FUNCTION public.approve_template_purchase_request(
  p_request_id UUID,
  p_admin_id BIGINT,
  p_plan_id UUID DEFAULT NULL
) RETURNS public.template_access
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.template_purchase_requests%ROWTYPE;
  v_access public.template_access%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.template_purchase_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase request % not found', p_request_id;
  END IF;

  INSERT INTO public.template_access (template_id, user_id, access_level, granted_by, template_plan_id)
  VALUES (
    v_request.template_id,
    v_request.user_id,
    'write',
    p_admin_id,
    COALESCE(p_plan_id, v_request.plan_id)
  )
  ON CONFLICT (template_id, user_id) DO UPDATE
    SET access_level = 'write',
        granted_by = EXCLUDED.granted_by,
        granted_at = now(),
        template_plan_id = COALESCE(EXCLUDED.template_plan_id, public.template_access.template_plan_id)
  RETURNING * INTO v_access;

  UPDATE public.template_purchase_requests
  SET status = 'completed', updated_at = now()
  WHERE id = p_request_id;

  RETURN v_access;
END;
$$;

COMMENT ON FUNCTION public.approve_template_purchase_request(UUID, BIGINT, UUID)
IS 'Idempotently grants/refreshes template_access and marks the purchase request completed in one transaction.';

GRANT EXECUTE ON FUNCTION public.approve_template_purchase_request(UUID, BIGINT, UUID) TO authenticated;
