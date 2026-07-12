# Template Studio Day Component Sets Plan

## Scope

This plan covers Template Studio card-set authoring and per-day assignment for:

- `/admin/template-studio/[templateId]/edit`
- `/admin/template-studio/[templateId]/preview`
- timetable card geometry, JSON import/export, draft persistence, publish
  validation, and document migration

It extends the current single entry component into multiple authorable component
sets. Each day can select one set while runtime status continues to select one
of that set's Online, Offline, Multi, or Offline Memo variants.

## Existing Foundation

`StudioTimetableComponentDefinition` already represents the required component
set concept:

```text
Component Set
├─ Online variant
├─ Offline variant
├─ Multi variant
└─ Offline Memo variant
```

The implementation should not add a second `componentSets` collection. The
existing `timetable.components` record remains authoritative, while the editor
uses the product label `Component Set`.

The current `entryComponentId` remains the default set. Existing documents and
days without an explicit assignment continue to use it.

## Product Contract

### Per-day component-set assignment

Add an optional component reference to each timetable day:

```ts
interface StudioTimetableDayDefinition {
  id: StudioTimetableDayId;
  label: string;
  shortLabel?: string;
  date?: string;
  order: number;
  componentId?: StudioTimetableComponentId;
}
```

Resolution is deterministic:

```text
day.componentId
→ timetable.entryComponentId
→ first valid component only as invalid-document runtime safety
```

Runtime values do not store the assignment. Component-set selection is template
authoring data, not an end-user preview input.

Example:

```ts
components: {
  set1: { id: "set1", label: "Set 1", frame: { /* ... */ }, variants: {} },
  set2: { id: "set2", label: "Set 2", frame: { /* ... */ }, variants: {} },
  set3: { id: "set3", label: "Set 3", frame: { /* ... */ }, variants: {} },
},
days: {
  mon: { id: "mon", label: "Monday", order: 0, componentId: "set1" },
  tue: { id: "tue", label: "Tuesday", order: 1, componentId: "set2" },
},
entryComponentId: "set1",
```

### Status resolution remains independent

Set selection and status selection are separate axes:

```text
day id → component set
runtime day state → status id
(component set, status id) → authored variant root
```

Adding a second Online entry continues to resolve Multi. Offline Memo continues
to resolve from the day-level memo toggle. Neither transition changes the
assigned set.

Every set must own independent direct variants for every available status. The
existing fallback resolver remains invalid-document runtime safety only.

### Shared frame inside one set

Each component set owns one outer frame shared by its status variants. Different
sets may own different frames:

```text
Set 1 frame: 780 × 120
Set 2 frame: 620 × 160
Set 3 frame: 900 × 96
```

Online, Offline, Multi, and Offline Memo within Set 1 all use Set 1's frame.
Their internal object sizes and positions remain independently authorable.

This preserves the existing invariant that a runtime status change does not
change the outer card size or reflow neighboring days. Per-status outer frames
are explicitly out of scope for the first implementation.

## Runtime and Geometry

### Shared resolver

Add pure helpers used by editor, runtime preview, geometry, and validation:

```ts
getStudioTimetableDayComponentId(timetable, dayId)
getStudioTimetableDayComponent(document, dayId)
getStudioTimetableDayComponentFrame(document, dayId)
```

No caller should directly read `timetable.components[timetable.entryComponentId]`
when rendering or measuring a specific day.

### Variable-size grid contract

The current layout receives one global entry-card size. Replace it with a
per-day size resolver.

For every grid layout:

- each day keeps the width and height of its assigned component set;
- each grid column width is the maximum card width assigned to that column;
- each grid row height is the maximum card height assigned to that row;
- column and row origins use prefix sums plus configured gaps;
- `dayOffsets` apply after the base grid origin;
- timetable bounds are the union of the resolved day geometries;
- explicit `slots`, fill order, and last-row alignment keep their current
  semantics.

This supports `1x7`, `7x1`, `4x2`, `3x3`, and custom layouts without overlap
when sets have different dimensions.

### Rendering

For each day, `StudioTimetablePreview` must:

1. resolve the assigned component set;
2. resolve the day's runtime status;
3. resolve the direct status variant within that set;
4. use the set frame for day geometry and clipping;
5. render the selected root once with that day's runtime context.

Missing assignments fall back to `entryComponentId` and emit diagnostics.
Rendering must never silently switch an assigned day to another valid set when
the assignment exists but is broken.

## Authoring Contract

### Cards workspace

Add a component-set toolbar above the existing status tabs:

```text
Component Set [ Set 1 ▾ ] [Duplicate] [Rename] [Delete]
[Online] [Offline] [Multi] [Offline Memo]
```

The status tabs edit only the selected set. Changing sets preserves the selected
status when that status is available and selects the resolved variant root.

Set creation uses deep duplication of an existing set:

- create a new component ID and label;
- clone every direct status subtree;
- clone every mutable style record;
- preserve bindings, semantic metadata, `variantSyncKey`, asset slots, and Entry
  Group slot indexes;
- keep roots independent from the source set;
- copy the source shared frame as the new set's initial frame.

