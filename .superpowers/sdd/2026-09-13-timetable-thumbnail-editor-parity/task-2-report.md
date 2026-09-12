# Task 2 Report: Timetable Day-Card Offset Rotation

## Scope

Implemented the optional `dayOffsets[dayId].rotateDeg` contract and completed the existing timetable command path. The four requested implementation/check files were changed; Task 1 files and the plan file were not changed.

## RED evidence

Added the focused regression assertions to `scripts/check-studio-timetable-commands.ts` before changing production code, then ran:

```text
node --import tsx scripts/check-studio-timetable-commands.ts
```

Expected failure was observed:

```text
AssertionError [ERR_ASSERTION]: X/Y만 바꾸면 기존 회전값을 보존한다.
undefined !== 12
```

This demonstrated that the existing setter dropped an existing rotation during an X/Y update.

## Implementation

- Added `rotateDeg?: number` to `StudioTimetableDayCardOffset` while keeping `left` and `top` required.
- Updated `setStudioTimetableDayOffset` to round explicit rotations, preserve an existing rotation for X/Y-only updates, and avoid materializing a rotation field for untouched legacy offsets.
- Updated `planStudioTimetableDayCardOffset` to accept and return optional rotation, preserve the existing automatic-layout position math, and treat missing legacy rotation as `0`.
- Made the day-card hook branch explicitly forward `rotateDeg` into the planner.
- Kept the existing day-card layout draft clone, group rotation branch, placed composition-object branch, and drag behavior intact. Drag updates continue through the setter, so existing card rotation is retained.
- Added command regressions for rotation-only updates, X/Y rotation preservation, negative decimal rounding, legacy `0` interpretation, and reset to an empty offset map.

## GREEN evidence

```text
node --import tsx scripts/check-studio-timetable-commands.ts
Studio timetable command baseline checks passed.
exit_code=0
```

`git diff --check` also passed.

## Broader verification

- `npm run lint`: exit code 0. The repository emits many pre-existing warnings, including the Next.js 16 `next lint` deprecation and unused-variable/image warnings; no lint error caused failure.
- `npx tsc --noEmit`: blocked by pre-existing generated `.next/types` references to missing legacy `/time-table/.../page.js` modules. The errors are outside the requested files and are unrelated to this change.

## Concerns

The repository-wide TypeScript check remains blocked by stale generated `.next/types` output. No production build, remote Supabase command, migration, or data mutation was run.

## Commit

`9d96f539` (`feat: preserve timetable day card rotation`).

## Fix-round review

### Report metadata correction

The reviewed implementation commit is `9d96f539`.

### Hook-path coverage assessment

The existing check harness is a direct `node --import tsx` command script. The repository has no installed hook renderer/test runtime:

```text
npm ls react-test-renderer @testing-library/react jsdom --depth=0
temis@0.1.0 ...
└── (empty)
```

`useTimetableObjectCommands` calls React `useCallback`, so direct invocation would fail React's hook dispatcher. A minimal real server-render harness was feasible without a new dependency: it renders a probe component with `react-dom/server`, supplies a real sample document and runtime values, invokes the hook's actual `updateLayerPosition("day-card:mon", { rotateDeg: 17 })` path, then its actual `moveCanvasLayer("day-card:mon", { deltaX: 5, deltaY: 6 })` path, and asserts the mutated document. No mock-only call assertion was added.

Fix-round covering command:

```text
node --import tsx scripts/check-studio-timetable-commands.ts
Studio timetable command baseline checks passed.
exit_code=0
```

## Fix-round 2

RED was first confirmed before completing the harness:

```text
node --import tsx scripts/check-studio-timetable-commands.ts
Error: day-card hook integration harness not implemented
exit_code=1
```

After completing the server-render harness, the same covering command passed:

```text
node --import tsx scripts/check-studio-timetable-commands.ts
Studio timetable command baseline checks passed.
exit_code=0
```

The fix-round commit is intentionally not named here to avoid self-referential report metadata.
