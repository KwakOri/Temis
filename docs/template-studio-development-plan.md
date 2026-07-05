# Template Studio Integrated Development Plan

## Purpose

This document is the single working plan for `/template-studio`.

It replaces the previous Template Studio milestone/checklist/next-step notes and
records the current implementation status, fixed product decisions, known risks,
and the recommended development order.

Use `docs/template-studio-development-checklist.md` as the execution checklist
for tracking implementation progress against this plan.

The old hard-coded timetable folders are reference material only. Template
Studio is a separate domain and should not attempt broad automatic migration
from those folders.

## Current Implementation Snapshot

Route and files:

- Page route: `/template-studio`
- Main UI: `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- Renderer: `src/app/(root)/template-studio/_components/studio-renderer.tsx`
- Timetable preview: `src/app/(root)/template-studio/_components/studio-timetable-preview.tsx`
- Types: `src/types/template-studio.ts`
- Utilities: `src/utils/template-studio/*`
  - Preset registry:
    `src/utils/template-studio/preset-registry.ts`

Implemented baseline:

- Graph-first document model with opaque node ids and input ids.
- Object types: `group`, `text`, `image`, `flexibleText`.
- Input types: `text`, `image`, `select`.
- Input scopes: `global`, `day`, `entry`.
- Bindings:
  - static text
  - input text
  - select-to-text
  - static asset
  - input image
  - select-to-asset
  - built-in field
- Runtime value containers for global, day, and entry input values.
- Timetable domain with seven days, entries by day, base and derived statuses,
  component variants, and fallback status resolution.
- Cards/Timetable workspace split.
- Cards panel tabs: `Layers`, `Inputs`, `Table`.
- Timetable panel tabs: `Layers`, `Presets`, `Inputs`.
- Timetable canvas default size: `4000 x 2250`.
- Timetable composition currently supports:
  - generated day-card containers
  - text objects
  - exception metadata on generated day-card containers
  - `Week Dates` as a built-in `week.date_range` text object
  - `Weekly Memo` as a text object that creates or links a global custom input
    when inserted
  - `Weekly Memo` optional background asset selection from existing template
    assets
  - `Profile Block`, `Artist / Profile Text`, and `Top Object` as
    Timetable-only semantic presets
- Preset registry currently supports:
  - available Cards context presets
  - available Timetable composition presets
  - planned disabled presets for future semantic objects
  - semantic exception, input bundle, and free object categories
  - singleton detection and select-existing behavior
  - required-capability disabled metadata
- Cards source currently includes built-in context object templates for:
  - `Day Label`
  - `Day Date`
  - `Entry Status Label`
  - `Status Card Background`
- Layer tree basics:
  - top-most visual order appears first
  - group collapse/expand
  - direct row drag
  - reorder/reparent validation
  - invalid self/descendant drops blocked
- Selection and movement:
  - separate Cards and Timetable selection state
  - timetable day-card container can be selected and moved
  - generated day cards expose top-level containers only in Timetable
- Local draft save to browser storage.
- Undo/redo, copy/cut/paste, duplicate, group/ungroup, lock, z-order commands,
  arrow-key movement, zoom, fit, pan, and canvas selection shortcuts.
- Initial timetable capability model:
  - `multi` defaults to disabled
  - `offlineMemo` defaults to disabled
  - disabled statuses and built-in fields are hidden from active controls
  - runtime status updates reject disabled statuses
  - Timetable inspector settings can explicitly enable or disable optional
    status capabilities
- Initial semantic exception metadata contract:
  - semantic key
  - scope
  - preset id
  - locked structure
  - singleton
  - editable slots
  - built-in bindings
  - capability flags
- Template Studio document `version` remains `1` while these prototype fields
  are optional; missing timetable capabilities must resolve to disabled
  defaults until a formal persistence migration exists.

Current important limitations:

- Generic editable slot runtime is not implemented yet.
- `Weekly Memo` creates or links a multiline global custom input and supports
  visibility toggling plus an optional background asset slot from existing
  template assets.
- `Weekly Memo` background can be switched from a template asset to an explicit
  user-replaceable global image input.
- Semantic asset slots now support uploading a new template asset directly from
  the inspector and immediately binding it to the selected slot.
- `Profile Block` has an initial Timetable-only implementation with profile
  image, frame asset, fit, mask, visibility, and a single layer-tree object.
- `Profile Block` profile image and frame slots can be switched from template
  assets to explicit user-replaceable global image inputs.
- `Artist / Profile Text` has a Timetable-only implementation with a
  preset-created global custom input, single layer-tree object, basic
  typography controls, optional text-with-asset mode, and focused asset
  visibility/layout controls.
- `Top Object` has an initial Timetable-only implementation with a template
  asset slot, fit controls, position/size controls, and a single layer-tree
  object.
- `Top Object` can be switched from a template asset to an explicit
  user-replaceable global image input.
- `Status Card Background` supports shared `online` and `offline` asset slots,
  capability-gated `multi` and `offlineMemo` slots, and status fallback
  resolution.
- Day-specific status background overrides and the full status/day matrix UI are
  not implemented yet.
- Optional capability settings UI exists in the Timetable inspector; disabling
  a capability normalizes runtime entries back to the related base status.
- Local JSON export/import is implemented with versioned migration/default
  helpers; production persistence is not implemented, but the storage boundary
  and rollout plan are now fixed.

## Fixed Product Decisions

### Cards And Timetable Are Separate Workspaces

`Cards` edits the reusable day-card source.

- Card-internal objects live in the Cards graph.
- Day labels, entry titles, entry status labels, and card status backgrounds are
  authored in Cards when they appear inside each repeated card.
- Cards owns day/entry runtime table editing.

`Timetable` edits the full weekly composition.

- Full-week objects live in Timetable composition.
- Generated day-card containers are placed and ordered in Timetable.
- Timetable does not expose the internal card graph as normal layers.
- Timetable can access shared template inputs, but it should not expose
  day/entry table controls.

### Generated Cards Must Be Faithful To Cards

Generated cards in Timetable must render the Cards graph with day/entry runtime
context.

Timetable preview must not inject hidden day labels, entry labels, or header UI
inside each generated card. If such a visual element appears inside a repeated
card, it must exist in Cards and bind to a built-in field.

### Built-In Values Are Not Custom Inputs

Always-present timetable values belong to a built-in field catalog, not to
`document.inputs`.

Examples:

- `day.label`
- `day.short_label`
- `day.date`
- `entry.main_title`
- `entry.sub_title`
- `entry.status`
- `entry.status_label`

Template-specific values belong to custom inputs.

Examples:

- sticker selector
- entry memo
- day note
- user-replaceable top object image

### Optional Status Capabilities Are Disabled By Default

`multi` and `offline_memo` are built-in timetable capabilities, but they are not
enabled by default.

A template author must explicitly enable the capability before related status
options, computed fields, variant hooks, or asset slots appear.

Runtime/status policy:

- `online` and `offline` are base statuses.
- `multi` derives from `online`.
- `offlineMemo` derives from `offline`.
- Missing derived visual variants may fall back to their base variants.

### Semantic Presets Are Not Just Initial Object Sets

Presets are split into three categories.

Semantic exception presets:

- Have stable domain meaning.
- May lock internal structure.
- May expose editable slots and formatting settings.
- May bind to built-in values.
- Appear as one manageable object in the relevant layer tree.

Input bundle presets:

- Create one or more custom input definitions.
- May also create ordinary bound objects.
- Fit template-specific features such as sticker selectors.

Free object presets:

- Insert normal editable graph or composition objects.
- Do not carry special runtime semantics.

### Preset Scope Decisions

`Week Dates`

- Scope: Timetable only.
- Semantic exception preset.
- Binds to built-in weekly date range.
- Does not create a custom input by default.

`Day Label / Day Date`

- Scope: Cards when it appears inside each repeated card.
- Uses day runtime context.
- Cards `Day Label` and `Day Date` should be implemented first.
- Separate Timetable-level day heading presets are deferred until after
  card-internal day labels are stable.

`Profile Block`

- Scope: Timetable only.
- Semantic exception preset.
- Manages full-week composition-level profile image presentation.
- Not shared with Cards.

`Artist / Profile Text`

- Scope: Timetable only.
- Independent semantic exception preset.
- Must not be merged into `Profile Block`.
- First implementation uses a preset-created global custom input for text
  content.
- If a matching artist/profile text input already exists, the preset should
  connect to it instead of creating a duplicate input.
- Optional text-with-asset mode uses the same semantic asset slot flow as other
  Timetable presets.
- A built-in profile/artist field can be introduced later if this value becomes
  a stable cross-template domain concept.

`Top Object`

- Scope: Timetable only.
- Semantic exception preset.
- Uses template asset slots by default.
- Creates a custom image input only when explicitly marked user-replaceable.

`Status Card Background`

- Scope: Cards.
- Semantic exception preset.
- Resolves from enabled status capabilities and day/entry context.

`Weekly Memo`

- Scope: Timetable only.
- Semantic exception preset.
- First implementation uses a preset-created global custom input for memo
  content.
- First implementation treats `Weekly Memo` as a singleton preset.

`Select Input Bundle`

- Generic input bundle preset, not a semantic exception by default.
- Creates a select input whose option values can declaratively drive text and/or
  image output.
- Usually entry-scoped for timetable entries, but the model must allow global,
  day, and entry scopes.
- Future `select -> visibility/variant` mappings should fit the same
  declarative binding model, but they are not required for the first MVP.
- Select bindings must not mutate graph structure, input schema, or timetable
  domain data at runtime.

`Sticker Select`

- A preconfigured `Select Input Bundle`, not the underlying model.
- Usually entry-scoped.
- Provides sticker-oriented default options and select-to-asset mappings.
- Must remain compatible with the same text/image mapping path used by other
  select bundles.

## Production Persistence And Storage Plan

Template Studio should keep production persistence separate from the existing
hard-coded timetable folders and from the older v2 render-config tables.

Storage boundary:

- Save one `StudioTemplateDocument` plus its preview `StudioRuntimeValues` as the
  authoring unit.
- Keep `schema`, `version`, `document`, `runtimeValues`, validation diagnostics,
  and migration warnings at the service boundary.
- Run `migrateStudioTemplateDocument` and `validateStudioDocument` on the server
  before accepting a draft save or publish.
- Treat persisted `runtimeValues` as editor preview/default data, not as a future
  end-user timetable submission format.

Recommended Supabase tables:

- `template_studio_templates`
  - metadata row: `id`, `name`, `description`, `status`, `created_by`,
    timestamps.
  - optional future link to shop/product/template catalog rows, but no coupling in
    the first persistence slice.
- `template_studio_documents`
  - current published body: `template_id`, `document_version`, `document`,
    `runtime_values`, `published_revision_no`, timestamps.
  - one row per Template Studio template.
- `template_studio_document_revisions`
  - immutable publish history: `template_id`, `revision_no`, `document_version`,
    `document`, `runtime_values`, `source`, `created_by`, `created_at`.
  - mirrors the existing render-config revision pattern.
- `template_studio_document_drafts`
  - user draft/autosave body: `template_id`, `user_id`, `document_version`,
    `document`, `runtime_values`, `base_revision_no`, `is_autosave`, timestamps.
  - unique by `template_id + user_id`.
- `template_studio_assets`
  - asset registry: `template_id`, `asset_id`, `storage_path`, `mime_type`,
    `width`, `height`, `byte_size`, `created_by`, timestamps.
  - `asset_id` must match the id stored in `document.assets`.

Asset policy:

- Local prototype data URLs are acceptable only for local draft/export flows.
- Production saves should upload binary assets to a dedicated Supabase Storage
  bucket, recommended name: `template-studio-assets`.
- Recommended path format:
  `template-studio/{template_id}/assets/{asset_id}/{file_name}`.
- Persisted documents should keep stable asset metadata and `assetId`
  references; they should not embed large data URLs.
- JSON export may continue to embed data URLs for portable local handoff, but
  server persistence should prefer storage references.

API and frontend boundary:

- Page/UI must not call Supabase directly.
- Add a services layer first, for example `src/services/templateStudioService.ts`.
- Add React Query hooks after the service functions exist.
- Services should call thin Next.js API routes such as:
  - `GET /api/admin/template-studio/templates`
  - `POST /api/admin/template-studio/templates`
  - `GET /api/admin/template-studio/templates/:id`
  - `PUT /api/admin/template-studio/templates/:id/draft`
  - `POST /api/admin/template-studio/templates/:id/publish`
  - `POST /api/admin/template-studio/templates/:id/assets/presign`
- API routes should perform auth/role checks, migration, validation, and
  transaction boundaries.
- Do not introduce direct client-side Supabase writes for Template Studio.

Migration safety workflow:

- Write Supabase migration files locally first.
- Start the local Supabase stack with Docker and apply the migration to the local
  database before touching the remote project.
- Validate the local database shape with migration status checks, schema
  inspection, seed/sample insertions, draft/publish/revision transaction tests,
  and storage bucket policy tests.
- Run the Template Studio API/service tests against the local Supabase database
  once those layers exist.
- Only after local migration and application tests pass should the migration be
  considered for the remote Supabase project.
- Remote migration application must remain a separate, explicit approval step and
  must use the Temis project token/ref rules from `AGENTS.md`.

Draft and publish flow:

- Local browser draft remains useful as a no-login fallback and crash buffer.
- Remote autosave writes only to `template_studio_document_drafts`.
- Publish validates the migrated document, writes a revision, updates the current
  published document row, and records the `published_revision_no` in one
  transaction.
- Importing JSON should create a draft first; publish remains a deliberate
  action.

Rollout order:

1. Add schema migration and storage bucket policy.
2. Apply and test the migration on the local Docker Supabase database.
3. Add server-only repository/helpers for document validation and revision
   numbering.
4. Add API routes and services layer.
5. Add React Query hooks and connect load/save UI.
6. Add remote asset upload flow and migrate local data URL assets to storage
   references on save.
7. Add publish/history UI after draft save is stable.
8. Apply the tested migration to the remote Supabase project only after explicit
   approval.

## Current Risk Assessment

High-risk items:

- Generic editable slot runtime is still missing, so user-replaceable asset
  presets need narrow preset-specific handling until the generic runtime exists.
- Local JSON export/import exists with a first versioned migration/default path;
  production persistence now has a proposed storage and schema rollout plan, but
  the actual Supabase migration and API layer are not implemented.
- Template asset uploads are stored inside the document as data URLs for the
  current local prototype; production should move binary assets to a dedicated
  storage bucket and keep only stable asset references inside the document.

Medium-risk items:

- The registry now enforces singleton selection for available core presets and
  defines repeatable creation rules; future free-object presets still need
  concrete insertion flows.
- `Weekly Memo` input creation/linking, multiline text behavior, placeholder
  settings, visibility toggling, existing-asset background selection, direct
  template asset upload, and explicit user-replaceable image input switching
  exist.
- `multi` and `offline_memo` are capability-gated in runtime controls and can be
  enabled through the Timetable inspector; future persistence still needs to
  preserve these capability settings explicitly.
- `Status Card Background` supports shared status assets, but day-specific
  overrides and a large matrix editor are intentionally deferred.
- Timetable composition supports only a shallow root object list; future slot
  editing and controlled drill-down are not modeled yet.
- Future preset UI must distinguish available, planned, disabled-by-capability,
  and already-added states clearly as the registry grows.

Low-risk items:

- The existing graph/input/binding baseline is stable enough to build on.
- Cards and Timetable selection separation is already present.
- Layer ordering and grouping behavior have a workable foundation.

## Immediate Next Development Slice

The editor model, semantic presets, local JSON round-trip, diagnostics, and core
layer-tree usability are now far enough along that the next meaningful slice is
the local persistence foundation. This does not mean applying anything to the
remote Supabase project yet. The next slice prepares and proves the database
shape against the Docker local Supabase stack first.

Recommended next order:

1. Prepare Template Studio Supabase schema migration files locally.
2. Apply and test those migrations against the local Docker Supabase database.
3. Add server-side persistence helpers only after the local schema is verified.
4. Add API/service/React Query integration after persistence helpers are stable.
5. Apply the tested migration to the remote Supabase project only after explicit
   approval.

Out of scope for the immediate slice:

- Generic nested component editing.
- Remote Supabase migration application.
- Production publishing UI.
- Full `7 days x statuses` asset matrix.

### Next Slice. Local Supabase Persistence Foundation

Goal: create the production persistence foundation safely, without touching the
remote database until local migration and local application tests pass.

Scope:

- Add local migration files for Template Studio tables and storage bucket policy.
- Use separate `template_studio_*` tables rather than older v2 render-config
  tables.
- Keep the existing local JSON import/export path intact while server
  persistence is introduced.
- Store authoring data as `StudioTemplateDocument` plus preview
  `StudioRuntimeValues`.
- Store binary assets in Supabase Storage for production persistence, while local
  JSON export can remain portable.

Step 1. Local Schema Migration

- Create a Supabase migration for:
  - `template_studio_templates`
  - `template_studio_documents`
  - `template_studio_document_revisions`
  - `template_studio_document_drafts`
  - `template_studio_assets`
  - `template-studio-assets` storage bucket and policies
- Add updated-at triggers, useful indexes, JSONB version fields, status checks,
  and foreign keys to the current auth/user model used by this project.
- Do not write remote DB changes in this step.

Step 2. Local Database Verification

- Start the local Docker Supabase stack.
- Apply migrations locally.
- Verify migration status and table/index/constraint shape.
- Run sample insert/read/update/delete checks for:
  - template metadata
  - published document body
  - user draft/autosave
  - publish revision history
  - asset registry rows
- Test a draft-to-publish transaction locally.
- Test storage bucket insert/read/delete and policy behavior locally.

Status: completed locally on 2026-07-05.

- The local stack was started with a temporary Docker config to bypass a Docker
  Desktop credential-helper hang during image pulls.
- `supabase db reset` applied the Template Studio migration successfully.
- RLS-backed sample writes passed for template metadata, user draft, published
  document, revision history, and asset registry rows.
- Authenticated storage upload, read, and delete checks passed for the
  `template-studio-assets` bucket.

Step 3. Server Persistence Helpers

- Add server-only helpers for:
  - migrating incoming documents
  - validating documents before save/publish
  - calculating next revision number
  - writing draft rows
  - publishing current document plus revision in one transaction
  - resolving asset metadata from storage references
- Keep these helpers isolated from UI code.

Step 4. API And Service Boundary

- Add thin Next.js API routes after helper behavior is verified.
- Add `src/services/templateStudioService.ts` after API contracts are stable.
- Add React Query hooks after services exist.
- Keep Page/UI on the established path:
  Page/UI -> React Query hook -> Services layer -> API route -> Supabase.

Step 5. Editor Integration

- Add remote draft load/save controls without removing local draft save.
- Add publish action only after draft save is stable.
- Add remote asset upload flow and convert production-saved assets away from
  document-embedded data URLs.
- Keep JSON export/import available as a portable backup and debugging path.

Step 6. Remote Gate

- Summarize local migration/test results.
- Review generated SQL and API behavior.
- Ask for explicit approval before applying anything to the remote Supabase
  project.
- Use the Temis project ref and token rules from `AGENTS.md` for any approved
  remote operation.

## Target Data Model

### Template Capabilities

Template-level capability settings live under the timetable domain.

Minimum shape:

```ts
interface StudioTimetableCapabilities {
  multi: { enabled: boolean };
  offlineMemo: { enabled: boolean };
}
```

Rules:

- Disabled capabilities must hide related fields, statuses, variant hooks, and
  preset slots from authoring UI.
- Existing documents without capabilities default to both disabled unless a
  migration intentionally infers otherwise.

### Built-In Field Catalog

Normalize built-in field ids before persistence.

Recommended minimum additions:

- `day.date`
- `week.date_range`
- `week.start_date`
- `week.end_date`
- `entry.is_multi`
- `entry.is_offline_memo`

Naming decision:

- Prefer `day.label` and `day.short_label` as canonical field ids.
- Treat `time.day` as a user-facing alias only if needed in UI copy.

### Exception Object Contract

Semantic objects use first-class exception metadata.

Minimum shape:

```ts
type StudioSemanticPresetScope = "cards" | "timetable";

type StudioSemanticKey =
  | "dayCardContainers"
  | "weekDates"
  | "weeklyMemo"
  | "profileBlock"
  | "artistProfileText"
  | "topObject"
  | "dayLabel"
  | "dayDate"
  | "entryStatusLabel"
  | "statusCardBackground";

interface StudioExceptionObjectMeta {
  semanticKey: StudioSemanticKey;
  scope: StudioSemanticPresetScope;
  presetId: string;
  lockedStructure: boolean;
  singleton?: boolean;
  editableSlots?: Record<string, unknown>;
  builtInBindings?: Record<string, string>;
  capabilityFlags?: string[];
}
```

Implementation note:

- Do not expose every internal slot as a normal layer by default.
- Use inspector sections or controlled drill-down for slot editing.

### Preset Registry

Use a registry instead of hard-coding preset button arrays inside the client.

The registry describes:

- id
- label
- category
- scope
- semantic key
- singleton policy
- required capabilities
- created object graph or composition object where implemented
- planned disabled entries for future semantic presets
- optional input bundle creation, once implemented
- default slot settings, once editable slots are implemented

This should support both Cards presets and Timetable presets.

## Recommended Development Order

### Phase 0. Consolidate Baseline

Goal: make the current implementation match the decisions above before adding
more presets.

Tasks:

- [x] Update visible editor copy from `Milestone A` to a current neutral label.
- [x] Record the current Template Studio document version assumptions.
- [ ] Keep v2 and hard-coded timetable folders as reference material only.
- [ ] Do not connect Supabase or production publishing.

### Phase 1. Domain Model Stabilization

Goal: add the missing contracts before building semantic preset behavior.

Tasks:

- [x] Add timetable capability settings for `multi` and `offlineMemo`.
- [x] Hide optional status fields and derived variant hooks until enabled.
- [x] Normalize built-in field ids and add missing date/range/capability fields.
- [x] Add exception object metadata contract.
- [x] Add migration/default helpers for documents missing new fields.
- [x] Add validator checks for capability-gated statuses and exception objects.

Exit criteria:

- TypeScript can represent planned semantic presets without overloading simple
  text objects.
- Existing sample document still validates.
- Optional capabilities default to disabled.

### Phase 2. Generated Card Fidelity

Goal: make Timetable generated cards true renderings of the Cards source graph.

Tasks:

- [x] Remove hidden day-card header UI from `StudioTimetablePreview`.
- [x] Remove hidden entry meta UI from generated card internals unless it is
      explicitly modeled in Cards.
- [x] Add Cards built-in text presets for `Day Label`, `Day Date`, and
      `Entry Status Label`.
- [x] Ensure generated cards pass correct `dayId` and `entryIndex` context.
- [x] Update the sample card source so any desired day/entry labels are visible
      in Cards and editable from the layer tree.

Exit criteria:

- Switching to Timetable does not create visual content that is impossible to
  find in Cards or Timetable layers.
- Generated day cards preserve the Cards layout.

### Phase 3. Semantic Preset Registry

Goal: replace ad hoc preset insertion with a central registry.

Tasks:

- [x] Move timetable preset definitions out of the client component.
- [x] Add preset categories: semantic exception, input bundle, free object.
- [x] Add singleton policy to the registry.
- [x] Add clear disabled states for planned presets and presets blocked by
      missing capabilities.
- [x] Add duplicate handling for singleton presets so they select the existing
      object instead of creating another.
- [x] Add explicit repeatable preset creation rules for future free-object and
      input-bundle presets.

Initial singleton recommendation:

- Singleton:
  - `dayCards`
  - `weekDates`
  - `weeklyMemo`
  - `profileBlock`
  - `artistProfileText`
  - `topObject`
- Repeatable:
  - select input bundles
  - free text/image object presets

### Phase 4. Timetable Semantic Presets

Goal: implement full-week composition presets first.

Implementation order:

0. Semantic slot foundation
1. `Week Dates`
2. `Weekly Memo`
3. `Profile Block`
4. `Artist / Profile Text`
5. `Top Object`

Requirements:

- Each preset appears in Timetable layers.
- Each preset can be selected from the canvas.
- Each preset has editable position, size, and z-order.
- Slot-level settings appear in the inspector.
- Built-in data bindings are visible to the author.
- User-replaceable assets create custom inputs only when explicitly enabled.

- Use a preset-created global custom input for memo content.
- Treat `Weekly Memo` as singleton in the first implementation.
- Keep the preset semantic because its layout, background, visibility, and
  multiline behavior need special settings.

### Phase 5. Cards Semantic Presets

Goal: improve card source authoring without exposing generated internals in
Timetable.

Implementation order:

1. `Day Label`
2. `Day Date`
3. `Entry Status Label`
4. `Status Card Background`

Status card background requirements:

- Support base statuses first: `online`, `offline`.
- Add `multi` and `offlineMemo` slots only when capabilities are enabled.
- Support shared assets first.
- Later support day-specific status assets.
- Introduce the full 28-slot status/day matrix UI only after the simpler shared
  asset flow is stable.

Reference note:

- v2 explored a full `7 days x 4 statuses = 28 asset slots` model. Template
  Studio should borrow the capability and state concepts, but should introduce
  the full 28-slot UI only after the simpler shared-asset flow is stable.

### Phase 6. Input Bundle Presets

Goal: support template-specific authoring patterns without turning them into
hard-coded semantic objects.

Tasks:

- [x] Add generic `Select Input Bundle` preset.
- [x] Add `Sticker Select` as the first preconfigured select bundle.
- [x] Default bundle-created input scope to `entry`.
- [x] Allow bundle-created input scope to be changed after insertion.
- [x] Create select input with stable option values.
- [x] Create and edit option labels.
- [x] Support optional bound text objects through `select -> text` mappings.
- [x] Support optional bound image objects through `select -> asset` mappings.
- [x] Leave a compatible path for future `select -> visibility/variant`
      mappings without implementing them in the MVP.
- [x] Support label-only, asset-only, and label+asset consumer patterns.
- [x] Show unmapped select asset options in diagnostics or inspector.
- [x] Add quick jump actions between select inputs and consuming objects.

Rules:

- Select bindings remain declarative.
- Select bindings must not mutate graph structure, schema, or timetable domain
  data at runtime.

### Phase 7. Inspector And Layer Polish

Goal: make the new concepts understandable in the editor.

Tasks:

- [x] Group binding candidates by scope and built-in/custom source.
- [x] Show consumers of each input.
- [x] Add jump actions between inputs and consuming objects.
- [x] Add diagnostics for hidden/unreachable graph nodes.
- [x] Add diagnostics for unused custom inputs and incompatible timetable preview
      scopes.
- [x] Add clearer drop affordances for layer reparent/reorder.
- [x] Add Cards layer-tree range selection.
- [x] Auto-expand collapsed groups during drag after a short hover delay.

### Phase 8. Persistence Preparation

Goal: prepare for saving without touching production data yet.

Tasks:

- [x] Define serialization boundary.
- [x] Add local JSON export/import.
- [x] Add versioned document migration helpers.
- [x] Add stricter validation before export.
- [x] Define production persistence/storage plan.
- [x] Choose separate Template Studio tables instead of reusing v2 render-config
      tables.
- [x] Define draft/publish/revision split.
- [x] Define production asset storage policy.
- [x] Define services/API boundary before React Query integration.
- [x] Keep Supabase writes out of scope unless explicitly requested.

## Verification Plan

Minimum verification after code changes:

- `npx tsc --noEmit --pretty false --incremental false`
- ESLint on changed Template Studio files.
- Browser walkthrough of `/template-studio`.

Manual browser checks:

- Cards layer tree still edits source card objects.
- Timetable layer tree shows only composition objects and generated day-card
  containers.
- Day/entry scoped runtime values resolve only in the correct context.
- Timetable generated cards do not show hidden card-internal UI.
- Preset insertion, selection, movement, and z-order changes work.
- Disabled capabilities hide related status/preset controls.

## Shortcut Reference

Implemented:

- `Cmd/Ctrl + Z`: undo.
- `Shift + Cmd/Ctrl + Z` or `Ctrl + Y`: redo.
- `Cmd/Ctrl + S`: save local draft.
- `Cmd/Ctrl + A`: select all editable non-root objects.
- `Cmd/Ctrl + C/X/V`: copy, cut, paste editor clipboard.
- `Delete` / `Backspace`: delete selected object when allowed.
- `Cmd/Ctrl + D`: duplicate.
- `Cmd/Ctrl + G`: group.
- `Shift + Cmd/Ctrl + G`: ungroup.
- `Cmd/Ctrl + ]` / `[`: move one layer forward/back.
- `Shift + Cmd/Ctrl + ]` / `[`: bring to front/send to back.
- `Shift + Cmd/Ctrl + L`: lock/unlock.
- Arrow keys: move by 1px.
- `Shift + Arrow keys`: move by 10px.
- `Cmd/Ctrl + +` / `-`: zoom in/out.
- `Cmd/Ctrl + 0`: fit canvas.
- `Cmd/Ctrl + 1`: 100% zoom.
- `Esc`: close node picker or clear selection.
- `Space + drag`: pan canvas.
- `Shift + drag`: axis-lock movement.
- `Shift + click` in Cards layer tree: select a visible layer range.
- `Cmd/Ctrl + click`: toggle selection.
- `Shift + Cmd/Ctrl + click` in Cards layer tree: add a visible layer range to
  the current selection.

Future shortcuts should wait until the command model matures:

- marquee selection
- alignment/distribution
- command palette
- active day/entry navigation
- paste-at-cursor and cross-document paste

## Reference Material

Current source files:

- `src/types/template-studio.ts`
- `src/utils/template-studio/*`
- `src/app/(root)/template-studio/*`

Historical/reference docs retained:

- `docs/v2-card-28-status-asset-implementation-plan.md`
- `docs/v2-figma-structure-contract.md`
- `docs/v2-figma-import-structure-audit.md`
- `docs/v2-figma-importer-next-plan.md`
- `docs/v2-figma-shared-status-importer-design.md`

Superseded Template Studio docs removed after this consolidation:

- `docs/template-studio-milestone-a-checklist.md`
- `docs/template-studio-milestone-b-checklist.md`
- `docs/template-studio-next-steps-plan.md`
- `docs/template-studio-shortcuts.md`
