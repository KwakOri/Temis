-- Template Studio Phase 6: persist the document domain separately from the
-- rendering engine. Existing Studio rows were timetable documents before the
-- thumbnail branch existed, so that historical classification is explicit.

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS template_kind TEXT;

UPDATE public.templates
SET template_kind = 'timetable'
WHERE template_engine = 'studio'
  AND template_kind IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.templates'::regclass
      AND conname = 'templates_template_kind_check'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_template_kind_check
      CHECK (
        (
          template_engine = 'studio'
          AND template_kind IN ('timetable', 'thumbnail')
        )
        OR (template_engine = 'legacy' AND template_kind IS NULL)
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_templates_engine_kind_status_updated_at
  ON public.templates(template_engine, template_kind, status, updated_at DESC);

COMMENT ON COLUMN public.templates.template_kind IS
  'Studio document domain: timetable or thumbnail. Legacy templates remain null.';

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
  stored_template_kind TEXT;
  document_kind TEXT;
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

  SELECT template_kind
  INTO stored_template_kind
  FROM public.templates
  WHERE id = p_template_id
    AND template_engine = 'studio'
    AND status <> 'archived'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publishable Template Studio template % does not exist', p_template_id;
  END IF;

  document_kind := p_document->'metadata'->>'kind';
  IF stored_template_kind IS NOT NULL
     AND document_kind IS DISTINCT FROM stored_template_kind THEN
    RAISE EXCEPTION 'Template Studio document kind % does not match stored kind %',
      document_kind, stored_template_kind;
  END IF;

  IF stored_template_kind = 'thumbnail'
     AND (p_document->'domains') ? 'timetable' THEN
    RAISE EXCEPTION 'Thumbnail Template Studio documents cannot contain a timetable domain';
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

-- Keep the existing Template Hub view column order stable and append the new
-- catalog dimension at the end so CREATE OR REPLACE remains compatible.
CREATE OR REPLACE VIEW public.template_hub_readiness AS
SELECT
  t.id,
  t.name,
  t.description,
  t.template_engine,
  t.status,
  t.is_public,
  t.created_at,
  t.updated_at,
  st.id AS shop_template_id,
  COALESCE(st.is_shop_visible, false) AS is_shop_visible,
  (st.id IS NOT NULL) AS has_product,
  (
    t.status = 'published'
    AND t.is_public
    AND st.id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.template_plans tp
      WHERE tp.shop_template_id = st.id
        AND tp.price IS NOT NULL
        AND tp.price >= 0
        AND tp.plan = ANY (ARRAY['lite', 'pro'])
    )
    AND EXISTS (
      SELECT 1 FROM public.template_artists ta WHERE ta.template_id = t.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.template_artists ta
      WHERE ta.template_id = t.id
        AND NOT EXISTS (
          SELECT 1 FROM public.artist_royalty_rules arr
          WHERE arr.artist_id = ta.artist_id
            AND (arr.template_id = t.id OR arr.template_id IS NULL)
        )
    )
  ) AS is_ready,
  t.template_kind
FROM public.templates t
LEFT JOIN public.shop_templates st ON st.template_id = t.id;

CREATE OR REPLACE VIEW public.template_hub_list AS
SELECT
  r.id,
  r.name,
  r.description,
  r.template_engine,
  r.status,
  r.is_public,
  r.created_at,
  r.updated_at,
  r.shop_template_id,
  r.is_shop_visible,
  r.has_product,
  r.is_ready,
  CASE
    WHEN r.is_shop_visible THEN 'selling'
    WHEN r.is_ready THEN 'ready'
    WHEN NOT r.has_product THEN 'unconfigured'
    ELSE 'blocked'
  END AS sale_status,
  r.template_kind
FROM public.template_hub_readiness r;
