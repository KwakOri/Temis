# Template Studio Development Checklist

## Status

This checklist tracks implementation work after the current Template Studio
prototype.

Authoritative plan:

- `docs/template-studio-development-plan.md`

Reference-only material:

- Existing hard-coded timetable folders under `src/app/(root)/time-table`
- v2/Figma docs under `docs/v2-*`

## Current Baseline

Already implemented:

- [x] `/template-studio` route exists.
- [x] Graph-first document model exists.
- [x] Opaque node/input ids are used.
- [x] Object types exist: `group`, `text`, `image`, `flexibleText`.
- [x] Input types exist: `text`, `image`, `select`.
- [x] Input scopes exist: `global`, `day`, `entry`.
- [x] Runtime values exist for global/day/entry scopes.
- [x] Object-to-input binding works for text, image, and select mappings.
- [x] Built-in field binding exists.
- [x] Timetable domain exists with days, entries, statuses, variants, and
      fallback resolution.
- [x] Cards/Timetable workspace split exists.
- [x] Cards tabs exist: `Layers`, `Inputs`, `Table`.
- [x] Timetable tabs exist: `Layers`, `Presets`, `Inputs`.
- [x] Timetable canvas defaults to `4000 x 2250`.
- [x] Timetable layer tree is separate from Cards layer tree.
- [x] Timetable exposes generated day-card containers instead of card internals.
- [x] Timetable day-card container can be selected and moved.
- [x] Layer ordering shows visually top-most objects first.
- [x] Layer groups can collapse and expand.
- [x] Layer rows can be dragged directly.
- [x] Layer reorder/reparent validation blocks self/descendant drops.
- [x] Local draft save exists.
- [x] Basic editor shortcuts exist.
- [x] Template Studio planning docs have been consolidated into
      `template-studio-development-plan.md`.

Current known gaps:

- [x] Semantic exception object model exists at the type/metadata/validator
      level.
- [x] Preset registry exists for available/planned Cards and Timetable presets.
- [ ] Generic editable slot runtime is not implemented yet.
- [x] `Week Dates` uses a built-in date range binding.
- [x] `Weekly Memo` creates or links a preset-owned global custom input when
      inserted.
- [x] `Profile Block` MVP exists.
- [x] `Profile Block` frame and mask controls exist.
- [x] `Profile Block` user-replaceable input flow exists.
- [x] `Artist / Profile Text` text-only MVP exists as an independent preset.
- [x] `Artist / Profile Text` text-with-asset mode exists.
- [x] `Artist / Profile Text` asset visibility and focused asset layout controls
      exist.
- [x] `Top Object` exists as a Timetable semantic preset.
- [x] `Status Card Background` exists as a Cards semantic preset for shared
      status assets.
- [ ] Day-specific status background asset overrides are not implemented yet.
- [x] `multi` and `offline_memo` are capability-gated and disabled by default.
- [x] Capability settings UI exists in the Timetable inspector.
- [x] Timetable preview no longer injects hidden day-card header/meta UI.
- [x] Sample document no longer places profile image in the Cards graph.
- [x] Local JSON import/export exists.
- [ ] Production persistence is not implemented.

## Non-Negotiable Rules

- Do not attempt broad migration from existing hard-coded timetable folders.
- Keep Template Studio as a separate domain.
- Keep node ids and input ids opaque.
- Do not introduce fixed semantic node ids.
- Keep built-in timetable values out of `document.inputs`.
- Keep custom template-specific values in `document.inputs`.
- Keep select bindings declarative; they must not mutate graph, schema, or
  timetable domain data at runtime.
- Keep `Profile Block` Timetable-only.
- Keep `Artist / Profile Text` independent from `Profile Block`.
- Keep `multi` and `offline_memo` disabled by default until explicitly enabled
  by template capability settings.

## Phase 0. Baseline Cleanup

Goal: remove stale prototype labels and make the current baseline honest before
new model work begins.

