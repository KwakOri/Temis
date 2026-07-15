-- Step 9: stop relying on RLS as the permission boundary for sensitive
-- template access/purchase/Studio tables. All legitimate access to these
-- tables now goes through server API routes using the service-role client
-- (supabaseAdminServer), which bypasses table grants entirely. Revoking
-- anon/authenticated here means a leaked/valid anon key can no longer read
-- or write these rows directly over PostgREST.
--
-- Prerequisite (already true as of this migration):
-- - src/lib/templates.ts (TemplateService/TemplateAccessService) uses
--   supabaseAdminServer, not the anon-key browser client.
-- - AdminPurchaseService and ShopService.getUserTemplateAccess call server
--   API routes instead of querying template_purchase_requests/template_access
--   directly from the browser.
-- - templateStudioPersistenceService.ts already used supabaseAdminServer for
--   every template_studio_* table.

REVOKE ALL ON TABLE public.template_access FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_purchase_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_studio_documents FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_studio_document_revisions FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_studio_document_drafts FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_studio_assets FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_studio_user_states FROM anon, authenticated;

-- Postgres grants EXECUTE to the PUBLIC pseudo-role by default at function
-- creation time, which anon/authenticated inherit regardless of any explicit
-- per-role grant/revoke. Both must be revoked from PUBLIC too, or anon can
-- still call these through that default grant.
REVOKE EXECUTE ON FUNCTION public.approve_template_purchase_request(UUID, BIGINT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_template_access(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_template_studio_document(
  UUID, INTEGER, JSONB, JSONB, BIGINT, TEXT
) FROM PUBLIC, anon, authenticated;
