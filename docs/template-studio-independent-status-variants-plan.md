# Template Studio Independent Status Variants Plan

## Scope

This plan covers Template Studio status authoring for:

- `/admin/template-studio/[templateId]/edit`
- `/admin/template-studio/[templateId]/preview`
- JSON import/export, draft persistence, publish validation, and document
  migration

It replaces shared status roots and the `Make Layout Unique` workflow with
independent status variants plus an explicit, post-authoring style propagation
action.

## Problem

The current editor allows Online and Offline to reference the same root node.
Optional capabilities add only a status definition, so Multi falls back to the
Online root and Offline Memo falls back to the Offline root until the author
presses `Create Variant`.

This produces three authoring problems:

1. Editing one status may unexpectedly edit another status.
2. Authors must finish all shared styling before they know they need to split a
   layout.
3. Capability-specific structure is missing while a fallback is active:
   Multi has only one Entry Group and Offline Memo has no editable memo text.

## Product Contract

### Independent variants by default

Every available status owns a direct variant with a distinct root node and
distinct mutable style records.

```text
Entry Card Component
├─ Online variant      (independent root)
├─ Offline variant     (independent root)
├─ Multi variant       (independent root, when enabled)
└─ Offline Memo variant(independent root, when enabled)
```

No two status variants may reference the same root node. Normal editor state
must not depend on a fallback variant. Derived-status fallback remains a
runtime safety mechanism for unmigrated or invalid documents only.

The existing component frame remains shared and authoritative. Independent
variant roots must use the same `left`, `top`, `width`, and `height`, so status
changes never shift timetable geometry.

### Required status structure

| Status | Required authored structure |
| --- | --- |
| Online | One Entry Group at slot `0` |
| Offline | One Entry Group at slot `0` |
| Multi | Two Entry Groups at slots `0` and `1` |
| Offline Memo | One Entry Group at slot `0` plus an `offline_memo` text object |

Entry-scoped title, subtitle, time, and custom entry inputs remain inside Entry
Groups. Day/global objects and the Offline Memo text remain outside Entry
Groups and render once per day card.

### Offline Memo value

Offline Memo is a day/card value, matching the existing timetable runtime
semantics. Add a capability-gated built-in text field:

```ts
type StudioBuiltinFieldId =
  | "day.offline_memo"
  // existing fields...
```

Runtime values store the text by day without creating a template-defined
custom input:

```ts
interface StudioTimetableRuntimeValues {
  entriesByDay: Record<StudioTimetableDayId, StudioTimetableRuntimeEntry[]>;
  offlineMemoByDay?: Record<StudioTimetableDayId, string>;
}
```

The saved preview form shows the Offline Memo field only when the capability is
enabled and the selected day resolves to the Offline Memo status. Cards
authoring supplies a visible placeholder value while authoring that variant.

### Capability activation

Enabling an optional capability is the explicit point at which its independent
variant is created.

Multi activation:

1. Add/repair the Multi status definition.
2. Clone the Online variant into an independent Multi variant when missing.
3. Preserve the component frame.
4. Ensure exactly two Entry Groups with slot indexes `0` and `1`.

Offline Memo activation:

1. Add/repair the Offline Memo status definition.
2. Clone the Offline variant into an independent Offline Memo variant when
   missing.
3. Preserve the component frame and the single slot `0` Entry Group.
4. Ensure one text node bound to `day.offline_memo` exists outside the Entry
   Group. Prefer the cloned main-title geometry for its initial style without
   mutating the Offline source variant.

Disabling a capability hides its status but preserves its authored direct
variant so re-enabling does not destroy work. Multi disabling remains blocked
while any runtime day contains two entries.

### Remove split-before-edit UI

Remove:

- `This layout is shared with another status`
- `Make Layout Unique`
- normal `Using ... layout` / `Create Variant` authoring state

An enabled status missing its direct variant is a document contract error and
is repaired during migration or capability activation. Diagnostics may expose
a repair action later, but the normal editor must always open a direct variant.

## Cross-Status Style Propagation

### Stable counterpart identity

Cloned nodes have different IDs, and editable labels cannot be used for
matching. Add a stable logical counterpart key:

```ts
interface StudioGraphNodeMeta {
  variantSyncKey?: string;
  // existing metadata...
}
```

Cloning a variant preserves `variantSyncKey`. A node and its counterparts use
the same key in other statuses. Entry-slot context disambiguates repeated Multi
nodes:

```text
(variantSyncKey="entry.main_title", slot=0)
(variantSyncKey="entry.main_title", slot=1)
```

Online/Offline slot `0` maps directly to Multi slot `0`. Appearance and
typography propagation may optionally target every Multi slot with the same
sync key. Geometry propagation targets the matching slot only by default.

Newly inserted nodes receive a sync key immediately. If no counterpart exists
in a target status, the first implementation reports it as skipped; it does not
silently copy structure or bindings.

### Editor action

