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

- [ ] Semantic exception object model does not exist yet.
- [ ] Timetable presets are still mostly simple text composition objects.
- [ ] `Week Dates` is static text instead of a built-in date range binding.
- [ ] `Weekly Memo` data ownership is still open.
- [ ] `Profile Block` is not implemented as a Timetable-only preset.
- [ ] `Artist / Profile Text` is not implemented as an independent preset.
- [ ] `Top Object` is not implemented as a semantic preset.
- [ ] `Status Card Background` is not implemented as a Cards semantic preset.
- [ ] `multi` and `offline_memo` are not capability-gated.
- [ ] Timetable preview still injects hidden day-card header/meta UI.
- [ ] Sample document still places profile image in the Cards graph.
- [ ] JSON import/export and persistence preparation are not implemented.

## Non-Negotiable Rules

- [ ] Do not attempt broad migration from existing hard-coded timetable folders.
- [ ] Keep Template Studio as a separate domain.
- [ ] Keep node ids and input ids opaque.
- [ ] Do not introduce fixed semantic node ids.
- [ ] Keep built-in timetable values out of `document.inputs`.
- [ ] Keep custom template-specific values in `document.inputs`.
- [ ] Keep select bindings declarative; they must not mutate graph, schema, or
      timetable domain data at runtime.
- [ ] Keep `Profile Block` Timetable-only.
- [ ] Keep `Artist / Profile Text` independent from `Profile Block`.
- [ ] Keep `multi` and `offline_memo` disabled by default until explicitly
      enabled by template capability settings.

## Phase 0. Baseline Cleanup

Goal: remove stale prototype labels and make the current baseline honest before
new model work begins.

- [ ] Replace visible `Milestone A` editor copy with a neutral current label.
- [ ] Check sample metadata and update stale milestone descriptions.
- [ ] Add a short comment or doc note for the current document version
      assumptions.
- [ ] Confirm old Template Studio docs are removed and only the integrated plan
      plus this checklist remain.
- [ ] Run formatting on changed docs.

Exit criteria:

- [ ] No user-facing UI still implies the editor is only Milestone A.
- [ ] Docs and UI describe the current Cards/Timetable split accurately.

## Phase 1. Domain Model Stabilization

Goal: add missing contracts before implementing more presets.

### 1.1 Capabilities

- [ ] Add `StudioTimetableCapabilities`.
- [ ] Add `multi.enabled`.
- [ ] Add `offlineMemo.enabled`.
- [ ] Add default capability initialization for new documents.
- [ ] Add normalization for documents missing capabilities.
- [ ] Update sample document to include capabilities with both disabled by
      default.
- [ ] Hide `multi` status controls unless `multi.enabled` is true.
- [ ] Hide `offlineMemo` status controls unless `offlineMemo.enabled` is true.
- [ ] Hide capability-gated built-in fields when the capability is disabled.
- [ ] Add validator warnings/errors for capability-gated statuses that appear
      while disabled.

### 1.2 Built-In Fields

- [ ] Decide canonical id for user-mentioned `time.day`.
- [ ] Keep `day.label` as canonical day label id unless a stronger reason
      appears.
- [ ] Add `day.date`.
- [ ] Add `week.date_range`.
- [ ] Add `week.start_date`.
- [ ] Add `week.end_date`.
- [ ] Add `entry.is_multi`.
- [ ] Add `entry.is_offline_memo`.
- [ ] Add resolver support for new built-in fields.
- [ ] Add compatibility rules for new built-in fields.
- [ ] Add validator support for new built-in fields.

### 1.3 Exception Object Contract

- [ ] Add semantic preset scope type: `cards | timetable`.
- [ ] Add semantic key type:
  - [ ] `weekDates`
  - [ ] `weeklyMemo`
  - [ ] `profileBlock`
  - [ ] `artistProfileText`
  - [ ] `topObject`
  - [ ] `dayLabel`
  - [ ] `dayDate`
  - [ ] `entryStatusLabel`
  - [ ] `statusCardBackground`
