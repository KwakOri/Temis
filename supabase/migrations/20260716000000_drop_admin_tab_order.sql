-- Removes the DB-driven admin tab ordering/visibility feature.
--
-- Tab order and visibility are now a fixed array in
-- src/components/admin/AdminDashboardShell.tsx — editing the order just
-- means editing that array, no DB sync step. The API route that served this
-- table (src/app/api/admin/tab-order/route.ts, now deleted) used the anon
-- Supabase client with no auth check at all for both GET and PUT, and the
-- table was GRANT ALL to anon/authenticated, so this also closes an
-- unauthenticated write path.

DROP TABLE IF EXISTS public.admin_tab_order CASCADE;