Replace the split action with `Apply style to other statuses...` in the right
inspector for an authored Cards object.

The action opens a small dialog with:

- target status checkboxes;
- style scopes: Position & Size, Typography, Appearance, or All Styles;
- current object only or include descendants;
- an optional `Apply appearance to both Multi entries` choice when relevant.

The default is Appearance + Typography for the current object. Position and
size are opt-in because Multi intentionally uses different slot geometry.

Style propagation must not change:

- node IDs or graph structure;
- text/static content;
- bindings or input IDs;
- asset slots or selected assets;
- Entry Group slot metadata;
- component frame ownership.

The operation is one undo/redo history entry and reports applied and skipped
status counts.

## Document Migration

Raise the document version from `2` to `3` because independent roots and sync
keys are structural authoring contracts.

Version 1/2 migration is idempotent:

1. Run the existing frame and Entry Group migration.
2. Assign stable sync keys to the canonical Online subtree.
3. If Online and Offline share a root, clone Offline and preserve the assigned
   keys. If they are already independent, preserve both and assign conservative
   keys only to unambiguous semantic/built-in counterparts.
4. Ensure enabled Multi and Offline Memo capabilities own direct variants.
5. Ensure the Multi two-slot contract.
6. Ensure the Offline Memo text binding.
7. Normalize every direct root to the shared component frame.
8. Preserve existing authored direct variants, runtime values, bindings, and
   assets.

Repeated migration must not create additional roots, Entry Groups, sync keys,
or Offline Memo nodes.

## Validation

Add blocking diagnostics for:

- two direct status variants sharing one root;
- an enabled capability missing its direct variant;
- missing or duplicate sync keys where a clone contract requires them;
- Multi without exactly slots `0` and `1`;
- Offline Memo without exactly slot `0`;
- Offline Memo without a `day.offline_memo` bound text node;
- variant root geometry that differs from the shared frame.

Keep fallback resolution for safe runtime rendering, but do not downgrade the
missing-enabled-variant diagnostic to a warning.

## Implementation Phases

### Phase 1: model and pure utilities

- Add document version 3, `variantSyncKey`, `day.offline_memo`, and
  `offlineMemoByDay`.
- Extend runtime guards, defaults, reset, and binding resolution.
- Add pure helpers to assign sync keys, provision capability variants, enforce
  independent roots, and locate cross-status counterparts.

### Phase 2: migration and capability provisioning

- Migrate shared base roots to independent roots.
- Automatically provision Multi and Offline Memo variants when enabled.
- Preserve optional variants when disabled.
- Update sample/new-document creation so Online and Offline start independent.
- Remove shared-layout and Create Variant UI.

### Phase 3: Offline Memo authoring and runtime

- Create/repair the bound `offline_memo` text node.
- Show a representative memo value in Cards authoring.
- Add the day-level field to preview inputs only for Offline Memo status.
- Verify save, reload, export/import, and published preview.

### Phase 4: style propagation

- Implement style-property scope filters.
- Resolve counterpart nodes by sync key plus Entry Group slot.
- Add the inspector dialog and one-step history update.
- Report skipped targets without creating missing structure.

### Phase 5: validation and regression

- Upgrade validator rules and focused check scripts.
- Run TypeScript, ESLint, persistence/API checks, renderer checks, and browser
  scenarios.

## Automated Verification

Pure checks:

- new Online and Offline variants have different root and style IDs;
- migrated shared Online/Offline roots become independent exactly once;
- enabling Multi creates a direct variant with slots `0` and `1`;
- enabling Offline Memo creates a direct variant with slot `0` and one memo
  text binding;
- disabling/re-enabling capabilities preserves the existing variant;
- repeated provisioning and migration are idempotent;
- all variant roots keep the same component frame;
- Offline Memo built-in resolution returns the selected day's value;
- style propagation updates only selected style scopes;
- propagation never changes bindings, assets, graph structure, or source style;
- Multi slot mapping follows the selected propagation policy.

Browser checks:

1. Open a new or migrated template and confirm no shared-layout warning or
   `Make Layout Unique` button appears.
2. Edit Online and confirm Offline does not change.
3. Enable Multi and confirm two Entry Groups appear immediately without
   pressing `Create Variant`.
4. Enable Offline Memo and confirm the memo text object and preview input appear
   immediately.
5. Apply typography from Online to selected target statuses and confirm only
   matching nodes change.
6. Apply geometry with explicit opt-in and confirm the shared outer frame and
   timetable positions remain unchanged.
7. Save, reload, export/import, publish, and compare the four status layouts.

## Exit Criteria

- Status layouts are independent by default.
- Optional statuses become structurally complete when enabled.
- Multi always authors two entries and Offline Memo always authors memo text.
- The editor no longer requires pre-authoring shared styles before a split.
- Authors can explicitly propagate selected style scopes after editing.
- Existing documents migrate without layout shift or duplicated structures.
- Runtime, editor, persistence, and validation enforce the same contract.