- [x] Replace visible `Milestone A` editor copy with a neutral current label.
- [x] Check sample metadata and update stale milestone descriptions.
- [x] Add a short comment or doc note for the current document version
      assumptions.
- [x] Confirm old Template Studio docs are removed and only the integrated plan
      plus this checklist remain.
- [x] Run formatting on changed docs.

Exit criteria:

- [x] No user-facing UI still implies the editor is only Milestone A.
- [x] Docs and UI describe the current Cards/Timetable split accurately.

## Phase 1. Domain Model Stabilization

Goal: add missing contracts before implementing more presets.

### 1.1 Capabilities

- [x] Add `StudioTimetableCapabilities`.
- [x] Add `multi.enabled`.
- [x] Add `offlineMemo.enabled`.
- [x] Add default capability initialization for new documents.
- [x] Add normalization for documents missing capabilities.
- [x] Update sample document to include capabilities with both disabled by
      default.
- [x] Hide `multi` status controls unless `multi.enabled` is true.
- [x] Hide `offlineMemo` status controls unless `offlineMemo.enabled` is true.
- [x] Hide capability-gated built-in fields when the capability is disabled.
- [x] Add Timetable inspector toggles for `multi` and `offlineMemo`.
- [x] Normalize runtime entries back to base statuses when a capability is
      disabled.
- [x] Add validator warnings/errors for capability-gated statuses that appear
      while disabled.

### 1.2 Built-In Fields

- [x] Decide canonical id for user-mentioned `time.day`.
- [x] Keep `day.label` as canonical day label id unless a stronger reason
      appears.
- [x] Add `day.date`.
- [x] Add `week.date_range`.
- [x] Add `week.start_date`.
- [x] Add `week.end_date`.
- [x] Add `entry.is_multi`.
- [x] Add `entry.is_offline_memo`.
- [x] Add resolver support for new built-in fields.
- [x] Add compatibility rules for new built-in fields.
- [x] Add validator support for new built-in fields.

### 1.3 Exception Object Contract

- [x] Add semantic preset scope type: `cards | timetable`.
- [x] Add semantic key type:
  - [x] `dayCardContainers`
  - [x] `weekDates`
  - [x] `weeklyMemo`
  - [x] `profileBlock`
  - [x] `artistProfileText`
  - [x] `topObject`
  - [x] `dayLabel`
  - [x] `dayDate`
  - [x] `entryStatusLabel`
  - [x] `statusCardBackground`
- [x] Add exception object metadata contract.
- [x] Add `lockedStructure`.
- [x] Add `singleton`.
- [x] Add `editableSlots`.
- [x] Add `builtInBindings`.
- [x] Add `capabilityFlags`.
- [x] Add validator checks for malformed exception metadata.
- [x] Add default/migration helpers for old simple timetable objects.

Exit criteria:

- [x] TypeScript can represent every planned semantic preset.
- [x] Existing sample document validates.
- [x] Optional capabilities default to disabled.
- [x] No new preset needs to overload plain text object fields.

Verification:

- [x] `npx tsc --noEmit --pretty false --incremental false`
- [x] ESLint changed Template Studio files.
- [x] Browser smoke test `/template-studio`.

## Phase 2. Generated Card Fidelity

Goal: Timetable generated cards must render only what is authored in Cards plus
explicit Timetable composition objects.

- [x] Remove hidden day-card header UI from `StudioTimetablePreview`.
- [x] Remove hidden entry meta UI from generated card internals.
- [x] Keep generated day-card container selection/movement intact.
- [x] Ensure generated cards still receive `dayId`.
- [x] Ensure generated entries still receive `entryIndex`.
- [x] Add Cards preset/object template for `Day Label`.
- [x] Add Cards preset/object template for `Day Date`.
- [x] Add Cards preset/object template for `Entry Status Label`.
- [x] Bind sample card day label to built-in day context if the visual should
      remain visible.
- [x] Bind sample card entry/status label to built-in entry context if the
      visual should remain visible.
- [x] Remove or relocate sample Cards `Profile Image` according to the
      Timetable-only `Profile Block` rule.

