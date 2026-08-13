CREATE TABLE IF NOT EXISTS public.template_studio_preview_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL,
  preview_id TEXT NOT NULL,
  file_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'draft-preview',
  mime_type TEXT NOT NULL,
  byte_size BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now() + interval '24 hours'),
  cleaned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_template_studio_preview_assets_run_id
  ON public.template_studio_preview_assets(run_id);

CREATE INDEX IF NOT EXISTS idx_template_studio_preview_assets_preview_id
  ON public.template_studio_preview_assets(preview_id);

CREATE INDEX IF NOT EXISTS idx_template_studio_preview_assets_expires_at
  ON public.template_studio_preview_assets(expires_at);

COMMENT ON TABLE public.template_studio_preview_assets IS
  'Temporary R2 asset registry for Template Studio runtime previews.';

ALTER TABLE public.template_studio_preview_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'template_studio_preview_assets'
      AND policyname = 'template_studio_preview_assets_admin_all'
  ) THEN
    CREATE POLICY template_studio_preview_assets_admin_all
      ON public.template_studio_preview_assets
      FOR ALL
      USING (public.is_admin_user())
      WITH CHECK (public.is_admin_user());
  END IF;
END
$$;
