# Task 1 report: date-format parity

## Status

Implemented and committed as Task 1 of the timetable-thumbnail parity plan.

## Scope

- Added `getStudioDateFormatMode` in `src/utils/template-studio/date-template.ts`.
- Updated the timetable card inspector to derive date controls from the shared helper.
- Updated the thumbnail inspector to preserve its `weekDates` semantic guard while passing the shared range/single mode.
- Added focused resolver and inspector checks for range, single-date, and non-date bindings.
- Preserved the existing `dateRangeFormat`/`dateRangeTemplate` binding fields and `setWeekDateFormatting` command path.

## TDD evidence

### RED

Command:

```sh
node --import tsx scripts/check-thumbnail-studio-week-dates.ts; node --import tsx scripts/check-studio-card-node-inspector.tsx; node --import tsx scripts/check-thumbnail-studio-editor.tsx
```

Expected failures:

- `check-thumbnail-studio-week-dates.ts`: `TypeError: ...getStudioDateFormatMode is not a function` because the helper did not exist yet.
- `check-studio-card-node-inspector.tsx`: assertion failure that `week.date_range` should expose range presets/tokens.
- `check-thumbnail-studio-editor.tsx`: assertion failure that thumbnail `week.date_range` should expose range controls/tokens.

### GREEN

Command:

```sh
node --import tsx scripts/check-thumbnail-studio-week-dates.ts && node --import tsx scripts/check-studio-card-node-inspector.tsx && node --import tsx scripts/check-thumbnail-studio-editor.tsx
```

Output:

```text
check-thumbnail-studio-week-dates: ok
Studio card node inspector baseline checks passed.
Thumbnail Studio editor baseline checks passed.
```

Additional verification:

```sh
npx prettier --check src/utils/template-studio/date-template.ts 'src/app/(root)/template-studio/_components/studio-card-node-inspector.tsx' 'src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector.tsx' scripts/check-studio-card-node-inspector.tsx scripts/check-thumbnail-studio-editor.tsx scripts/check-thumbnail-studio-week-dates.ts
```

Result: all matched files use Prettier code style.

```sh
npm run lint
```

Result: completed successfully with the repository's existing ESLint warnings and the Next.js `next lint` deprecation warning.

```sh
npx tsc --noEmit
```

Result: failed on unrelated stale generated `.next/types` imports for missing files under `src/app/(root)/time-table/0c10c964-b83c-4309-a81b-76550aba17b0/page.js`; no Task 1 file was reported.

## Files changed

- `src/utils/template-studio/date-template.ts`
- `src/app/(root)/template-studio/_components/studio-card-node-inspector.tsx`
- `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector.tsx`
- `scripts/check-studio-card-node-inspector.tsx`
- `scripts/check-thumbnail-studio-editor.tsx`
- `scripts/check-thumbnail-studio-week-dates.ts`

## Concerns

- The repository-wide TypeScript check remains blocked by stale generated `.next/types` references unrelated to this task.
- Lint is green but emits pre-existing warnings across the repository.
- The helper result is non-null asserted at inspector call sites after the existing binding guards; the guard and helper mappings are covered by the focused checks.
