-- Fix broken column reference in has_template_access.
-- templates.created_by no longer exists, so access checks should rely on:
-- 1) template public visibility
-- 2) explicit grants in template_access
CREATE OR REPLACE FUNCTION public.has_template_access(
  p_template_id UUID,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id BIGINT;
BEGIN
  -- Keep function signature backward-compatible.
  -- p_user_id is retained for compatibility with existing callers/types.
  IF p_user_id IS NOT NULL THEN
    -- no-op
    NULL;
  END IF;

  -- Public templates are always readable.
  IF EXISTS (
    SELECT 1
    FROM public.templates t
    WHERE t.id = p_template_id
      AND t.is_public = true
  ) THEN
    RETURN true;
  END IF;

  -- Resolve integer user id from JWT claims (legacy app format).
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::json ->> 'user_id')::BIGINT;
  EXCEPTION
    WHEN OTHERS THEN
      v_user_id := NULL;
  END;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Explicit template grant check.
  IF EXISTS (
    SELECT 1
    FROM public.template_access ta
    WHERE ta.template_id = p_template_id
      AND ta.user_id = v_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.has_template_access(UUID, UUID)
IS 'Template access check using public visibility + template_access grants.';

GRANT ALL ON FUNCTION public.has_template_access(UUID, UUID) TO anon;
GRANT ALL ON FUNCTION public.has_template_access(UUID, UUID) TO authenticated;
GRANT ALL ON FUNCTION public.has_template_access(UUID, UUID) TO service_role;
