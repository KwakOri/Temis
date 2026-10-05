# Team Studio v8 integration

## Scope

- Preserve the completed native v8 editor in commit `451e8627`.
- Merge assets through `3bb0e9cb`; do not merge the independent team editor
  (`b68f6a1c`) or its draft-table migration.
- Use the actual TemplateStudioClient, graph/styles/assets, shared history,
  JSON validation, and existing Studio persistence. No second editor store.
- Add an optional timetable team definition: member slot IDs and repeat layout.
  Names, profile images, and schedules belong to runtime values, not design nodes.
- Repeat shared Component Set designs over member/day instances. Broadcasts
  remain separate entries; offline and missing are distinct states.
- Reuse three legacy-inspired layouts and schedule normalization/order tests.
- Do not change legacy team template routing, operational schedules, or remote DB.

## Verification

TypeScript, lint, native v8 regressions, team graph/render/runtime/JSON checks,
shared persistence mock checks, and desktop/mobile browser interaction and PNG
capture. Production build, remote migrations, and deployment are excluded.

## Product boundary

The first phase is an administrator template designer. The connected runtime
phase below reads existing team schedules without replacing their editing flow.
Team templates use timetable kind with a team domain extension; no new database
template kind or independent draft table is introduced.

## Implementation

- Asset-only merge: `fcb8244a`. The old independent team prototype remains
  available on `codex/team-timetable-editor` as a reference.
- Admin entry: `/admin/team-timetable-studio` opens team template management.
  Creation, editing, and preview use `/admin/team-timetable-studio/create`,
  `/admin/team-timetable-studio/:id/edit`, and `/:id/preview`. Existing
  `/admin/template-studio/:id/edit` links remain supported. Lists distinguish
  personal and team timetables using the saved `domains.timetable.team` layout,
  with the current admin's draft taking precedence over the published document.
- `domains.timetable.team` stores 1-12 stable member slots, layout, gap, order,
  and name/image input references. `runtimeValues.team` stores member details
  and seven-day schedules, with up to 20 broadcasts per member/day.
- `team-timetable.ts` provides native graph defaults, validation, existing
  schedule adaptation, stable time ordering, and repeat geometry.
- `StudioTeamCards` repeats the existing `StudioRenderer` and Component Sets;
  it never writes generated member/day instances to the document graph.
- Shared draft/publish services and JSON remain version 8. Runtime forms
  change schedules without exposing layout or member-slot editing.
- Team-only responsive panels and resize fitting reuse the shared editor
  shell and viewport. PNG uses the existing image-loading/proxy capture path.

## Checks

- `npx tsc --noEmit --pretty false --incremental false`
- `npm run lint` (passes with existing repository warnings)
- `npm run check:studio:team-v8`: native graph, all layouts, shared renderer,
  store snapshots, JSON round-trip, missing/offline distinction, multiple
  broadcasts, input validation, existing schedule adapter, and actual shared
  draft/publish persistence with an in-memory client. No database access.
- `npm run check:studio:team-v8:browser`: actual protected route and editor,
  shared save/reopen/JSON/undo/redo, desktop/mobile layout, runtime form,
  and 1600 x 1000 PNG pixel inspection with a mocked remote image/proxy.
  Every API request is intercepted; this checks capture behavior, not live R2
  bucket configuration. Screenshots are generated under `output/playwright/`.
- Existing personal v8, graph/storage/presets, runtime form, thumbnail, and
  asset checks are retained. No production build or deployment.

Verified on 2026-10-04: TypeScript, repository lint, focused changed-component
lint, team core and browser checks, personal v8 command/persistence checks,
and graph/read/storage/preset/runtime/thumbnail/asset regressions passed.
The browser run retained 7,045 red remote-image pixels in the exported PNG and
used the shared image proxy once. User runtime status changes preserved both
broadcasts. Initial route-compilation timeouts were resolved by waiting for the
existing development server; it was not restarted or replaced.

## Connected Runtime

- User entry: `/team-time-table/studio`, linked from My Page when the user has
  an active team. Existing Studio template links also open this runtime when
  their published document contains a team domain.
- `GET /api/user/team-studio/options` lists entitled, published Studio team
  templates and active member teams. Role-based administrators can list all.
  Template-access and artist-link grants use the existing tables; publishing
  or marking a template public does not grant ordinary users permission.
- `GET /api/user/team-studio/:id/week` rechecks common template entitlement,
  team membership (or common admin entitlement), active team, published
  revision, and native document validity before reading member schedules.
  Query user IDs come only from that team's membership rows, not the browser.
- Member names and schedules are projected without emails or credential
  fields. Missing/invalid schedules remain missing; offline remains offline.
  Successful options/week responses use `Cache-Control: private, no-store`.
- React Query caches are scoped by the authenticated user ID; account changes
  cannot reuse another user's team catalog or weekly schedules.
- The UI supports team/template/week selection, member-slot mapping,
  session-local profile image URLs, explicit missing/unassigned warnings,
  refresh, and shared PNG export. An unassigned team member blocks download
  rather than silently dropping their schedule. Requested historical weeks
  are preserved by the shared runtime shell.
- Existing user runtime-state GET does not create or reconcile team states;
  PUT rejects team documents with 405. Schedule creation/editing stays in the
  existing individual timetable flow. This runtime never writes schedules,
  per-user Studio state, or team-template associations.
