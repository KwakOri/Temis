-- Make public.templates the canonical parent of Template Studio persistence data.
-- Existing Template Studio rows are disposable test data and are intentionally cleared.

TRUNCATE TABLE
  public.template_studio_documents,
  public.template_studio_document_revisions,
  public.template_studio_document_drafts,
  public.template_studio_assets;

ALTER TABLE public.template_studio_documents
  DROP CONSTRAINT IF EXISTS template_studio_documents_template_id_fkey;

ALTER TABLE public.template_studio_document_revisions
  DROP CONSTRAINT IF EXISTS template_studio_document_revisions_template_id_fkey;

ALTER TABLE public.template_studio_document_drafts
  DROP CONSTRAINT IF EXISTS template_studio_document_drafts_template_id_fkey;

ALTER TABLE public.template_studio_assets
  DROP CONSTRAINT IF EXISTS template_studio_assets_template_id_fkey;

ALTER TABLE public.template_studio_documents
  ADD CONSTRAINT template_studio_documents_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.templates(id)
  ON DELETE CASCADE;

ALTER TABLE public.template_studio_document_revisions
  ADD CONSTRAINT template_studio_document_revisions_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.templates(id)
  ON DELETE CASCADE;

ALTER TABLE public.template_studio_document_drafts
  ADD CONSTRAINT template_studio_document_drafts_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.templates(id)
  ON DELETE CASCADE;

ALTER TABLE public.template_studio_assets
  ADD CONSTRAINT template_studio_assets_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.templates(id)
  ON DELETE CASCADE;

DROP TABLE public.template_studio_templates;

COMMENT ON TABLE public.template_studio_documents IS
  'Current published Template Studio document body and preview runtime values. Parent metadata lives in public.templates.';

COMMENT ON TABLE public.template_studio_document_revisions IS
  'Immutable Template Studio publish/import revision history. Parent metadata lives in public.templates.';

COMMENT ON TABLE public.template_studio_document_drafts IS
  'Admin-authored Template Studio draft/autosave documents. Parent metadata lives in public.templates.';

COMMENT ON TABLE public.template_studio_assets IS
  'Template Studio asset registry. Parent metadata lives in public.templates and asset_id matches document.assets ids.';

CREATE OR REPLACE FUNCTION public.publish_template_studio_document(
  p_template_id UUID,
  p_document_version INTEGER,
  p_document JSONB,
  p_runtime_values JSONB,
  p_created_by BIGINT DEFAULT NULL,
  p_source TEXT DEFAULT 'publish'
)
RETURNS INTEGER AS $$
DECLARE
  next_revision_no INTEGER;
BEGIN
  IF p_document_version IS NULL OR p_document_version <= 0 THEN
    RAISE EXCEPTION 'document_version must be positive';
  END IF;

  IF p_document IS NULL OR p_document->>'schema' <> 'studio_template_document' THEN
    RAISE EXCEPTION 'document must be a Template Studio document';
  END IF;

  IF p_source NOT IN ('publish', 'import', 'backfill', 'system') THEN
    RAISE EXCEPTION 'invalid Template Studio revision source: %', p_source;
  END IF;

  PERFORM 1
  FROM public.templates
  WHERE id = p_template_id
    AND template_engine = 'studio'
    AND status <> 'archived'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publishable Template Studio template % does not exist', p_template_id;
  END IF;

  SELECT COALESCE(MAX(revision_no), 0) + 1
  INTO next_revision_no
  FROM public.template_studio_document_revisions
  WHERE template_id = p_template_id;

  INSERT INTO public.template_studio_document_revisions (
    template_id,
    revision_no,
    document_version,
    document,
    runtime_values,
    source,
    created_by
  )
  VALUES (
    p_template_id,
    next_revision_no,
    p_document_version,
    p_document,
    COALESCE(p_runtime_values, '{}'::jsonb),
    p_source,
    p_created_by
  );

  INSERT INTO public.template_studio_documents (
    template_id,
    document_version,
    document,
    runtime_values,
    published_revision_no
  )
  VALUES (
    p_template_id,
    p_document_version,
    p_document,
    COALESCE(p_runtime_values, '{}'::jsonb),
    next_revision_no
  )
  ON CONFLICT (template_id)
  DO UPDATE SET
    document_version = EXCLUDED.document_version,
    document = EXCLUDED.document,
    runtime_values = EXCLUDED.runtime_values,
    published_revision_no = EXCLUDED.published_revision_no;

  UPDATE public.templates
  SET status = 'published'
  WHERE id = p_template_id;

  RETURN next_revision_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.publish_template_studio_document(
  UUID,
  INTEGER,
  JSONB,
  JSONB,
  BIGINT,
  TEXT
) IS 'Atomically publishes a Studio-engine template stored under public.templates.';

