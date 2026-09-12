# Task 8 report — GRID origin/component import end-to-end verification

## Scope

Added only Task 8 fixture/assertion coverage in `scripts/check-template-studio-figma-import.ts`.
The redacted route fixture now exercises seven shuffled visible placements (five online, two offline), distinct placement coordinates/rotations, one online and one offline origin, repeated day/date/time slots, arbitrary title samples, hidden MEMO/OFFLINE_MEMO samples, and origin-only geometry. Assertions verify one component-set candidate, seven placement IDs, independent origin geometry, aggregated day evidence, stable date/time evidence, title reviewability, memo exclusion, and existing graph-import isolation.

No production behavior or dependencies were changed. Pre-existing dirty files were not staged.

## Real-link attempt

Attempted credential availability check for the user-supplied Figma link without printing or persisting the link or token.

Exact result:

```text
FIGMA_ACCESS_TOKEN=absent
```

Limitation: no authenticated Figma access path was available in this environment, so the real-link/admin-session checks could not be performed. Verification relies on the redacted mocked route fixture and existing pure helper/import checks. The supplied link and any token were not written to source, logs, this report, or document JSON.

## Verification commands and outputs

Task 8 focused import check:

```text
$ npm run check:template-studio:figma-import

> temis@0.1.0 check:template-studio:figma-import
> node --import tsx scripts/check-template-studio-figma-import.ts

Figma import contract checks passed
EXIT_CODE=0
```

Component import UI check:

```text
$ npm run check:studio:figma-component-import

> temis@0.1.0 check:studio:figma-component-import
> node --import tsx scripts/check-studio-figma-component-import.tsx

Studio Figma component import panel checks passed
EXIT_CODE=0
```

The exact requested settings, asset-sync, auto-text, and timetable-runtime npm commands each failed before script execution with the documented sandbox IPC error:

```text
Error: listen EPERM: operation not permitted /var/folders/.../tsx-501/<pid>.pipe
EXIT_CODE=1
```

The exact requested component-set command is not defined by this checkout:

```text
$ npm run check:studio:component-sets
npm error Missing script: "check:studio:component-sets"
EXIT_CODE=1
```

Prescribed `node --import tsx` fallbacks and the repository's actual component-set script:

```text
$ node --import tsx scripts/check-studio-settings.tsx
Studio settings baseline checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-template-studio-component-sets.ts
Template Studio component set checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-studio-asset-sync.ts
Studio asset sync baseline checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-template-studio-auto-text.tsx
Template Studio Auto Text line break checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-template-studio-timetable-runtime.ts
Template Studio timetable runtime checks passed.
EXIT_CODE=0
```

Compiler and diff checks:

```text
$ npx tsc --noEmit
EXIT_CODE=0

$ git diff --check
EXIT_CODE=0
```

Lint:

```text
$ npm run lint
... existing repository ESLint warnings ...
info - Need to disable some ESLint rules? See the Next.js ESLint documentation.
EXIT_CODE=0
```

`npm test` was not attempted; no test script was needed for this verification.

## Residual concerns

- The real Figma link and authenticated UI flow remain unverified because `FIGMA_ACCESS_TOKEN` was absent.
- The exact focused command list is not fully green as written because of sandbox `tsx` IPC restrictions and the missing `check:studio:component-sets` alias; all affected checks pass through the prescribed fallback/actual script.
- Existing lint warnings remain; lint exits 0 and no Task 8 lint error was reported.
- Task 8 should not be marked unconditionally complete until an authenticated manual real-link session is available, or the verification owner explicitly accepts the mocked-fixture limitation.

## Round 1 fix report — P1/P2

### P1 — literal redaction checks

Replaced URL-based `RegExp` redaction assertions with literal `String.includes` checks. The route and imported-document assertions now verify that the exact synthetic private Figma URL and exact synthetic temporary asset URL are absent from serialized route/document JSON. No real link or token is printed or persisted.

### P2 — production route conversion/import path

Removed the seven-placement route test's `toCandidates` synthetic `fixture-root` adapter. The route now uses the production default candidate converter. The check asserts:

- both online/offline review callbacks run exactly once and receive their origin roots;
- one seven-placement candidate is returned with nested online/offline graphs;
- roots are origin-derived and distinct, with no shared graph node IDs;
- graph nodes contain no placement IDs, placement metadata, or transient evidence;
- the route candidate imports through `applyStudioFigmaGridCandidate` without leaking placement/evidence metadata or changing existing components/day assignments.

### Round-1 fix command outputs

```text
$ npm run check:template-studio:figma-import

> temis@0.1.0 check:template-studio:figma-import
> node --import tsx scripts/check-template-studio-figma-import.ts

Figma import contract checks passed
EXIT_CODE=0

$ npm run check:studio:figma-component-import

> temis@0.1.0 check:studio:figma-component-import
> node --import tsx scripts/check-studio-figma-component-import.tsx

Studio Figma component import panel checks passed
EXIT_CODE=0

$ npx tsc --noEmit
EXIT_CODE=0

$ git diff --check
EXIT_CODE=0
```

Prescribed fallback checks:

```text
$ node --import tsx scripts/check-studio-settings.tsx
Studio settings baseline checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-template-studio-component-sets.ts
Template Studio component set checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-studio-asset-sync.ts
Studio asset sync baseline checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-template-studio-auto-text.tsx
Template Studio Auto Text line break checks passed.
EXIT_CODE=0

$ node --import tsx scripts/check-template-studio-timetable-runtime.ts
Template Studio timetable runtime checks passed.
EXIT_CODE=0
```

Lint:

```text
$ npm run lint
... existing repository ESLint warnings ...
info - Need to disable some ESLint rules? See the Next.js ESLint documentation.
EXIT_CODE=0
```

Authenticated-link limitation remains unchanged:

```text
FIGMA_ACCESS_TOKEN=absent
```

No authenticated real-link or admin-session verification was possible. `npm test` was not attempted. The exact npm alias `check:studio:component-sets` remains unavailable in this checkout; its repository fallback passed above.
