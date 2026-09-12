# Task 4 report: timetable thumbnail editor parity

## Status

Implemented the explicit card transform UI and inspector wiring required by Task 4.

## TDD evidence

### RED

Extended the focused checks first, then ran:

```text
node --import tsx scripts/check-studio-timetable-inspector.tsx
AssertionError: 개별 요일 카드의 Rotate는 선택된 카드 회전값을 보여준다.
exit=1
```

```text
node --import tsx scripts/check-studio-day-cards-layout.tsx
AssertionError: 모든 프리셋에서 요일별 카드 변환 필드를 보여준다.
exit=1
```

These failures were the expected missing-UI failures: individual day-card rotation was not rendered, and Card Transforms/reset semantics were absent.

### GREEN

After implementation:

```text
node --import tsx scripts/check-studio-timetable-inspector.tsx
Studio timetable inspector baseline checks passed.
exit=0
```

```text
node --import tsx scripts/check-studio-day-cards-layout.tsx
Studio day cards layout baseline checks passed.
exit=0
```

## Changed files

- `src/app/(root)/template-studio/_components/studio-timetable-inspector.tsx`
  - Added `selectedLayerRotation` to the inspector model.
  - Added card-specific Rotate using the existing `onUpdateLayerPosition` command path.
  - Kept generated-card W/H read-only and labeled group/card rotation distinctly.
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
  - Supplies rotation from composition-object style or day-ID-keyed `dayOffsets`.
- `src/app/(root)/template-studio/_components/studio-timetable-day-cards-layout-controls.tsx`
  - Added Card Transforms with per-day Offset X, Offset Y, and Rotate fields.
  - Preserved transforms across preset changes and reset clears `dayOffsets`.
- `src/app/(root)/template-studio/_components/studio-timetable-layer-panel.tsx`
  - Added discoverability guidance for selecting a day card to edit Position / Rotate.
- `scripts/check-studio-timetable-inspector.tsx`
  - Added individual-card rotation, read-only W/H, and group-rotation checks.
- `scripts/check-studio-day-cards-layout.tsx`
  - Added Card Transforms, custom Slot Map ordering, day-keyed updates, and reset checks.

## Verification

- `git diff --check`: passed.
- `npm run lint`: exit 0; existing repository warnings remain.
- Focused inspector/layout checks: passed.
- `npx tsc --noEmit`: exit 1 due only to two generated `.next/types` imports for the unrelated `0c10c964-b83c-4309-a81b-76550aba17b0` timetable route; no errors matched the changed files.

## Concerns

- Full typecheck remains blocked by stale/generated `.next/types` route references outside this task’s write scope.
- The layout transform editor intentionally uses the existing `dayOffsets` shape and update command path; no Task 1–3 files or dependencies were changed.