- [ ] Add exception object metadata contract.
- [ ] Add `lockedStructure`.
- [ ] Add `singleton`.
- [ ] Add `editableSlots`.
- [ ] Add `builtInBindings`.
- [ ] Add `capabilityFlags`.
- [ ] Add validator checks for malformed exception metadata.
- [ ] Add default/migration helpers for old simple timetable objects.

Exit criteria:

- [ ] TypeScript can represent every planned semantic preset.
- [ ] Existing sample document validates.
- [ ] Optional capabilities default to disabled.
- [ ] No new preset needs to overload plain text object fields.

Verification:

- [ ] `npx tsc --noEmit --pretty false --incremental false`
- [ ] ESLint changed Template Studio files.
- [ ] Browser smoke test `/template-studio`.

## Phase 2. Generated Card Fidelity

Goal: Timetable generated cards must render only what is authored in Cards plus
explicit Timetable composition objects.

- [ ] Remove hidden day-card header UI from `StudioTimetablePreview`.
- [ ] Remove hidden entry meta UI from generated card internals.
- [ ] Keep generated day-card container selection/movement intact.
- [ ] Ensure generated cards still receive `dayId`.
- [ ] Ensure generated entries still receive `entryIndex`.
- [ ] Add Cards preset/object template for `Day Label`.
- [ ] Add Cards preset/object template for `Day Date`.
- [ ] Add Cards preset/object template for `Entry Status Label`.
- [ ] Bind sample card day label to built-in day context if the visual should
      remain visible.
- [ ] Bind sample card entry/status label to built-in entry context if the
      visual should remain visible.
- [ ] Remove or relocate sample Cards `Profile Image` according to the
      Timetable-only `Profile Block` rule.

Exit criteria:

- [ ] Timetable preview does not create hidden card-internal text or headers.
- [ ] Any visible day/entry label can be found in Cards or Timetable layers.
- [ ] Generated cards preserve the Cards source layout.

Verification:

- [ ] Cards view renders expected source card.
- [ ] Timetable view renders seven generated containers.
- [ ] Switching Cards/Timetable does not change source card layout.
- [ ] Day/entry scoped values resolve correctly.

## Phase 3. Preset Registry

Goal: replace ad hoc preset definitions with one registry.

- [ ] Create a Template Studio preset registry module.
- [ ] Move current Timetable preset definitions out of
      `template-studio-client.tsx`.
- [ ] Add preset category: `semanticException`.
- [ ] Add preset category: `inputBundle`.
- [ ] Add preset category: `freeObject`.
- [ ] Support Cards presets.
- [ ] Support Timetable presets.
- [ ] Add required capability metadata.
- [ ] Add singleton metadata.
- [ ] Add repeatable preset id generation.
- [ ] Add duplicate handling for singleton presets.
- [ ] Add disabled UI state for presets blocked by missing capabilities.
- [ ] Add empty state for preset groups.

Initial singleton policy:

- [ ] `dayCards` is singleton.
- [ ] `weekDates` is singleton.
- [ ] `profileBlock` is singleton.
- [ ] `artistProfileText` is singleton.
- [ ] `topObject` is singleton.
- [ ] Decide whether `weeklyMemo` is singleton for the first implementation.

Exit criteria:

- [ ] Adding a preset goes through the registry.
- [ ] Singleton presets select existing objects instead of duplicating them.
- [ ] Repeatable presets still create unique ids.

Verification:

- [ ] Presets panel still renders.
- [ ] Existing `Week Dates` and `Weekly Memo` insertion behavior still works or
      is intentionally updated.
- [ ] No client-local preset arrays remain for core presets.

## Phase 4. Timetable Semantic Presets

Goal: implement full-week composition presets first.

### 4.1 Week Dates

