# Final fix wave report

Date: 2026-09-13
Base: `5b61e46c`

## Findings addressed

1. Timetable `week.start_date` and `week.end_date` now pass their resolved ISO dates through `resolveStudioSingleDateText`, so single-date presets and custom templates affect runtime output. With no formatting options, the single-date resolver's default remains the existing `YYYY.MM.DD` output.
2. Timetable `week.start_date` and `week.end_date` are now validated as single-date bindings. Timetable `week.date_range` remains range-validated, and Thumbnail `week.start_date` remains single-validated.
3. The focused timetable runtime check now covers resolver preset/custom behavior and validator single-date preset acceptance/rejection.
4. The five requested internal report paths were removed from the Git index with `git rm --cached --ignore-unmatch`; local files were preserved. Task-5 was already not indexed. The user plan file was not deleted or staged.

## TDD evidence

### RED

Command:

```text
node --import tsx scripts/check-template-studio-timetable-runtime.ts
```

Exit: `1`

Exact failure:

```text
AssertionError [ERR_ASSERTION]: timetable week.start_date must use the single-date resolver.

'2026.07.01' !== '01'
```

### GREEN

After the minimal production changes:

```text
node --import tsx scripts/check-template-studio-timetable-runtime.ts
```

Exit: `0`

Exact output:

```text
Template Studio timetable runtime checks passed.
```

## Required verification

All commands were run from the repository root with `node --import tsx` for the seven task-5 checks.

| Command | Exit | Output |
| --- | ---: | --- |
| `node --import tsx scripts/check-studio-card-node-inspector.tsx` | 0 | `Studio card node inspector baseline checks passed.` |
| `node --import tsx scripts/check-thumbnail-studio-editor.tsx` | 0 | `Thumbnail Studio editor baseline checks passed.` |
| `node --import tsx scripts/check-thumbnail-studio-week-dates.ts` | 0 | `check-thumbnail-studio-week-dates: ok` |
| `node --import tsx scripts/check-studio-timetable-commands.ts` | 0 | `Studio timetable command baseline checks passed.` |
| `node --import tsx scripts/check-studio-timetable-inspector.tsx` | 0 | `Studio timetable inspector baseline checks passed.` |
| `node --import tsx scripts/check-studio-day-cards-layout.tsx` | 0 | `Studio day cards layout baseline checks passed.` |
| `node --import tsx scripts/check-template-studio-timetable-layout.ts` | 0 | `Template Studio timetable layout checks passed.` |

Additional focused check:

```text
node --import tsx scripts/check-template-studio-timetable-runtime.ts
exit=0
Template Studio timetable runtime checks passed.
```

Lint:

```text
npm run lint
exit=0
```

Lint emitted the existing repository warning set, including the deprecation warning for `next lint` and `.eslintignore`; no lint errors were emitted. The changed `builtin-fields.ts` file emitted no warning after removing its unused legacy formatter import.

TypeScript:

```text
npx tsc --noEmit
exit=2
.next/types/app/(root)/time-table/0c10c964-b83c-4309-a81b-76550aba17b0/page.ts(2,24): error TS2307: Cannot find module '../../../../../../src/app/(root)/time-table/0c10c964-b83c-4309-a81b-76550aba17b0/page.js' or its corresponding type declarations.
.next/types/app/(root)/time-table/0c10c964-b83c-4309-a81b-76550aba17b0/page.ts(5,29): error TS2307: Cannot find module '../../../../../../src/app/(root)/time-table/0c10c964-b83c-4309-a81b-76550aba17b0/page.js' or its corresponding type declarations.
```

These are the known stale `.next/types` route-import diagnostics. No TypeScript diagnostic points to the changed source or check files.

## Scope and concerns

- No remote database, migration, production build, or browser server was run.
- Existing lint warnings remain outside this fix wave.
- `npx tsc --noEmit` remains non-zero solely because of the two stale `.next/types` imports listed above.
- The five local report copies remain present; their Git index entries are removed. The plan file remains untouched and untracked.
