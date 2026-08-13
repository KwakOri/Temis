-- Stop treating templates.is_public as a usage entitlement.
-- is_public is a product classification (general sale vs. private/custom) only.
-- Actual usage access is decided by template_access grants (and, at the
-- application layer, template_artists ownership). Apply locally first;
-- remote application is intentionally deferred.

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

  -- A template must be published before any grant can be exercised.
  -- is_public is a product/sales classification, not an entitlement, so it
  -- is intentionally not checked here.
  IF NOT EXISTS (
    SELECT 1
    FROM public.templates t
    WHERE t.id = p_template_id
      AND t.status = 'published'
  ) THEN
    RETURN false;
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
IS 'Template access check using status=published + template_access grants. is_public no longer bypasses entitlement.';
