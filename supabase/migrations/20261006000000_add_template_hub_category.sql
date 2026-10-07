-- Classify the sale catalog before filtering, counting and pagination.
-- Published documents determine the selling format; unpublished templates use
-- their latest draft. Keep every existing view column in its original position.
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
  r.template_kind,
  CASE
    WHEN r.template_kind = 'thumbnail' THEN 'thumbnail'
    WHEN r.template_engine = 'studio' AND COALESCE(
      (
        SELECT (d.document #>> '{domains,timetable,team,layout}') IS NOT NULL
        FROM public.template_studio_documents d
        WHERE d.template_id = r.id
      ),
      (
        SELECT (d.document #>> '{domains,timetable,team,layout}') IS NOT NULL
        FROM public.template_studio_document_drafts d
        WHERE d.template_id = r.id
        ORDER BY d.updated_at DESC, d.id DESC
        LIMIT 1
      ),
      false
    ) THEN 'team-timetable'
    ELSE 'timetable'
  END AS template_category
FROM public.template_hub_readiness r;

REVOKE ALL ON public.template_hub_list FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.template_hub_list TO service_role;

COMMENT ON VIEW public.template_hub_list IS
  'Admin sale catalog with readiness and timetable/thumbnail/team-timetable filters.';
