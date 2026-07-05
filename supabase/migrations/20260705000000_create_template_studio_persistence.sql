-- Template Studio persistence schema
-- Local-first migration: apply and verify on Docker Supabase before remote use.

CREATE OR REPLACE FUNCTION public.update_template_studio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.template_studio_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_template_studio_templates_status_updated_at
  ON public.template_studio_templates(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_studio_templates_created_by_updated_at
  ON public.template_studio_templates(created_by, updated_at DESC);

COMMENT ON TABLE public.template_studio_templates IS
  'Template Studio template metadata. Separate from legacy and v2 template tables.';

DROP TRIGGER IF EXISTS trigger_template_studio_templates_updated_at
  ON public.template_studio_templates;

CREATE TRIGGER trigger_template_studio_templates_updated_at
  BEFORE UPDATE ON public.template_studio_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_studio_updated_at();

CREATE TABLE IF NOT EXISTS public.template_studio_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.template_studio_templates(id)
    ON DELETE CASCADE,
  document_version INTEGER NOT NULL CHECK (document_version > 0),
  document JSONB NOT NULL CHECK (document->>'schema' = 'studio_template_document'),
  runtime_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_revision_no INTEGER CHECK (
    published_revision_no IS NULL OR published_revision_no > 0
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id)
);

CREATE INDEX IF NOT EXISTS idx_template_studio_documents_template_id
  ON public.template_studio_documents(template_id);

COMMENT ON TABLE public.template_studio_documents IS
  'Current published Template Studio document body and preview runtime values.';

DROP TRIGGER IF EXISTS trigger_template_studio_documents_updated_at
  ON public.template_studio_documents;

CREATE TRIGGER trigger_template_studio_documents_updated_at
  BEFORE UPDATE ON public.template_studio_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_studio_updated_at();

CREATE TABLE IF NOT EXISTS public.template_studio_document_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.template_studio_templates(id)
    ON DELETE CASCADE,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  document_version INTEGER NOT NULL CHECK (document_version > 0),
  document JSONB NOT NULL CHECK (document->>'schema' = 'studio_template_document'),
  runtime_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  source VARCHAR(30) NOT NULL DEFAULT 'publish'
    CHECK (source IN ('publish', 'import', 'backfill', 'system')),
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_template_studio_revisions_template_created_at
  ON public.template_studio_document_revisions(template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_studio_revisions_created_by_created_at
  ON public.template_studio_document_revisions(created_by, created_at DESC);

COMMENT ON TABLE public.template_studio_document_revisions IS
  'Immutable Template Studio publish/import revision history.';

CREATE TABLE IF NOT EXISTS public.template_studio_document_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.template_studio_templates(id)
    ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_version INTEGER NOT NULL CHECK (document_version > 0),
  document JSONB NOT NULL CHECK (document->>'schema' = 'studio_template_document'),
  runtime_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_revision_no INTEGER CHECK (
    base_revision_no IS NULL OR base_revision_no > 0
  ),
  is_autosave BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_studio_drafts_user_updated_at
  ON public.template_studio_document_drafts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_studio_drafts_template_updated_at
  ON public.template_studio_document_drafts(template_id, updated_at DESC);

COMMENT ON TABLE public.template_studio_document_drafts IS
  'User-specific Template Studio draft/autosave documents.';

DROP TRIGGER IF EXISTS trigger_template_studio_document_drafts_updated_at
  ON public.template_studio_document_drafts;

CREATE TRIGGER trigger_template_studio_document_drafts_updated_at
  BEFORE UPDATE ON public.template_studio_document_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_studio_updated_at();

CREATE TABLE IF NOT EXISTS public.template_studio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.template_studio_templates(id)
    ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  byte_size BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id, asset_id),
  UNIQUE(storage_path)
);

CREATE INDEX IF NOT EXISTS idx_template_studio_assets_template_id
  ON public.template_studio_assets(template_id);

CREATE INDEX IF NOT EXISTS idx_template_studio_assets_created_by_created_at
  ON public.template_studio_assets(created_by, created_at DESC);

COMMENT ON TABLE public.template_studio_assets IS
  'Template Studio asset registry. asset_id matches document.assets ids.';

DROP TRIGGER IF EXISTS trigger_template_studio_assets_updated_at
  ON public.template_studio_assets;

CREATE TRIGGER trigger_template_studio_assets_updated_at
  BEFORE UPDATE ON public.template_studio_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_studio_updated_at();

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
  FROM public.template_studio_templates
  WHERE id = p_template_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template Studio template % does not exist', p_template_id;
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

  UPDATE public.template_studio_templates
  SET status = 'published'
  WHERE id = p_template_id AND status <> 'archived';

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
) IS 'Atomically writes a Template Studio revision and current published document.';

ALTER TABLE public.template_studio_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_studio_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_studio_document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_studio_document_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_studio_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'template_studio_templates'
      AND policyname = 'template_studio_templates_admin_all'
  ) THEN
    CREATE POLICY template_studio_templates_admin_all
      ON public.template_studio_templates
      FOR ALL
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'template_studio_documents'
      AND policyname = 'template_studio_documents_admin_all'
  ) THEN
    CREATE POLICY template_studio_documents_admin_all
      ON public.template_studio_documents
      FOR ALL
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'template_studio_document_revisions'
      AND policyname = 'template_studio_revisions_admin_all'
  ) THEN
    CREATE POLICY template_studio_revisions_admin_all
      ON public.template_studio_document_revisions
      FOR ALL
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'template_studio_document_drafts'
      AND policyname = 'template_studio_drafts_admin_all'
  ) THEN
    CREATE POLICY template_studio_drafts_admin_all
      ON public.template_studio_document_drafts
      FOR ALL
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'template_studio_assets'
      AND policyname = 'template_studio_assets_admin_all'
  ) THEN
    CREATE POLICY template_studio_assets_admin_all
      ON public.template_studio_assets
      FOR ALL
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user());
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    VALUES (
      'template-studio-assets',
      'template-studio-assets',
      false,
      10485760,
      ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'template_studio_assets_admin_select'
    ) THEN
      CREATE POLICY template_studio_assets_admin_select
        ON storage.objects
        FOR SELECT
        USING (
          bucket_id = 'template-studio-assets' AND public.is_admin_user()
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'template_studio_assets_admin_insert'
    ) THEN
      CREATE POLICY template_studio_assets_admin_insert
        ON storage.objects
        FOR INSERT
        WITH CHECK (
          bucket_id = 'template-studio-assets' AND public.is_admin_user()
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'template_studio_assets_admin_update'
    ) THEN
      CREATE POLICY template_studio_assets_admin_update
        ON storage.objects
        FOR UPDATE
        USING (
          bucket_id = 'template-studio-assets' AND public.is_admin_user()
        )
        WITH CHECK (
          bucket_id = 'template-studio-assets' AND public.is_admin_user()
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'template_studio_assets_admin_delete'
    ) THEN
      CREATE POLICY template_studio_assets_admin_delete
        ON storage.objects
        FOR DELETE
        USING (
          bucket_id = 'template-studio-assets' AND public.is_admin_user()
        );
    END IF;
  END IF;
END
$$;
