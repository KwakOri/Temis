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
- Admin entry: `/admin/team-timetable-studio`. Saved templates reopen through
  the existing `/admin/template-studio/:id/edit` and preview routes.
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

No database migration, operational DB/R2 mutation, or deployment is required
or performed. Legacy team routes and associations remain unchanged. Member
mapping and profile URLs are intentionally session-local; team-wide persistent
template assignment and mapping would be a separate data-management feature.
The current users table has no member profile-image field, so this phase does
not invent one or reuse an unrelated artist profile without authorization.

Connected phase verified on 2026-10-04: TypeScript, focused lint, the connected
core/handler and browser checks, team v8 core, personal v8 commands/persistence,
personal timetable runtime/runtime-form and thumbnail editor checks passed.
The connected PNG retained 4,617 red fixture-image pixels and used the shared
proxy once. The database-backed legacy runtime-image cleanup integration check
was not run: this phase intentionally uses no database test environment.
