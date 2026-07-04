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
  - simple presets for `Week Dates` and `Weekly Memo`
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

Current important limitations:

- Timetable semantic presets are still represented mostly as simple text
  composition objects.
- There is no first-class exception object model yet.
- `Week Dates` is currently static text, not a built-in date range binding.
- `Weekly Memo` data source is not finalized.
- `Profile Block`, `Artist / Profile Text`, `Top Object`, and
  `Status Card Background` are not implemented as presets.
- Optional built-in capabilities such as `multi` and `offline_memo` are not yet
  gated by template-level settings.
- Timetable preview still injects day-card header UI outside the Cards graph.
- The sample document still contains a profile image in the Cards graph, even
  though the product decision is that `Profile Block` belongs to Timetable only.
- Persistence/export/import is not implemented.

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
- Later, separate Timetable-level day heading presets may be added for external
  timetable columns or sections.

`Profile Block`

- Scope: Timetable only.
- Semantic exception preset.
- Manages full-week composition-level profile image presentation.
- Not shared with Cards.

`Artist / Profile Text`

- Scope: Timetable only.
- Independent semantic exception preset.
- Must not be merged into `Profile Block`.

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
- Data source decision is still open:
  - built-in weekly memo value
  - or preset-created global custom input

`Sticker Select`

- Usually entry-scoped.
- Input bundle preset, not a semantic exception by default.

## Current Risk Assessment

High-risk items:

- The current type model does not support semantic exception object data such as
  `semanticKey`, `editableSlots`, `builtInBindings`, or `capabilityFlags`.
- Current simple presets may harden into the wrong abstraction if more presets
  are added before the model is upgraded.
- The built-in field catalog lacks several planned fields, including date/range
  and optional capability fields.
- Timetable preview currently injects card header UI outside Cards.
- The sample document conflicts with the Timetable-only `Profile Block`
  decision.

Medium-risk items:

- Singleton versus duplicate preset policy is undecided.
- `Weekly Memo` value ownership is undecided.
- `multi` and `offline_memo` are validated as derived statuses when present,
  but template-level capability gating does not exist yet.
- Timetable composition supports only a shallow root object list; future slot
  editing and controlled drill-down are not modeled yet.
- The Definition of Done must allow intended preview changes when hidden markup
  is removed.

Low-risk items:

- The existing graph/input/binding baseline is stable enough to build on.
- Cards and Timetable selection separation is already present.
- Layer ordering and grouping behavior have a workable foundation.

## Target Data Model Additions

### Template Capabilities

Add template-level capability settings under the timetable domain or a closely
related template settings object.

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

Add first-class metadata for semantic objects.

Minimum shape:

