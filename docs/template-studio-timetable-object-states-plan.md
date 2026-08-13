# Template Studio Timetable Object States Plan

## Goal

Template Studio Timetable objects need two structural improvements:

1. Deletion commands must respect the active workspace. Timetable object
   selection should not call the Cards graph deletion path.
2. Timetable semantic objects such as `Artist`, `Weekly Memo`, and `Top Object`
   need object-level state variants so each runtime state can have an
   independently authored object subtree.

## Current Findings

- `Backspace` and `Delete` currently call the Cards `deleteSelectedNode`
  handler even when the active selection is a Timetable composition object.
- The Cards deletion guard can therefore show `Last root object is locked`
  while the user is trying to remove a Timetable object.
- Timetable composition already has a separate object tree:
  `rootObjectIds`, `objects`, `parentId`, and `childIds`.
- `Day Card Containers` is the only Timetable root object that should be
  structurally protected from deletion.
- Existing Timetable capability toggles (`multi`, `offlineMemo`) are runtime
  entry status feature flags. They are not the right model for object-level
  layout variants.
- The older v2 editor already has a useful precedent for state-specific
  authoring with `on` and `off` states.

## Deletion Plan

### Active Command Router

Introduce a single active-workspace command dispatcher for global keyboard
shortcuts:

- Cards mode: route `Backspace` and `Delete` to the existing Cards graph
  deletion handler.
- Timetable mode: route `Backspace` and `Delete` to a new Timetable composition
  deletion handler.

This keeps keyboard behavior aligned with the selected workspace and prevents
Cards-only validation from leaking into Timetable edits.

### Timetable Delete Policy

Add a Timetable delete helper with these rules:

- `day-cards` cannot be deleted.
- Generated `day-card:*` virtual layers cannot be deleted.
- Any other Timetable composition object can be deleted, including semantic
  presets and child objects.
- Deleting a parent deletes its full child subtree.
- Parent `childIds` and composition `rootObjectIds` must be cleaned up.
- Selection should move to the nearest surviving parent, then `day-cards` as a
  fallback.
- Singleton preset availability should recover after the singleton object is
  deleted.

## Object State Variant Plan

### Model

Add a generic object-level variant model to Timetable composition objects. The
model should not be hardcoded to `Artist`, `Weekly Memo`, or `Top Object`.

Conceptual shape:

```ts
interface StudioTimetableObjectVariantSet {
  inputId?: string;
  defaultValue: string;
  activeValue?: string;
  rootByValue: Record<string, StudioTimetableCompositionObjectId>;
}
```

The variant owner is a group-like object. Each state points to a child subtree:

```txt
Artist
  ON  -> artist:on subtree
  OFF -> artist:off subtree
```

Only the active state subtree should render. The inactive state should remain
authorable through the inspector but hidden from normal preview/render output.

### Authoring UI

For a variant owner object:

- Show compact state tabs or segmented buttons in the inspector.
- Selecting a state changes the authoring target, not the runtime input value.
- The layer tree should make it clear which state is being edited.
- Runtime preview should still resolve the active state from the bound input or
  default value.

### Preset Migration

Update the relevant Timetable semantic presets:

- `Artist`: create a variant owner with separate `on` and `off` subtrees. The
  current artist background and text structure becomes the initial `on` state.
- `Weekly Memo`: use the same variant owner pattern, but preserve the existing
  flexible text object behavior.
- `Top Object`: use separate image object subtrees per state.

Existing plain objects should migrate conservatively:

- Existing object becomes the `on` state.
- `off` starts empty or hidden until the user authors it.

## Implementation Order

1. Add and verify the active workspace command router.
2. Add Timetable composition subtree deletion and selection fallback.
3. Extend Timetable composition types and normalization for object variants.
4. Add resolver helpers for active variant subtree ids.
5. Update Timetable rendering, picking, and layer tree traversal to use the
   resolved variant subtree.
6. Update `Artist`, `Weekly Memo`, and `Top Object` preset factories.
7. Add inspector controls for selecting the authoring state.
8. Add focused validation checks and scripts for deletion and variant rendering.

## Verification

- TypeScript check: `npx tsc --noEmit --pretty false --incremental false`
- Focused Template Studio scripts for:
  - Timetable delete behavior
  - Variant normalization/render traversal
- Browser smoke:
  - Delete non-Day Card Timetable objects with Backspace
  - Confirm `Day Card Containers` remains protected
  - Author separate `on` and `off` layouts for Artist/Weekly Memo/Top Object
  - Preview uses the runtime-selected state
