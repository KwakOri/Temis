-- 11단계 검토(P1): approve_template_purchase_request가 호출자가 넘긴
-- p_plan_id를 그대로 template_access.template_plan_id에 기록했다. API
-- 레이어(POST /api/admin/purchase-requests/{id}/approve)는 이미 클라이언트의
-- planId를 더 이상 받지 않도록 고쳤지만, RPC 자체도 방어적으로 요청에 이미
-- 기록된 plan과 다른 값이 들어오면 거부하도록 한다.

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

  IF p_plan_id IS NOT NULL
     AND v_request.plan_id IS NOT NULL
     AND p_plan_id <> v_request.plan_id THEN
    RAISE EXCEPTION
      'plan % does not match purchase request %''s own plan %',
      p_plan_id, p_request_id, v_request.plan_id;
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
IS 'Idempotently grants/refreshes template_access and marks the purchase request completed in one transaction. Rejects a plan override that does not match the request''s own plan.';