```ts
type StudioSemanticPresetScope = "cards" | "timetable";

type StudioSemanticKey =
  | "weekDates"
  | "weeklyMemo"
  | "profileBlock"
  | "artistProfileText"
  | "topObject"
  | "dayLabel"
  | "dayDate"
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

Create a registry instead of hard-coding preset button arrays inside the client.

The registry should describe:

- id
- label
- category
- scope
- semantic key
- singleton policy
- required capabilities
- created object graph or composition object
- optional input bundle creation
- default slot settings

This should support both Cards presets and Timetable presets.

## Recommended Development Order

### Phase 0. Consolidate Baseline

Goal: make the current implementation match the decisions above before adding
more presets.

Tasks:

- [ ] Update visible editor copy from `Milestone A` to a current neutral label.
- [ ] Record the current Template Studio document version assumptions.
- [ ] Keep v2 and hard-coded timetable folders as reference material only.
- [ ] Do not connect Supabase or production publishing.

### Phase 1. Domain Model Stabilization

Goal: add the missing contracts before building semantic preset behavior.

Tasks:

- [ ] Add timetable capability settings for `multi` and `offlineMemo`.
- [ ] Hide optional status fields and derived variant hooks until enabled.
- [ ] Normalize built-in field ids and add missing date/range/capability fields.
- [ ] Add exception object metadata contract.
- [ ] Add migration/default helpers for documents missing new fields.
- [ ] Add validator checks for capability-gated statuses and exception objects.

Exit criteria:

- TypeScript can represent planned semantic presets without overloading simple
  text objects.
- Existing sample document still validates.
- Optional capabilities default to disabled.

### Phase 2. Generated Card Fidelity

Goal: make Timetable generated cards true renderings of the Cards source graph.

Tasks:

- [ ] Remove hidden day-card header UI from `StudioTimetablePreview`.
- [ ] Remove hidden entry meta UI from generated card internals unless it is
      explicitly modeled in Cards.
- [ ] Add Cards built-in text presets for `Day Label`, `Day Date`, and
      `Entry Status Label`.
- [ ] Ensure generated cards pass correct `dayId` and `entryIndex` context.
- [ ] Update the sample card source so any desired day/entry labels are visible
      in Cards and editable from the layer tree.

Exit criteria:

- Switching to Timetable does not create visual content that is impossible to
  find in Cards or Timetable layers.
- Generated day cards preserve the Cards layout.

### Phase 3. Semantic Preset Registry

Goal: replace ad hoc preset insertion with a central registry.

Tasks:

- [ ] Move timetable preset definitions out of the client component.
- [ ] Add preset categories: semantic exception, input bundle, free object.
- [ ] Add singleton policy to the registry.
- [ ] Add clear disabled states for presets blocked by missing capabilities.
- [ ] Add duplicate handling rules:
  - singleton presets select the existing object instead of creating another
  - repeatable presets create unique ids

Initial singleton recommendation:

- Singleton:
  - `dayCards`
  - `weekDates`
  - `profileBlock`
  - `artistProfileText`
  - `topObject`
- Open decision:
  - `weeklyMemo` can be singleton first; support multiple memos later only if a
    real template needs it.
- Repeatable:
  - sticker input bundles
  - free text/image object presets

### Phase 4. Timetable Semantic Presets

Goal: implement full-week composition presets first.

Implementation order:

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

Open decision to close before implementing `Weekly Memo`:

- Should memo text be a built-in week value or a preset-created global custom
  input?

Recommended first choice:

- Use a preset-created global custom input for memo content.
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

Reference note:

- v2 explored a full `7 days x 4 statuses = 28 asset slots` model. Template
  Studio should borrow the capability and state concepts, but should introduce
  the full 28-slot UI only after the simpler shared-asset flow is stable.

### Phase 6. Input Bundle Presets

Goal: support template-specific authoring patterns without turning them into
hard-coded semantic objects.

Tasks:

- [ ] Add `Sticker Select` input bundle preset.
- [ ] Allow preset to choose input scope, defaulting to `entry`.
- [ ] Create select input with stable option values.
- [ ] Optionally create bound text/image objects.
- [ ] Show unmapped select asset options in diagnostics or inspector.

Rules:

- Select bindings remain declarative.
- Select bindings must not mutate graph structure, schema, or timetable domain
  data at runtime.

### Phase 7. Inspector And Layer Polish

Goal: make the new concepts understandable in the editor.

Tasks:

- [ ] Group binding candidates by scope and built-in/custom source.
- [ ] Show consumers of each input.
- [ ] Add jump actions between inputs and consuming objects.
- [ ] Add diagnostics for hidden/unreachable graph nodes.
- [ ] Add clearer drop affordances for layer reparent/reorder.
- [ ] Consider layer-tree range selection.
- [ ] Consider auto-expanding collapsed groups during drag.

### Phase 8. Persistence Preparation

Goal: prepare for saving without touching production data yet.

Tasks:

- [ ] Define serialization boundary.
- [ ] Add local JSON export/import.
- [ ] Add versioned document migration helpers.
- [ ] Add stricter validation before export.
- [ ] Keep Supabase writes out of scope unless explicitly requested.

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
- `Shift/Cmd/Ctrl + click`: toggle selection.

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
