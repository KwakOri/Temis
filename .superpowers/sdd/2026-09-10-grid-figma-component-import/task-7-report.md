# Task 7 report: merge GRID candidate as an independent Component Set

## Scope

Completed the Task 7 importer and focused contract checks in:

- `src/utils/template-studio/figma-import/figma-component-import.ts`
- `scripts/check-template-studio-figma-import.ts`

The existing partial implementation was preserved and tightened; unrelated
worktree changes were not reverted.

## Behavior

- Validates the candidate graph, styles, assets, bindings, entry-slot contract,
  and data-URL policy before creating a draft or mutating the document.
- Rejects malformed, cyclic, orphaned, multi-parent, unknown-reference, and
  remote/non-data asset or binding inputs atomically.
- Clones assets, nodes, and styles with fresh IDs, adds an unassigned uniquely
  labeled Component Set, and preserves `entryComponentId` and every day
  assignment.
- Creates independent Online and Offline roots/styles, preserves direct
  `entrySlot.index = 0`, applies timetable frames, and never synthesizes
  optional Multi or Offline Memo variants.
- Carries through safe warnings for unsupported effects and absent optional
  variants, and removes source URLs from persisted labels/metadata.
- Importing the same candidate twice receives unique IDs and a label suffix.

## TDD evidence

RED was captured after adding Task 7 checks and before tightening validation:

```text
$ node --import tsx scripts/check-template-studio-figma-import.ts
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
true !== false
```

The failure was the unsafe `staticText` Figma URL binding being accepted. The
implementation was then revised to reject unsafe bindings before mutation.

GREEN:

```text
$ node --import tsx scripts/check-template-studio-figma-import.ts
Figma import contract checks passed
```

## Verification

- `node --import tsx scripts/check-template-studio-figma-import.ts` — passed.
- `npx tsc --noEmit --pretty false` — passed.
- `npm run lint` — passed with existing repository warnings only; no new
  warnings remain in the Task 7 importer.
- `git diff --check` — passed.

## Fix round: enabled capability fallbacks

### Root cause

When `multi` or `offlineMemo` was enabled, the draft validator correctly
required a direct derived variant on every component. The importer created the
new component with only `online` and `offline`, so the final atomic validation
rejected the otherwise valid import.

### TDD RED/GREEN evidence

The focused check was extended with a document whose existing component set
already has both enabled capability variants. Before the fix:

```text
$ node --import tsx scripts/check-template-studio-figma-import.ts
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
false !== true
```

The failing assertion was the expected successful import of the capability-
enabled document.

The importer now ensures enabled capability status definitions in the draft,
clones `multi` from the new component's Online root and `offlineMemo` from its
Offline root with fresh IDs, adds the required Offline Memo text binding, and
leaves disabled capabilities untouched.

After the fix:

```text
$ node --import tsx scripts/check-template-studio-figma-import.ts
Figma import contract checks passed
```

The focused check also verifies unique derived roots, the Offline Memo binding,
compliance warnings, unchanged existing components, and unchanged day
assignments.