- [ ] Convert `Week Dates` from static text to semantic exception object.
- [ ] Bind to `week.date_range`.
- [ ] Add formatting settings:
  - [ ] `2026.07.01 - 07.07`
  - [ ] `07.01 - 07.07`
  - [ ] localized month/date labels
  - [ ] split start/end layout support or a clear future placeholder
- [ ] Keep Timetable-only scope.
- [ ] Make it selectable from canvas and layer tree.
- [ ] Expose position/size/typography controls.

### 4.2 Weekly Memo

- [ ] Close data ownership decision.
- [ ] Implement recommended first path: preset-created global custom input.
- [ ] Create or link memo content input when preset is inserted.
- [ ] Add multiline text support.
- [ ] Add placeholder setting.
- [ ] Add optional background asset slot.
- [ ] Add visibility setting.
- [ ] Keep Timetable-only scope.

### 4.3 Profile Block

- [ ] Implement Timetable-only `Profile Block`.
- [ ] Remove dependency on Cards profile image node for the default sample.
- [ ] Add profile image slot.
- [ ] Add frame slot.
- [ ] Add mask/fit controls.
- [ ] Add placeholder behavior.
- [ ] Add optional user-replaceable image input creation.
- [ ] Show as one layer-tree object by default.
- [ ] Expose slot settings in inspector.

### 4.4 Artist / Profile Text

- [ ] Implement as independent Timetable-only semantic preset.
- [ ] Do not merge into `Profile Block`.
- [ ] Support text-only mode.
- [ ] Support text-with-asset mode.
- [ ] Support stateful on/off asset mode when needed.
- [ ] Add text style controls.
- [ ] Decide whether first implementation uses built-in value or custom input.

### 4.5 Top Object

- [ ] Implement Timetable-only semantic preset.
- [ ] Use template asset slot by default.
- [ ] Add optional user-replaceable image input creation.
- [ ] Add fit/position/size controls.
- [ ] Show as one layer-tree object.

Exit criteria:

- [ ] All Timetable semantic presets appear in Timetable layers.
- [ ] All Timetable semantic presets can be selected from canvas.
- [ ] All Timetable semantic presets expose appropriate inspector settings.
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

- [ ] Implement `Day Label` Cards preset.
- [ ] Implement `Day Date` Cards preset.
- [ ] Implement `Entry Status Label` Cards preset.
- [ ] Bind each preset to built-in fields.
- [ ] Add basic typography and layout controls.
- [ ] Confirm generated cards resolve values per day/entry.

### 5.2 Status Card Background

- [ ] Implement `Status Card Background` as Cards semantic preset.
- [ ] Support `online` asset slot.
- [ ] Support `offline` asset slot.
- [ ] Add `multi` slot only when capability is enabled.
- [ ] Add `offlineMemo` slot only when capability is enabled.
- [ ] Support shared assets first.
- [ ] Add day-specific asset slots later only after shared flow is stable.
- [ ] Add status fallback behavior to preview.
- [ ] Add diagnostics for missing required base status assets.

Exit criteria:

- [ ] Cards can author day/entry labels that render correctly in Timetable.
- [ ] Cards can author base status backgrounds.
- [ ] Capability-gated status slots are hidden until enabled.

Verification:

- [ ] Add each Cards preset.
- [ ] Switch selected day and confirm day-specific text changes.
- [ ] Switch entry status and confirm status label/background changes.
- [ ] Confirm Timetable still exposes only generated containers, not internals.

## Phase 6. Input Bundle Presets

Goal: make template-specific optional features easy to add.

### Sticker Select

- [ ] Implement `Sticker Select` input bundle preset.
- [ ] Default scope to `entry`.
- [ ] Allow scope override before or after insertion.
- [ ] Create select input with stable option values.
- [ ] Create default options.
- [ ] Optionally create bound text object.
- [ ] Optionally create bound image object with select-asset mapping.
- [ ] Add unmapped option diagnostics.
- [ ] Add quick jump from input to consuming object.
- [ ] Add quick jump from object to input.

Exit criteria:

- [ ] Sticker select can be added without hand-building input schema.
- [ ] Sticker select remains a flexible input bundle, not a fixed semantic
      exception object.

Verification:

- [ ] Add preset.
- [ ] Edit options.
- [ ] Bind to label.
- [ ] Bind to image mapping.
- [ ] Confirm runtime preview updates.

## Phase 7. Inspector And Layer Polish

Goal: make the expanded model practical to use.

- [ ] Group binding candidates by built-in/custom source.
- [ ] Group binding candidates by scope.
- [ ] Show active scope in binding dropdown rows.
- [ ] Show input consumers.
- [ ] Warn when an input has no consumers.
- [ ] Warn when input scope is incompatible with current preview context.
- [ ] Add jump from input to consuming objects.
- [ ] Add jump from bound object to input.
- [ ] Add diagnostics for hidden graph nodes.
- [ ] Add diagnostics for unreachable graph nodes.
- [ ] Improve drop affordance for above/below/inside.
- [ ] Consider auto-expanding collapsed groups during drag.
- [ ] Consider layer-tree range selection.

Exit criteria:

- [ ] Users can understand where a value comes from.
- [ ] Users can find objects consuming each input.
- [ ] Layer movement remains predictable.

## Phase 8. Persistence Preparation

Goal: prepare the editor data shape for saving without writing to production.

- [ ] Define serialization boundary.
- [ ] Add local JSON export.
- [ ] Add local JSON import.
- [ ] Add document version migration helper.
- [ ] Add strict validation before export.
- [ ] Add diagnostics summary before export.
- [ ] Keep Supabase writes out of scope unless explicitly requested.

Exit criteria:

- [ ] A Template Studio document can round-trip through JSON locally.
- [ ] Invalid documents are blocked or clearly warned before export.

Verification:

- [ ] Export sample document.
- [ ] Import exported document.
- [ ] Compare rendered Cards view.
- [ ] Compare rendered Timetable view.

## Per-Phase Verification Checklist

Run after any implementation phase:

- [ ] `npx tsc --noEmit --pretty false --incremental false`
- [ ] ESLint changed Template Studio files.
- [ ] Browser smoke test `/template-studio`.
- [ ] Confirm Cards layer tree edits source card objects.
- [ ] Confirm Timetable layer tree edits only composition objects and generated
      day-card containers.
- [ ] Confirm day-scoped values do not leak across days.
- [ ] Confirm entry-scoped values do not leak across entries.
- [ ] Confirm validator has no new false positives for the sample document.
- [ ] Confirm local draft save still works.

## Open Decisions

- [ ] Should `Weekly Memo` content be a built-in week value or a preset-created
      global custom input?
- [ ] Should `weeklyMemo` be singleton in the first implementation?
- [ ] Should Timetable-level external day headings be implemented in the same
      pass as Cards `Day Label`, or deferred?
- [ ] Which profile/artist text value should `Artist / Profile Text` bind to by
      default?
- [ ] When should the full `7 days x 4 statuses = 28 asset slots` UI be
      introduced?

## Done Definition For This Roadmap

- [ ] Current UI no longer contains stale milestone labeling.
- [ ] Capability-gated optional statuses are explicit and disabled by default.
- [ ] Generated Timetable cards are faithful renderings of Cards source graph.
- [ ] Semantic preset registry exists.
- [ ] Timetable semantic presets exist for:
  - [ ] `Week Dates`
  - [ ] `Weekly Memo`
  - [ ] `Profile Block`
  - [ ] `Artist / Profile Text`
  - [ ] `Top Object`
- [ ] Cards semantic presets exist for:
  - [ ] `Day Label`
  - [ ] `Day Date`
  - [ ] `Entry Status Label`
  - [ ] `Status Card Background`
- [ ] `Sticker Select` input bundle preset exists.
- [ ] Inspector and layer tree can explain semantic presets and input bindings.
- [ ] Local JSON import/export exists.
- [ ] Typecheck, lint, and browser smoke checks pass.