Exit criteria:

- [x] Timetable preview does not create hidden card-internal text or headers.
- [x] Any visible day/entry label can be found in Cards or Timetable layers.
- [x] Generated cards preserve the Cards source layout.

Verification:

- [x] Cards view renders expected source card.
- [x] Timetable view renders seven generated containers.
- [x] Switching Cards/Timetable does not change source card layout.
- [x] Day/entry scoped values resolve correctly.

## Phase 3. Preset Registry

Goal: replace ad hoc preset definitions with one registry.

- [x] Create a Template Studio preset registry module.
- [x] Move current Timetable preset definitions out of
      `template-studio-client.tsx`.
- [x] Add preset category: `semanticException`.
- [x] Add preset category: `inputBundle`.
- [x] Add preset category: `freeObject`.
- [x] Support Cards presets.
- [x] Support Timetable presets.
- [x] Add required capability metadata.
- [x] Add singleton metadata.
- [x] Add registry-level repeatable preset creation rules.
- [x] Add duplicate handling for singleton presets.
- [x] Add disabled UI state for presets blocked by missing capabilities.
- [x] Add empty state for preset groups.

Initial singleton policy:

- [x] `dayCards` is singleton.
- [x] `weekDates` is singleton.
- [x] `profileBlock` is singleton.
- [x] `artistProfileText` is singleton.
- [x] `topObject` is singleton.
- [x] `weeklyMemo` is singleton for the first implementation.

Exit criteria:

- [x] Adding available core presets goes through the registry.
- [x] Singleton presets select existing objects instead of duplicating them.
- [x] Registry-created input-bundle repeatable presets create unique labels and
      ids.

Verification:

- [x] Presets panel still renders.
- [x] Existing `Week Dates` and `Weekly Memo` insertion behavior still works or
      is intentionally updated.
- [x] No client-local preset arrays remain for core presets.

## Completed Slice. Semantic Slot Foundation

Goal: make semantic preset slot behavior reusable before adding larger
Timetable presets.

- [x] Extract reusable semantic slot helpers from the current `Weekly Memo`
      implementation.
  - [x] Text input slot: create or reuse a preset-owned custom input.
  - [x] Asset slot: reference an existing template asset.
  - [x] Fit slot: support `cover`, `contain`, and `fill`.
  - [x] Visibility slot: reuse timetable object `hidden` behavior.
- [x] Add shared inspector UI for text, asset, fit, and visibility slots.
- [x] Migrate `Weekly Memo` to the shared slot helpers without changing current
      behavior.
- [x] Use the shared slot helpers as the foundation for `Profile Block`.

## Next Development Slice

Goal: improve asset/input creation flows now that the core semantic preset
shape is in place.

- [x] Add upload/new template asset creation for semantic asset slots.
- [ ] Reuse the asset-slot source UI across Timetable and Cards inspectors where
      possible.
- [x] Implement generic `Select Input Bundle` MVP.
- [x] Add `Sticker Select` as the first preconfigured select bundle.
- [x] Add diagnostics for select options without required label/asset mappings.
- [x] Add quick jump actions between inputs and consuming objects.
- [ ] Keep full day-specific status background matrix deferred until the shared
      asset flow is more stable.

## Phase 4. Timetable Semantic Presets

Goal: implement full-week composition presets first.

### 4.1 Week Dates

- [x] Convert `Week Dates` from static text to semantic exception object.
- [x] Bind to `week.date_range`.
- [ ] Add formatting settings:
  - [x] `2026.07.01 - 07.07`
  - [x] `07.01 - 07.07`
  - [x] localized month/date labels
  - [x] split start/end layout support or a clear future placeholder
- [x] Keep Timetable-only scope.
- [x] Make it selectable from canvas and layer tree.
- [x] Expose position controls.
- [x] Expose size controls for Timetable text composition objects.
- [x] Expose typography controls for Timetable text composition objects.

### 4.2 Weekly Memo

