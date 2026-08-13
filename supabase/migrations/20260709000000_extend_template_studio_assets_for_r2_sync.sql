ALTER TABLE public.template_studio_assets
  ADD COLUMN IF NOT EXISTS storage_provider TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_template_studio_assets_template_content_hash
  ON public.template_studio_assets(template_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_template_studio_assets_storage_provider
  ON public.template_studio_assets(storage_provider);

COMMENT ON COLUMN public.template_studio_assets.storage_provider IS
  'Canonical object storage provider for Template Studio assets. New assets use r2.';

COMMENT ON COLUMN public.template_studio_assets.storage_path IS
  'Canonical object key/path within the configured storage provider.';

COMMENT ON COLUMN public.template_studio_assets.public_url IS
  'Publicly resolvable URL for the canonical Template Studio asset.';

COMMENT ON COLUMN public.template_studio_assets.content_hash IS
  'SHA-256 hex digest of the canonical asset bytes.';

COMMENT ON COLUMN public.template_studio_assets.last_synced_at IS
  'Timestamp when the local Template Studio asset was last synced to canonical storage.';
