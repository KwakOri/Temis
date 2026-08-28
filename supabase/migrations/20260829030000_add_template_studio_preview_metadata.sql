-- Persist the latest rendered preview for Studio templates without changing the
-- meaning of templates.thumbnail_url (the manually managed catalog cover).

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS studio_preview_url TEXT,
  ADD COLUMN IF NOT EXISTS studio_preview_file_key TEXT,
  ADD COLUMN IF NOT EXISTS studio_preview_revision_no INTEGER,
  ADD COLUMN IF NOT EXISTS studio_preview_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS studio_preview_byte_size BIGINT,
  ADD COLUMN IF NOT EXISTS studio_preview_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.templates'::regclass
      AND conname = 'templates_studio_preview_revision_no_check'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_studio_preview_revision_no_check
      CHECK (
        studio_preview_revision_no IS NULL
        OR studio_preview_revision_no > 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.templates'::regclass
      AND conname = 'templates_studio_preview_byte_size_check'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_studio_preview_byte_size_check
      CHECK (
        studio_preview_byte_size IS NULL
        OR studio_preview_byte_size >= 0
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.templates.studio_preview_url IS
  'Latest automatically rendered preview URL for a published Studio template.';
COMMENT ON COLUMN public.templates.studio_preview_file_key IS
  'R2 object key for the latest automatically rendered Studio preview.';
COMMENT ON COLUMN public.templates.studio_preview_revision_no IS
  'Template Studio published revision represented by studio_preview_url.';
COMMENT ON COLUMN public.templates.studio_preview_mime_type IS
  'MIME type of the latest automatically rendered Studio preview.';
COMMENT ON COLUMN public.templates.studio_preview_byte_size IS
  'Byte size of the latest automatically rendered Studio preview.';
COMMENT ON COLUMN public.templates.studio_preview_updated_at IS
  'Timestamp when the latest automatically rendered Studio preview was stored.';

-- Store preview metadata only for the currently published revision. Locking the
-- template row first matches publish_template_studio_document() and prevents a
-- stale preview upload from winning a concurrent publish race.
CREATE OR REPLACE FUNCTION public.store_template_studio_preview(
  p_template_id UUID,
  p_revision_no INTEGER,
  p_preview_url TEXT,
  p_file_key TEXT,
  p_mime_type TEXT,
  p_byte_size BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_template public.templates%ROWTYPE;
  v_published_revision_no INTEGER;
BEGIN
  IF p_revision_no IS NULL OR p_revision_no <= 0 THEN
    RAISE EXCEPTION 'preview revision must be positive';
  END IF;

  IF NULLIF(trim(p_preview_url), '') IS NULL
     OR NULLIF(trim(p_file_key), '') IS NULL
     OR NULLIF(trim(p_mime_type), '') IS NULL THEN
    RAISE EXCEPTION 'preview metadata is incomplete';
  END IF;

  IF lower(trim(p_mime_type)) <> 'image/png' THEN
    RAISE EXCEPTION 'preview mime type must be image/png';
  END IF;

  IF p_byte_size IS NULL OR p_byte_size < 0 THEN
    RAISE EXCEPTION 'preview byte size must be non-negative';
  END IF;

  SELECT *
  INTO v_template
  FROM public.templates
  WHERE id = p_template_id
    AND template_engine = 'studio'
    AND template_kind = 'thumbnail'
    AND status = 'published'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'published Studio thumbnail template % not found', p_template_id
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT published_revision_no
  INTO v_published_revision_no
  FROM public.template_studio_documents
  WHERE template_id = p_template_id;

  IF v_published_revision_no IS DISTINCT FROM p_revision_no THEN
    RAISE EXCEPTION
      'preview revision % is stale for template % (published revision: %)',
      p_revision_no,
      p_template_id,
      COALESCE(v_published_revision_no::TEXT, 'null')
      USING ERRCODE = 'serialization_failure';
  END IF;

  UPDATE public.templates
  SET
    studio_preview_url = trim(p_preview_url),
    studio_preview_file_key = trim(p_file_key),
    studio_preview_revision_no = p_revision_no,
    studio_preview_mime_type = trim(p_mime_type),
    studio_preview_byte_size = p_byte_size,
    studio_preview_updated_at = timezone('utc'::text, now())
  WHERE id = p_template_id;

  RETURN jsonb_build_object(
    'template_id', v_template.id,
    'revision_no', p_revision_no,
    'preview_url', trim(p_preview_url),
    'file_key', trim(p_file_key),
    'mime_type', trim(p_mime_type),
    'byte_size', p_byte_size,
    'updated_at', timezone('utc'::text, now())
  );
END;
$$;

COMMENT ON FUNCTION public.store_template_studio_preview(
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  BIGINT
) IS 'Stores the latest rendered preview only when it matches the current published thumbnail revision.';

REVOKE ALL ON FUNCTION public.store_template_studio_preview(
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  BIGINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_template_studio_preview(
  UUID,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  BIGINT
) TO service_role;
