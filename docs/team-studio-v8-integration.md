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

This is an administrator template designer. Binding a real team to a published
Studio template and exposing it in the existing team scheduler is separate work.
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

## Remaining Integration

The schedule adapter is implemented and tested but deliberately not connected
to the operational team scheduler. A follow-up must select published team
Studio templates, map real team members to slots, and supply authorized
schedules/profile image URLs. Legacy team templates remain unchanged.
