-- Removes the transitional v2-template schema.
--
-- v2_templates and its child tables were a pre-Studio prototype editor,
-- never linked to templates.id (no FK, no shop/access/purchase reference),
-- and hold zero rows locally and on the remote replica as of this
-- migration. The application code paths that used these tables
-- (/v2-template, /api/v2/*, /api/admin/v2/*, /admin/template-editor) were
-- removed in the same change. See
-- docs/template-system-integration/13-v2-template-legacy-removal.md.

DROP TABLE IF EXISTS public.v2_template_render_config_drafts CASCADE;
DROP TABLE IF EXISTS public.v2_template_render_config_revisions CASCADE;
DROP TABLE IF EXISTS public.v2_template_render_configs CASCADE;
DROP TABLE IF EXISTS public.v2_templates CASCADE;

DROP FUNCTION IF EXISTS public.update_v2_template_render_config_drafts_updated_at();
DROP FUNCTION IF EXISTS public.update_v2_template_render_configs_updated_at();
DROP FUNCTION IF EXISTS public.update_v2_templates_updated_at();