- [x] Use preset-created global custom input for memo content.
- [x] Treat `Weekly Memo` as singleton in the first implementation.
- [x] Implement preset-created global custom input behavior.
- [x] Create or link memo content input when preset is inserted.
- [x] Add multiline text support.
- [x] Add placeholder setting.
- [x] Add optional background asset slot.
  - [x] Reference existing template assets from the timetable object.
  - [x] Support background fit modes: `cover`, `contain`, `fill`.
  - [x] Validate missing background asset references.
  - [x] Add upload/new asset creation flow for this slot.
  - [x] Add optional image input creation flow for user-replaceable memo
        backgrounds.
- [x] Add visibility setting.
- [x] Keep Timetable-only scope.

### 4.3 Profile Block

- [x] Implement Timetable-only `Profile Block` MVP.
- [x] Remove dependency on Cards profile image node for the default sample.
- [x] Add profile image slot.
- [x] Add frame slot.
- [x] Add fit controls.
- [x] Add mask controls.
- [x] Add placeholder behavior.
- [x] Add optional user-replaceable image input creation.
- [x] Show as one layer-tree object by default.
- [x] Expose initial slot settings in inspector.

### 4.4 Artist / Profile Text

- [x] Implement as independent Timetable-only semantic preset.
- [x] Do not merge into `Profile Block`.
- [x] Use preset-created global custom input for text content in the first
      implementation.
- [x] Create or link artist/profile text input when preset is inserted.
- [x] Reuse an existing matching artist/profile text input instead of creating a
      duplicate.
- [x] Support text-only mode.
- [x] Support text-with-asset mode.
- [x] Support stateful on/off asset mode when needed.
- [x] Add text style controls.

### 4.5 Top Object

- [x] Implement Timetable-only semantic preset.
- [x] Use template asset slot by default.
- [x] Add optional user-replaceable image input creation.
- [x] Add fit/position/size controls.
- [x] Show as one layer-tree object.

Exit criteria:

- [x] All Timetable semantic presets appear in Timetable layers.
- [x] All Timetable semantic presets can be selected from canvas.
- [x] All Timetable semantic presets expose appropriate inspector settings.
- [ ] Built-in bindings are visible and understandable.

Verification:

- [ ] Insert each Timetable preset.
- [ ] Move each preset.
- [ ] Reorder each preset relative to day-card containers.
- [ ] Toggle user-replaceable asset mode where supported.
- [ ] Validate no broken inputs or bindings are created.

## Phase 5. Cards Semantic Presets

Goal: improve card source authoring without exposing generated internals in
Timetable.

### 5.1 Built-In Text Presets

- [x] Implement `Day Label` Cards preset.
- [x] Implement `Day Date` Cards preset.
- [x] Implement `Entry Status Label` Cards preset.
- [x] Bind each preset to built-in fields.
- [x] Add basic typography and layout controls through normal text-object
      inspectors.
- [x] Confirm generated cards resolve values per day/entry.

### 5.2 Status Card Background

- [x] Implement `Status Card Background` as Cards semantic preset.
- [x] Support `online` asset slot.
- [x] Support `offline` asset slot.
- [x] Add `multi` slot only when capability is enabled.
- [x] Add `offlineMemo` slot only when capability is enabled.
- [x] Support shared assets first.
- [ ] Add day-specific asset slots later only after shared flow is stable.
- [ ] Defer full `7 days x 4 statuses = 28 asset slots` matrix UI until after
      shared status asset flow is stable.
- [x] Add status fallback behavior to preview.
- [x] Add diagnostics for missing required base status assets.

Exit criteria:

- [x] Cards can author day/entry labels that render correctly in Timetable.
- [x] Cards can author base status backgrounds.
- [x] Capability-gated status slots are hidden until enabled.

Verification:

- [x] Add each Cards preset.
- [x] Switch selected day and confirm day-specific text changes.
- [x] Switch entry status and confirm status label/background changes.
- [x] Confirm Timetable still exposes only generated containers, not internals.

