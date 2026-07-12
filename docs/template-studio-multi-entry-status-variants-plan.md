# Template Studio Multi-Entry And Status Variant Plan

## Scope

This plan covers the Template Studio editor and saved preview routes:

- `/admin/template-studio/[templateId]/edit`
- `/admin/template-studio/[templateId]/preview`

The work has three product goals:

1. Multiple entries must remain inside the original day-card bounds instead of
   increasing the day-card height and shifting or overlapping neighboring days.
2. Entry creation must be available only when the template's `multi`
   capability is enabled.
3. Cards authoring must support full object-layout variants for `online`,
   `offline`, `multi`, and `offlineMemo`, while preserving the existing
   status-specific background asset slots and runtime fallback behavior.

## Current Findings

### Multi-entry layout grows the day card

The current timetable preview calculates day-card height as:

```text
entryCount * entryCardHeight + (entryCount - 1) * entryGap
```

It then renders every entry at the original component-root size. A second entry
therefore adds another full-height card instead of sharing the first entry's
space.

### Capability and entry creation are not synchronized

The editor and saved preview currently enable Add Entry from
`maxEntriesPerDay` alone. `multi.enabled` is not part of the guard. The runtime
mutation helper also accepts entry creation while `multi` is disabled.

Disabling `multi` currently normalizes `multi` statuses back to `online`, but it
does not handle days that already contain more than one entry.

### Status variant support is partial

Already present:

- status and component-variant domain types;
- derived-status fallback resolution;
- capability-gated runtime status lists;
- validator diagnostics for missing or disabled variants;
- status-specific card background assets.

Missing from Cards authoring:

- active status selection;
- rendering only the selected component-variant root;
- creating a derived variant from its fallback root;
- editing full object placement for `multi` and `offlineMemo`;
- a multi-entry canvas context that matches the runtime allocation.

## Product Contracts

### Capability ownership

- `multi.enabled` is the source of truth for whether a day may contain more
  than one entry.
- `offlineMemo.enabled` independently controls availability of the
  `offlineMemo` status.
- The effective entry limit is `1` when `multi` is disabled and
  `maxEntriesPerDay` when it is enabled.
- UI guards and runtime mutation helpers must use the same shared policy.

### Disabling Multi

Disabling `multi` while any day contains more than one entry is blocked with a
clear message. Entries must not be silently deleted. After all days contain at
most one entry, disabling `multi` may normalize remaining `multi` statuses to
`online`.

### Fixed day-card bounds

The day-card outer bounds are based on the single-entry component size and do
not change with entry count.

For `N` entries:

```text
usableHeight = dayCardHeight - entryGap * (N - 1)
entrySlotHeight = usableHeight / N
```

Every entry receives one non-overlapping slot inside the fixed day-card bounds.
The implementation must support all counts through `maxEntriesPerDay`, not only
two entries.

The component variant is fitted into its allocated slot. A dedicated `multi`
variant can author a compact layout, while a missing derived variant continues
to use its base-status fallback.

### Status variant authoring

Cards exposes these status tabs:

- `Online` and `Offline` are always available.
- `Multi` appears only when `multi.enabled` is true.
- `Offline Memo` appears only when `offlineMemo.enabled` is true.

If a derived variant does not exist, the editor displays its fallback and
offers an explicit Create Variant action. Creation deep-clones the fallback
root subtree and its styles, assigns new ids, and registers the new root in the
entry component. Authored derived variants remain stored when their capability
is disabled and reappear when it is enabled again.

## Implementation Plan

### Phase 1: Shared capability and entry policy

Target files:

- `src/utils/template-studio/timetable-capabilities.ts`
- `src/utils/template-studio/timetable-runtime.ts`
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- `src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx`

Tasks:

1. Add shared helpers for effective max entries, Add Entry eligibility, and the
   reason an action is disabled.
2. Use those helpers in both editor surfaces.
3. Guard `addStudioTimetableEntry` itself so programmatic callers cannot bypass
   the capability.
4. Block disabling `multi` while a day contains multiple entries.
5. Keep status normalization for valid capability-disable transitions.

### Phase 2: Capability status contracts and migration

Target files:

- `src/utils/template-studio/timetable-capabilities.ts`
- `src/utils/template-studio/migrations.ts`
- `src/utils/template-studio/validator.ts`

Tasks:

1. Ensure enabling a capability has the related derived status contract:
   - `multi` derives from and falls back to `online`;
   - `offlineMemo` derives from and falls back to `offline`.
2. Preserve existing status definitions and authored component variants when a
   capability is disabled.
3. Add migration defaults for documents that enable a capability but lack its
   derived status definition.
4. Add diagnostics for multiple entries while `multi` is disabled.

No document-version bump is required because the existing schema already
supports the required status and component-variant records.

### Phase 3: Fixed-bounds multi-entry layout

Target file:

- `src/app/(root)/template-studio/_components/studio-timetable-preview.tsx`

Tasks:

1. Extract pure helpers that calculate fixed day-card bounds and per-entry
   allocation rectangles.
2. Stop multiplying the day-card outer height by entry count.
3. Render each entry inside its computed slot with overflow containment.
4. Fit the resolved component-variant root into that slot using a shared
   transform calculation.
5. Keep timetable bounds and neighboring day coordinates stable as entry counts
   change.

### Phase 4: Cards status variant authoring

Target files:

- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- `src/app/(root)/template-studio/_components/studio-renderer.tsx`
- a focused utility under `src/utils/template-studio/` for variant cloning

Tasks:

1. Add capability-filtered status tabs to Cards.
2. Resolve the selected status to its direct variant or fallback.
3. Render only the selected variant root in the Cards canvas.
4. Add Create Variant from Fallback with deep graph/style cloning.
5. Add a multi-entry preview count selector from `2` through
   `maxEntriesPerDay`.
6. Show the selected `multi` variant in the same allocated frame used by
   runtime rendering.
7. Keep the existing status-background asset inspector synchronized with the
   active status.

### Phase 5: Automated and browser verification

Add focused checks for:

- effective max entries with `multi` enabled and disabled;
- runtime Add Entry no-op while disabled;
- blocked capability disable with existing multiple entries;
- migration of missing derived status definitions;
- fixed day-card bounds for one, two, and three entries;
- non-overlapping allocation rectangles whose heights plus gaps equal the
  original day-card height;
- stable neighboring-day positions;
- direct variant selection and base-status fallback;
- deep-cloned variant roots and styles that do not share mutable records;
- preservation of derived variants across capability toggles.

Browser regression scenarios:

1. With Multi disabled, Add Entry is disabled in Cards Table and saved preview.
2. With Multi enabled, entries can be added through the configured maximum.
3. Adding a second or third entry does not move or overlap another day.
4. Cards exposes only capability-available status tabs.
5. Multi and Offline Memo variants can be created, edited, saved, reloaded, and
   rendered in preview.
6. Missing derived variants visibly use their documented fallback.

## Exit Criteria

- All entry-add surfaces and the runtime mutation layer enforce the same
  capability policy.
- Multi-entry rendering never changes the outer bounds of a day card.
- Cards can author distinct full object layouts for every available status.
- Existing background asset slots and fallback behavior continue to work.
- Existing template-studio checks, TypeScript, ESLint, new focused checks, and
  the browser regression scenarios pass.
