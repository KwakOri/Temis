# Template Studio Fixed Two-Slot Multi Variant Plan

## Scope

This plan covers:

- `/admin/template-studio/[templateId]/edit`
- `/admin/template-studio/[templateId]/preview`
- Cards authoring, timetable runtime rendering, JSON import/export, draft save,
  and publish validation.

It replaces automatic entry-count-based card splitting with an authored,
fixed-two-slot Multi variant.

## Product Contract

### Shared component frame

Every timetable entry component owns one shared frame:

```ts
interface StudioTimetableComponentFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}
```

The frame is the authoritative day-card outer geometry for every status. Status
variant roots render inside it. Switching between `online`, `offline`, `multi`,
and `offlineMemo` must not change day coordinates, neighboring-day coordinates,
or full timetable bounds.

Variant roots must match the shared frame. Root geometry edits update the shared
frame and every direct variant root together; status-local editing must not
silently create a different outer size.

### Entry Group contract

Entry-scoped objects live under explicit Entry Group nodes. The group declares
which runtime entry it consumes:

```ts
interface StudioEntrySlotMeta {
  index: 0 | 1;
}
```

Expected variant structure:

```text
Shared component frame
└─ selected status variant root
   ├─ day/status objects
   ├─ Entry Group 1 (entry index 0)
   │  ├─ entry.main_title
   │  ├─ entry.sub_title
   │  └─ entry.time
   └─ Entry Group 2 (entry index 1, Multi only)
      ├─ entry.main_title
      ├─ entry.sub_title
      └─ entry.time
```

`day.*`, global input, shared background, and other day-level objects remain
outside Entry Groups so they render once.

### Status slot counts

- `online`: exactly one Entry Group using index `0`.
- `offline`: exactly one Entry Group using index `0`.
- `offlineMemo`: exactly one Entry Group using index `0`.
- `multi`: exactly two Entry Groups using indexes `0` and `1`.

Multi is a fixed two-entry layout. It is not a configurable `N`-entry layout.
The effective entry limit is `1` when Multi is disabled and `2` when it is
enabled. `maxEntriesPerDay` is retained only as a migration input and is
normalized to this fixed contract.

### Runtime state transition

For the current runtime value shape:

- one entry uses its single-entry status;
- adding a second entry selects the Multi layout and normalizes both stored
  entry statuses to `multi`;
- removing one of two entries normalizes the remaining entry to `online`;
- a day with two entries always resolves the Multi component variant;
- a day must never contain more than two entries.

Status remains stored on entries during this implementation to keep persisted
runtime compatibility. Variant selection is resolved once per day. A later
schema can move status ownership to an explicit day-card state if product needs
more combinations such as offline multi-session cards.

## Rendering Contract

`StudioTimetablePreview` renders one component variant per day.

It must not:

- map entries to repeated full card roots;
- calculate runtime entry-slot heights;
- use entry-count-based `scaleX` or `scaleY` transforms;
- use `entryGap` to allocate runtime card geometry.

`StudioRenderer` must propagate runtime context recursively. On an Entry Group,
it replaces the inherited `entryIndex` with the group's fixed slot index. This
allows one Multi root to resolve entry 0 and entry 1 simultaneously.

The Cards authoring canvas uses two preview entries while the Multi status tab
is active so both groups show distinct built-in and custom entry values.

## Editor Contract

- Cards continues to expose capability-filtered status tabs.
- Multi shows two editable Entry Groups in Layers and on canvas.
- Other statuses show one Entry Group.
- Entry Groups are required structural nodes and cannot be deleted, ungrouped,
  or assigned duplicate slot indexes.
- Objects inside an Entry Group remain normally editable.
- Creating a Multi variant from fallback creates slot 0 and slot 1.
- Creating a single-entry variant creates or preserves only slot 0.
- The Multi entry-count selector and generated slot guide are removed.
- Add Entry is disabled after two entries.

The initial Multi variant may derive a compact two-group arrangement from the
single-entry fallback once. After creation, all group positions and child
positions are ordinary authored graph styles; runtime rendering does not
recalculate them.

## Document Migration

The structural contract requires document version `2`.

Version-1 to version-2 migration:

1. Resolve the component frame from the default variant root.
2. Normalize every direct variant root to the shared frame.
3. Find top-level variant children that consume entry-scoped built-ins or custom
   inputs.
4. Move those children under Entry Group 1 with slot index `0`.
5. For an existing direct Multi variant, create Entry Group 2 with slot index
   `1` when missing.