- `check:studio:team-runtime` covers service and actual API handlers with an
  in-memory database, signed fixture authentication, 401/403 gates, 405 writes,
  native rendering, stable mapping and historical weeks.
- `check:studio:team-runtime:browser` uses the real protected route and runtime
  with intercepted APIs, tests week changes, remapping, capacity warnings,
  read-only schedules, desktop/mobile overflow, and remote-image PNG pixels.
  It is not a live bucket CORS or production-data test.

## Boundaries

The initial connected runtime phase required no database migration or
operational DB/R2 mutation. Legacy team routes and associations remain unchanged.
Unassigned runtimes retain session-local member mapping. Profile URLs remain
session-local. Persistent template assignment and member mapping are supported
by the admin settings feature below.
The current users table has no member profile-image field, so this phase does
not invent one or reuse an unrelated artist profile without authorization.

Connected phase verified on 2026-10-04: TypeScript, focused lint, the connected
core/handler and browser checks, team v8 core, personal v8 commands/persistence,
personal timetable runtime/runtime-form and thumbnail editor checks passed.
The connected PNG retained 4,617 red fixture-image pixels and used the shared
proxy once. The database-backed legacy runtime-image cleanup integration check
was not run: this phase intentionally uses no database test environment.

## Persistent team connection (2026-10-05)

- Keep `/admin/teams` as the single place to create teams and add/remove users.
  Team Studio editor Settings adds **팀 연결**: choose an active team, inspect its
  ID and member user IDs, assign slots, select a Monday week, preview schedules,
  save, refresh, or disconnect. The Team Management link opens a separate tab.
- One Studio template connects to one team; a team may use multiple designs.
  `team_studio_connections` references `templates` and `teams`, storing only
  slot-to-user IDs. It does not use the legacy `team_templates` relationship.
  Browser access is revoked and RLS is enabled; authenticated admin APIs use
  the server service client.
- Saving a connection first saves the current design draft, then validates the
  mapping against that saved draft and current team membership. Unknown slots,
  nonmembers, duplicate IDs and inactive teams are rejected. New slots become
  available to users after design publication. Assignment changes take effect
  immediately for the existing published slots.
- Editor reentry loads the saved connection and current week's live schedules.
  Explicit preview uses the currently selected team, mapping and week. Runtime
  values keep schedule previews separate from design nodes and operational
  schedule writes; preview image movement follows user IDs.
- User options expose the connected team for an entitled template only when
  that team is accessible. Week requests resolve/enforce the saved team and
  recheck entitlement and membership. Configured team/slot controls are read
  only; weeks, refresh, image URLs and PNG export remain available. Unassigned
  templates retain the existing manual selection flow.
- Removed team members and missing schedules are shown explicitly. Saved
  mappings are not filled again by array position when membership changes.
  Unassigned current members continue to block runtime PNG export.
- Connection queries include the actor user ID. Save/disconnect update the
  cached assignment and invalidate admin connection/week and user runtime
  queries. No template entitlement is implicitly granted by assignment.
- Migration: `supabase/migrations/20261005000000_create_team_studio_connections.sql`.
  It must be applied to the target DB before connections can be saved. Until
  then settings report a storage-setup error and existing unassigned runtimes
  continue to work. Remote migration application and deployment are excluded.
- Checks: `npm run check:studio:team-connection` tests persistence, disconnect,
  current membership, slot validation, week scoping, missing migration, malformed
  JSON, and the actual 401/403 admin handlers with an in-memory database.
  `npm run check:studio:team-connection:browser` tests actual editor/runtime
  routes with mocked APIs, save/reentry, week change, member reordering, save
  failure, removed members, disconnect and mobile settings.
- Local Docker DB migration `20261005000000` was applied with
  `supabase migration up --local --yes`. Existing data was retained; the app
  was restarted with `npm run dev:local` to use the local API on port 56321.
- `npm run check:studio:team-connection:local` verifies the actual local DB,
  APIs and Chrome without mocked API responses. It uses random local-only
  fixtures and verifies the app can read them before allowing app mutations.
  It covers save/readback, invalid bindings, 401/403, membership/entitlement,
  historical schedules, missing/offline states, real RLS/unique/FK/JSON
  constraints, template/team cascades, editor reload, mobile settings,
  user runtime, PNG download and disconnect. Fixtures are cleaned in `finally`.
  Run only with Docker and the local development server running.

Verified on 2026-10-05: TypeScript, repository lint (existing warnings), focused
lint, connection core/actual admin handlers, connected runtime core, team v8,
connection browser and existing connected-runtime browser checks passed.
The existing runtime still exports remote-image PNGs (4,617 red fixture pixels
and one proxy call). Mobile team settings use a horizontal category menu so
fields retain the available width; other Studio dialogs retain their layout.
The earlier browser checks used mocked APIs. The local DB/API/browser check
also passed against Docker on 2026-10-05, including an actual PNG download.
Final DB verification: migration `20261005000000`, RLS enabled, SELECT denied
to anon/authenticated and allowed to service_role. All fixtures were removed;
existing teams/users remained at 7/424 and the connection table was empty.
No remote DB was changed. Screenshots and PNG are under
`output/playwright/team-studio-connection-local/`.
