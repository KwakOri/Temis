# Template Studio Multi-Entry And Status Variant Plan

## Status

This document records the first multi-entry implementation completed on
2026-07-12. Its automatic fixed-height slot-allocation design is superseded by:

- `docs/template-studio-fixed-two-slot-multi-variant-plan.md`

Do not extend the automatic `N`-entry height-splitting model described by the
original implementation. The current product decision is:

- a day card has one shared, status-independent component frame;
- `online`, `offline`, and `offlineMemo` author one Entry Group;
- `multi` authors exactly two Entry Groups inside the same frame;
- the runtime renders one day-card variant, not one full card per entry;
- `multi` has a fixed maximum of two entries;
- entry placement is authored in Cards and is not calculated from entry count at
  runtime.

## Completed First Implementation

The first implementation established reusable behavior that remains valid:

- `multi.enabled` gates entry creation;
- capability-gated status tabs exist in Cards;
- derived status fallback and explicit variant creation exist;
- disabling Multi is blocked while multiple entries exist;
- adding a second online entry transitions the day to Multi;
- removing the second entry transitions the remaining entry back to Online;
- status-specific background slots and fallback resolution exist;
- saved draft preview uses the same runtime document and values as the editor.

## Superseded Behavior

The following behavior was implemented but must now be removed:

- using `maxEntriesPerDay` as an arbitrary Multi entry count;
- supporting three or more entries;
- calculating equal-height runtime slots from entry count and `entryGap`;
- rendering the full component variant once per entry;
- fitting each full component root into a generated slot with independent
  `scaleX` and `scaleY` transforms;
- showing a Multi preview entry-count selector and generated slot-size guide.

Those choices keep the day bounds stable, but they duplicate day-level objects,
distort card content, and prevent the template author from owning the actual
two-entry layout.

## Migration Note

Existing version-1 documents and saved drafts may contain the superseded shape.
The replacement implementation must migrate them to the shared-frame and Entry
Group contract without silently deleting runtime entries. Documents containing
more than two entries must produce a blocking diagnostic until the excess data
is resolved.
