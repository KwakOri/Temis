# Task 3 report: timetable thumbnail editor parity

## Status

Implemented the requested per-day-card rotation rendering and visual bounds behavior.

## TDD evidence

- RED: after adding the mixed-card rotation bounds assertions, before production changes, `node --import tsx scripts/check-template-studio-timetable-layout.ts` failed at the new visual-bounds assertion because the existing implementation returned unrotated bounds.
- GREEN: after the minimal implementation, the same command completed with `Template Studio timetable layout checks passed.`

## Changes

- Added `getStudioTimetableRotatedRectangleBounds`, using centered axis-aligned bounds with the required absolute sine/cosine formulas.
- Updated `getStudioTimetableDayCardsBounds` to aggregate each card’s rotated visual bounds while leaving `getStudioTimetableDayCardGeometries` unchanged for logical drag and placement geometry.
- Applied each day card’s `dayOffsets[dayId].rotateDeg` to its centered wrapper; the existing parent group rotation remains intact.
- Added client selection rotation metadata for placed objects, the day-card group, and individual day cards.
- Added layout assertions for 0°, 90°, negative 45°, mixed-card bounds, and unchanged logical geometry.

## Files

- `src/app/(root)/template-studio/_components/studio-timetable-preview.tsx`
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- `scripts/check-template-studio-timetable-layout.ts`

## Verification

- `node --import tsx scripts/check-template-studio-timetable-layout.ts` — passed.
- Targeted ESLint on the three scoped files — passed; only the repository’s existing ESLint ignore deprecation warning was emitted.
- `git diff --check` — passed.
- `npx tsc --noEmit` — blocked by pre-existing missing generated `.next/types` references for two time-table routes; no changed-file diagnostic was reported.
- Prettier check was clean immediately after formatting, but the client contains pre-existing non-Prettier formatting outside this task; restoring that unrelated formatting keeps the diff scoped.

## Concerns

- Full TypeScript verification remains blocked until the missing generated `.next/types` route references are regenerated or removed.
- No browser visual capture was run; the geometry assertions cover the required clipping/position math, while CSS rendering remains represented by the wrapper transform and parent-relative placement.