## Phase 6. Input Bundle Presets

Goal: make template-specific optional features easy to add.

### Generic Select Input Bundle

- [x] Implement generic `Select Input Bundle` preset.
- [x] Treat `Sticker Select` as a preconfigured select bundle, not as the
      underlying model.
- [x] Default scope to `entry`.
- [x] Allow scope override after insertion.
- [x] Create select input with stable option values.
- [x] Create and edit option labels.
- [x] Support `select -> text` mappings.
- [x] Support `select -> image/asset` mappings.
- [x] Keep room for future `select -> visibility/variant` mappings without
      requiring this MVP to implement them.
- [x] Allow label-only, asset-only, and label+asset consumer objects.
- [x] Create default sticker options only for the `Sticker Select` preset.
- [x] Add unmapped option diagnostics for required text/asset mappings.
- [x] Add quick jump from input to consuming object.
- [x] Add quick jump from object to input.

Exit criteria:

- [x] A select input can be added without hand-building input schema.
- [x] Select values can drive text and/or image output declaratively.
- [x] `Sticker Select` is implemented through the generic select bundle path.
- [x] Select bundles remain flexible input bundles, not fixed semantic
      exception objects.

Verification:

- [x] Add generic select bundle.
- [x] Add sticker select preset.
- [x] Edit options.
- [x] Bind to label.
- [x] Bind to image mapping.
- [x] Confirm runtime preview updates.

## Phase 7. Inspector And Layer Polish

Goal: make the expanded model practical to use.

- [x] Group binding candidates by built-in/custom source.
- [x] Group binding candidates by scope.
- [x] Show active scope in binding dropdown rows.
- [x] Show input consumers.
- [x] Warn when an input has no consumers.
- [x] Warn when input scope is incompatible with current preview context.
- [x] Add jump from input to consuming objects.
- [x] Add jump from bound object to input.
- [x] Add diagnostics for hidden graph nodes.
- [x] Add diagnostics for unreachable graph nodes.
- [x] Improve drop affordance for above/below/inside.
- [x] Auto-expand collapsed groups during drag after a short hover delay.
- [x] Add Cards layer-tree range selection.

Exit criteria:

- [ ] Users can understand where a value comes from.
- [ ] Users can find objects consuming each input.
- [ ] Layer movement remains predictable.

## Phase 8. Persistence Preparation

Goal: prepare the editor data shape for saving without writing to production.

- [x] Define serialization boundary.
- [x] Add local JSON export.
- [x] Add local JSON import.
- [x] Add document version migration helper.
- [x] Add strict validation before export.
- [x] Add diagnostics summary before export.
- [x] Define production persistence/storage plan.
- [x] Choose separate Template Studio tables instead of reusing v2 render-config
      tables.
- [x] Define draft/publish/revision split.
- [x] Define production asset storage policy.
- [x] Define services/API boundary before React Query integration.
- [x] Require local Docker Supabase migration testing before remote migration.
- [x] Keep Supabase writes out of scope unless explicitly requested.

Future migration workflow:

- [ ] Write Template Studio Supabase migration files locally.
- [ ] Start local Docker Supabase stack.
- [ ] Apply migration to the local database.
- [ ] Verify local migration status and schema shape.
- [ ] Test sample insert/read flows for templates, documents, drafts, revisions,
      and assets.
- [ ] Test draft/publish/revision transaction behavior locally.
- [ ] Test storage bucket and asset policy locally.
- [ ] Run Template Studio API/service tests against the local Supabase database
      once those layers exist.
- [ ] Apply migration to the remote Supabase project only after explicit approval.

## Phase 9. Local Supabase Persistence Foundation

Goal: prove Template Studio persistence locally before any remote database work.

### 9.1 Local Migration Files