6. Preserve day/global objects outside Entry Groups.
7. Normalize the configured maximum to two.
8. Preserve runtime data; do not silently truncate more than two entries.

Migration must be idempotent. Documents already using Entry Groups must not be
wrapped again.

## Validation

Blocking diagnostics:

- missing or invalid shared component frame;
- variant root missing or outside the component graph;
- direct variant root geometry differs from the shared frame;
- missing required Entry Group;
- duplicate or out-of-range entry slot index;
- Multi variant without exactly slots `0` and `1`;
- single-entry variant containing slot `1`;
- Entry Group referenced outside its variant subtree;
- runtime day with more than two entries;
- runtime day with multiple entries while Multi is disabled.

Entry Group overlap is not a blocking error because overlap may be intentional.
An editor warning may be added later.

## Implementation Phases

### Phase 1: Types, migration, and utilities

- Add shared component frame and Entry Group metadata types.
- Add pure helpers for frame resolution, variant slot discovery, and day-level
  variant status resolution.
- Upgrade document migration to version 2.
- Migrate sample and preset-created card structures.
- Update variant cloning for one-slot and fixed-two-slot targets.

### Phase 2: Context-aware renderer

- Make `StudioRenderer` resolve children with inherited node context.
- Override `entryIndex` at Entry Group boundaries.
- Add focused binding tests for slot 0 and slot 1.

### Phase 3: One-variant-per-day runtime

- Remove entry-count slot allocation and repeated full-root rendering.
- Resolve the status variant once for each day.
- Render it in the shared component frame without non-uniform scaling.
- Keep day and timetable bounds based only on the shared frame.

### Phase 4: Cards authoring

- Show both Entry Groups when Multi is selected.
- Supply two-entry authoring runtime values for Multi.
- Remove preview-count and generated-slot controls.
- Protect required Entry Groups and variant roots from destructive operations.
- Keep root frame geometry synchronized across variants.

### Phase 5: Runtime policy and persistence validation

- Fix the maximum to two.
- Keep Add Entry and capability-disable guards synchronized.
- Add document/runtime cross-validation before import, draft save, and publish.
- Reject invalid runtime entry counts and unavailable stored statuses.

## Automated Verification

Pure and renderer checks:

- every status resolves the same component frame;
- switching status does not change a day outer bound;
- changing one day's entry count does not move another day;
- Online, Offline, and Offline Memo resolve slot 0 only;
- Multi resolves slots 0 and 1 exactly once;
- slot 0 renders entry 0 values and slot 1 renders entry 1 values;
- day-level bindings render once in Multi;
- runtime rendering contains no entry-count scale transform;
- Add Entry stops at two;
- Multi-disabled Add Entry stops at one;
- version-1 migration creates the required groups and is idempotent;
- invalid version-2 group contracts produce blocking diagnostics;
- variant cloning does not share mutable node or style records.

Browser checks:

1. Enable Multi and create/open the Multi Cards variant.
2. Confirm two Entry Groups are independently selectable and editable.
3. Add a second Monday entry and confirm the Multi root renders once.
4. Confirm Monday's day label/background render once.
5. Confirm Tuesday and full timetable positions do not move.
6. Confirm no third entry can be added.
7. Save, reload, open saved preview, and compare the layout.
8. Disable attempts remain blocked until every day has one entry.

## Exit Criteria

- Multi is an authored fixed-two-entry variant.
- All statuses share one component frame.
- Entry-scoped objects live in explicit runtime-context Entry Groups.
- Runtime renders one variant per day without automatic height splitting or
  non-uniform component scaling.
- Editor, import, draft, publish, and preview enforce the same two-entry policy.
- TypeScript, ESLint, focused checks, and browser regression scenarios pass.

## Implementation Status

Implemented on 2026-07-12:

- [x] Document version 2 and version-1 migration
- [x] Shared component frame contract and synchronized variant root geometry
- [x] Explicit Entry Group slot metadata and recursive runtime context
- [x] Online/Offline/Offline Memo one-slot validation
- [x] Multi fixed slot 0/1 creation through variant cloning
- [x] One component-variant render per day
- [x] Removal of runtime entry-height allocation and full-card scaling
- [x] Fixed effective maximum of two entries
- [x] Destructive edit guards for variant roots and Entry Groups
- [x] Document/runtime cross-validation for import, export, draft, and publish
- [x] Focused migration, layout, runtime, clone, and static renderer checks
- [ ] Saved remote-template browser regression; local execution currently requires
      a `SUPABASE_SECRET_KEY` that is not present in the development shell
