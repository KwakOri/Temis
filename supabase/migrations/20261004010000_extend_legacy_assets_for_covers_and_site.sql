BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Existing parent catalogs and existing runtime bindings remain unchanged.
ALTER TABLE public.legacy_template_asset_sets
  ADD COLUMN purpose text NOT NULL DEFAULT 'runtime' CHECK (purpose IN ('runtime', 'cover', 'site')),
  ADD COLUMN site_key text CHECK (site_key = 'homepage'),
  DROP CONSTRAINT legacy_template_asset_sets_template_id_key,
  DROP CONSTRAINT legacy_template_asset_sets_team_template_id_key,
  DROP CONSTRAINT legacy_template_asset_sets_thumbnail_id_key,
  DROP CONSTRAINT legacy_template_asset_sets_check,
  ADD CONSTRAINT legacy_assets_owner_check CHECK (
    num_nonnulls(template_id, team_template_id, thumbnail_id, site_key) = 1
    AND ((purpose = 'site') = (site_key IS NOT NULL))
  ),
  ADD UNIQUE (template_id, purpose),
  ADD UNIQUE (team_template_id, purpose),
  ADD UNIQUE (thumbnail_id, purpose),
  ADD UNIQUE (site_key, purpose);

-- Trusted repository SVG seed only; browser uploads still reject SVG.
ALTER TABLE public.legacy_template_asset_versions
  DROP CONSTRAINT legacy_template_asset_versions_mime_type_check,
  ADD CONSTRAINT legacy_template_asset_versions_mime_type_check CHECK (
    mime_type IN ('image/png','image/jpeg','image/webp','image/gif','image/avif','image/svg+xml')
  );
COMMIT;