- [x] Create migration for `template_studio_templates`.
- [x] Create migration for `template_studio_documents`.
- [x] Create migration for `template_studio_document_revisions`.
- [x] Create migration for `template_studio_document_drafts`.
- [x] Create migration for `template_studio_assets`.
- [x] Add updated-at triggers.
- [x] Add indexes for template, user draft, revision, and asset lookup paths.
- [x] Add status/check constraints.
- [x] Add foreign keys that match the current project user/auth model.
- [x] Add `template-studio-assets` storage bucket setup.
- [x] Add local storage policies for asset read/write/delete paths.

### 9.2 Local Docker Supabase Verification

- [x] Start local Docker Supabase.
- [x] Apply migrations locally with `supabase db reset`.
- [x] Verify migration status.
- [x] Inspect tables, indexes, constraints, triggers, and storage bucket shape.
- [x] Insert/read/update/delete sample template metadata locally.
- [x] Insert/read sample published document locally.
- [x] Insert/read/update sample user draft locally.
- [x] Insert/read sample revision history locally.
- [x] Insert/read/delete sample asset registry row locally.
- [x] Test draft-to-publish transaction locally.
- [x] Test storage bucket upload/read/delete policy locally.

Verification notes:

- Local Docker was started with a temporary Docker config
  (`DOCKER_CONFIG=/tmp/temis-docker-config`) to avoid the global Docker Desktop
  credential helper hanging on image pulls.
- `supabase db reset` applied
  `20260705000000_create_template_studio_persistence.sql` successfully.
- A local admin JWT context verified template metadata, draft, published
  document, revision, and asset registry writes through RLS.
- A local authenticated storage token verified
  `template-studio-assets` upload, read, and delete paths.

### 9.3 Server Persistence Helpers

- [x] Add server-only document migration wrapper.
- [x] Add server-only document validation wrapper.
- [x] Add next revision number helper.
- [x] Add draft save helper.
- [x] Add publish transaction helper.
- [x] Add asset metadata helper.
- [x] Add helper-level tests against local Supabase.

Implementation notes:

- `src/services/server/templateStudioPersistenceService.ts` owns Template Studio
  persistence helpers and keeps the temporary untyped Supabase table boundary
  isolated until generated DB types include the new tables.
- `scripts/check-template-studio-persistence.ts` verifies helpers against local
  Supabase only, refusing non-local Supabase URLs.

### 9.4 API, Service, And Hooks

- [x] Add Template Studio API route contracts.
- [x] Add `templateStudioService` services layer.
- [x] Add React Query hooks for list/load/save draft/publish.
- [x] Keep UI calls on Page/UI -> React Query -> Services -> API route.
- [x] Add local API tests or smoke scripts against local Supabase.

Implementation notes:

- Admin API contracts now cover template list/create, template load, draft
  get/save, and publish.
- `src/services/templateStudioService.ts` is the client service boundary.
- `src/hooks/query/useTemplateStudio.ts` owns React Query hooks and invalidation.
- `scripts/check-template-studio-api.ts` verifies the API route handlers against
  local Supabase without touching remote Supabase.

### 9.5 Editor Integration

- [x] Add remote draft load path.
- [x] Add remote draft save path.
- [x] Keep local draft save as fallback.
- [x] Add publish action after draft save is stable.
- [x] Add remote asset upload path.
- [x] Convert production-saved assets from data URL storage to storage references.
- [x] Keep JSON export/import available.

Implementation notes:

- The editor top bar can select an existing remote Template Studio template,
  load its draft/published document, save the current editor state as a remote
  draft, or publish a revision.
- If no remote template is selected, remote save/publish first creates a
  Template Studio template from current document metadata.
- Remote save/publish uploads document-level data URL assets to the private
  `template-studio-assets` bucket before persisting the document JSON.
- Asset upload supports both browser file-reader base64 data URLs and existing
  utf8 SVG data URLs from the sample document.
- Persisted document assets keep `storagePath`, `mimeType`, and `byteSize`.
  The current editor stores a long-lived signed URL in `src`; a future
  hardening pass should refresh signed URLs from `storagePath` on load instead
  of relying on the persisted signed URL.
- Local JSON export/import remains available and is independent from the remote
  draft/publish flow.

### 9.6 Remote Gate