The first implementation does not create an empty set because repairing four
required status contracts is less predictable than duplication.

### Timetable workspace

Selecting `day-card:<dayId>` exposes a `Component Set` inspector section with a
select control. Changing it updates `day.componentId` in one undo/redo history
entry and immediately recalculates timetable geometry.

The day card layer label may include the assigned set as secondary metadata,
but the layer identity remains `day-card:<dayId>`.

### Rename and delete rules

- Renaming changes only `component.label`, never its ID.
- The default set may be renamed but not deleted while it is
  `entryComponentId`.
- An assigned set cannot be deleted until affected days are reassigned.
- Deleting an unused set removes every owned variant subtree and unreferenced
  style records in one history entry.
- Shared assets and inputs are not deleted with a set.

Cross-status style propagation remains scoped to the selected set. Cross-set
propagation is out of scope and can be added later as an explicit operation.

## Document Migration

Raise the document version from `3` to `4` and the timetable domain version
from `1` to `2`.

Version-3 migration:

1. Preserve the existing `components` record and `entryComponentId`.
2. Leave every `day.componentId` undefined so all days resolve to the existing
   default component.
3. Preserve all component frames, variant roots, bindings, assets, inputs,
   runtime values, and day offsets.
4. Normalize invalid legacy component references only through diagnostics; do
   not guess destructive reassignment during migration.

Migration is idempotent and must render existing documents without geometry or
visual changes.

## Validation

Add blocking diagnostics for:

- missing default `entryComponentId`;
- a day referencing a missing component set;
- a referenced set missing Online or Offline;
- an enabled capability missing Multi or Offline Memo in any referenced set;
- shared variant roots within or across sets;
- invalid set frame or roots that differ from the shared set frame;
- Multi variants without exactly Entry Group slots `0` and `1`;
- single-entry variants without exactly slot `0`;
- Offline Memo variants without `day.offline_memo` text;
- deleting a default or assigned set.

Add non-blocking diagnostics for unused component sets.

## Implementation Phases

### Phase 1: model, migration, and pure helpers

- Add `day.componentId`, document version 4, and timetable domain version 2.
- Add day-component resolution helpers with explicit fallback metadata.
- Extend migration and validation.
- Add clone/delete component-set graph utilities.

### Phase 2: variable-size geometry and runtime rendering

- Replace the global entry-card size with per-day size resolution.
- Update column-width, row-height, bounds, and fallback geometry calculations.
- Render each day with its assigned set and status variant.
- Update timetable layer drag/position helpers that currently measure the
  default component only.

### Phase 3: Cards set management

- Add selected component-set editor state.
- Add set selector, duplicate, rename, and guarded delete actions.
- Scope status tabs, authoring root, style propagation, and frame editing to the
  selected set.

### Phase 4: day assignment UI

- Add Component Set inspector controls for selected day cards.
- Show assigned-set metadata in the layer list.
- Recalculate preview geometry immediately after reassignment.

### Phase 5: persistence and regression

- Extend focused model, migration, validator, layout, renderer, and persistence
  checks.
- Verify JSON import/export, draft save/reload, publish, and saved preview.
- Run browser scenarios for mixed sets and all four statuses.

## Automated Verification

Pure checks:

- version-3 documents migrate to version 4 with identical rendering;
- missing day assignments resolve the default set;
- explicit assignments resolve the requested set;
- broken explicit assignments produce blocking diagnostics;
- duplicating a set shares no mutable node or style IDs;
- every duplicated status preserves Entry Group and binding contracts;
- deleting default or assigned sets is rejected;
- mixed-width columns and mixed-height rows do not overlap;
- timetable bounds contain every mixed-size day card;
- runtime status changes preserve the assigned set and outer frame;
- Multi and Offline Memo resolve inside every assigned set.

Browser checks:

1. Duplicate the default set twice and rename them Set 2 and Set 3.
2. Edit the three shared frames to visibly different sizes.
3. Assign Monday to Set 1, Tuesday to Set 2, and Wednesday to Set 3.
4. Confirm all remaining days use the default set.
5. Switch each assigned day through Online, Offline, Multi, and Offline Memo.
6. Confirm status changes never switch sets or reflow because of a status-local
   frame change.
7. Confirm mixed set sizes do not overlap in `1x7`, `7x1`, and `4x2` layouts.
8. Save, reload, export/import, publish, and compare assignments and geometry.

## Exit Criteria

- One template can author multiple independent component sets.
- Every set owns complete independent status variants.
- Every day can select a set and safely fall back to the default when omitted.
- Different set frames render and lay out without overlap.
- Status changes preserve the selected set and its shared outer frame.
- Set duplication and deletion preserve graph, binding, asset, and history
  integrity.
- Existing version-3 templates migrate without visual changes.
- Editor, runtime, validation, persistence, and saved preview enforce the same
  assignment contract.

## Implementation Status

- [ ] Phase 1: model, migration, validation, and pure helpers
- [ ] Phase 2: variable-size geometry and assigned-set rendering
- [ ] Phase 3: Cards component-set management
- [ ] Phase 4: per-day assignment UI
- [ ] Phase 5: persistence and browser regression
