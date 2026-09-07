-- Draft saves must compare the revision they were based on while holding the
-- canonical template row lock. This prevents an older request from silently
-- overwriting a newer draft after two tabs or workers race.

CREATE OR REPLACE FUNCTION public.save_template_studio_draft(
  p_template_id UUID,
  p_user_id BIGINT,
  p_document_version INTEGER,
  p_document JSONB,
  p_runtime_values JSONB,
  p_base_revision_no INTEGER,
  p_is_autosave BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  current_revision_no INTEGER;
  saved_draft public.template_studio_document_drafts%ROWTYPE;
BEGIN
  IF p_document_version IS NULL OR p_document_version <= 0 THEN
    RAISE EXCEPTION 'document_version must be positive';
  END IF;

  IF p_document IS NULL OR p_document->>'schema' <> 'studio_template_document' THEN
    RAISE EXCEPTION 'document must be a Template Studio document';
  END IF;

  PERFORM 1
  FROM public.templates
  WHERE id = p_template_id
    AND template_engine = 'studio'
    AND status <> 'archived'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template Studio template % does not exist', p_template_id;
  END IF;

  SELECT COALESCE(MAX(revision_no), 0)
  INTO current_revision_no
  FROM public.template_studio_document_revisions
  WHERE template_id = p_template_id;

  IF COALESCE(p_base_revision_no, 0) <> current_revision_no THEN
    RAISE EXCEPTION 'Template Studio draft revision conflict: expected %, current %',
      COALESCE(p_base_revision_no, 0),
      current_revision_no;
  END IF;

  INSERT INTO public.template_studio_document_drafts (
    template_id,
    user_id,
    document_version,
    document,
    runtime_values,
    base_revision_no,
    is_autosave
  )
  VALUES (
    p_template_id,
    p_user_id,
    p_document_version,
    p_document,
    COALESCE(p_runtime_values, '{}'::jsonb),
    p_base_revision_no,
    COALESCE(p_is_autosave, true)
  )
  ON CONFLICT (template_id, user_id)
  DO UPDATE SET
    document_version = EXCLUDED.document_version,
    document = EXCLUDED.document,
    runtime_values = EXCLUDED.runtime_values,
    base_revision_no = EXCLUDED.base_revision_no,
    is_autosave = EXCLUDED.is_autosave
  RETURNING * INTO saved_draft;

  RETURN jsonb_build_object(
    'id', saved_draft.id,
    'template_id', saved_draft.template_id,
    'user_id', saved_draft.user_id,
    'document_version', saved_draft.document_version,
    'document', saved_draft.document,
    'runtime_values', saved_draft.runtime_values,
    'base_revision_no', saved_draft.base_revision_no,
    'is_autosave', saved_draft.is_autosave,
    'created_at', saved_draft.created_at,
    'updated_at', saved_draft.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.save_template_studio_draft(
  UUID,
  BIGINT,
  INTEGER,
  JSONB,
  JSONB,
  INTEGER,
  BOOLEAN
) IS 'Atomically saves a Template Studio draft only when its published revision base is current.';

REVOKE ALL ON FUNCTION public.save_template_studio_draft(
  UUID,
  BIGINT,
  INTEGER,
  JSONB,
  JSONB,
  INTEGER,
  BOOLEAN
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_template_studio_draft(
  UUID,
  BIGINT,
  INTEGER,
  JSONB,
  JSONB,
  INTEGER,
  BOOLEAN
) TO service_role;