- [x] Summarize local migration/test results.
- [x] Review SQL and API behavior before remote work.
- [x] Gate remote migration behind explicit approval.
- [ ] Apply migration to remote Supabase only after approval.

Remote gate notes:

- Local migration verification completed with `supabase db reset` against the
  Docker Supabase stack. Remote project `ajlgjdwkjyayrnocdfpj` was not touched.
- Helper-level persistence verification passed with
  `scripts/check-template-studio-persistence.ts` against local Supabase.
- API route verification passed with `scripts/check-template-studio-api.ts`
  against local Supabase, including template create/list/load, asset upload,
  draft save/load, publish, and cleanup.
- Static verification passed with `npx tsc --noEmit --pretty false
  --incremental false`, changed-file ESLint, and `git diff --check`.
- The migration creates new Template Studio tables and a private
  `template-studio-assets` bucket instead of reusing existing v2 render-config
  tables.
- The current API surface is admin-only and uses the existing admin JWT/user
  resolution path. Production enablement should confirm who can access
  Template Studio before exposing non-admin flows.
- Local browser/dev-server tests must explicitly override `.env.local` when
  testing against local Supabase, because `.env.local` may point at the remote
  Supabase project.
- After remote migration, generated Supabase database types should be refreshed
  so the temporary isolated table typing in
  `templateStudioPersistenceService.ts` can be narrowed or removed.
- Remote migration command is intentionally not run in this phase. Apply it only
  after a separate explicit approval for the Temis remote Supabase project.

Exit criteria:

- [x] A Template Studio document can round-trip through JSON locally.
- [x] Invalid documents are blocked or clearly warned before export.

Verification:

- [x] Export sample document.
- [x] Import exported document.
- [x] Compare rendered Cards view.
- [x] Compare rendered Timetable view.

## Per-Phase Verification Checklist

Run after any implementation phase:

- [x] `npx tsc --noEmit --pretty false --incremental false`
- [x] ESLint changed Template Studio files.
- [x] Browser smoke test `/template-studio`.
- [ ] Confirm Cards layer tree edits source card objects.
- [ ] Confirm Timetable layer tree edits only composition objects and generated
      day-card containers.
- [ ] Confirm day-scoped values do not leak across days.
- [ ] Confirm entry-scoped values do not leak across entries.
- [x] Confirm validator has no new false positives for the sample document.
- [ ] Confirm local draft save still works.

## Open Decisions

- [x] No open product decisions remain for the current roadmap.

Resolved decisions:

- [x] `Weekly Memo` content uses a preset-created global custom input.
- [x] `weeklyMemo` is singleton in the first implementation.
- [x] Cards `Day Label` / `Day Date` come first; Timetable-level external day
      headings are deferred.
- [x] Status card background starts with shared slots; the full
      `7 days x 4 statuses = 28 asset slots` UI is deferred until the simpler
      shared asset flow is stable.
- [x] `Artist / Profile Text` content uses a preset-created global custom input
      in the first implementation.

## Done Definition For This Roadmap

- [x] Current UI no longer contains stale milestone labeling.
- [x] Capability-gated optional statuses are explicit and disabled by default.
- [x] Generated Timetable cards are faithful renderings of Cards source graph.
- [x] Semantic preset registry exists.
- [x] Timetable semantic presets exist for:
  - [x] `Week Dates`
  - [x] `Weekly Memo`
  - [x] `Profile Block`
  - [x] `Artist / Profile Text`
  - [x] `Top Object`
- [x] Cards semantic presets exist for:
  - [x] `Day Label`
  - [x] `Day Date`
  - [x] `Entry Status Label`
  - [x] `Status Card Background`
- [x] Generic `Select Input Bundle` MVP exists.
- [x] `Sticker Select` preset exists as a preconfigured select bundle.
- [ ] Inspector and layer tree can explain semantic presets and input bindings.
- [x] Local JSON import/export exists.
- [x] Current typecheck, lint, validator, and browser smoke checks pass.
