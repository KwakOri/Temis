# Task 5 report — convert and review GRID origin variants independently

## Changed files

- `src/utils/template-studio/figma-import/figma-node-converter.ts`
  - Extracted the existing graph conversion into `convertFigmaGridVariant`.
  - Added `convertFigmaGridOriginCandidate` with independent online/offline origin graphs.
  - Kept `convertFigmaGridCandidate` as a legacy single-root compatibility wrapper.
  - Preserved existing rotation correction, nested transform handling, raster asset behavior, and static-text fallback.
- `src/services/server/figmaGridAnalyzeHandler.ts`
  - Runs hybrid review independently for online and offline roots with each variant's placement and component-set evidence.
  - Converts both reviewed roots and retains a legacy online top-level projection for pre-Task-6 callers.
- `src/utils/template-studio/figma-import/figma-review-edits.ts`
  - Applies edits through both variant-local graph/review maps.
  - Marks changed reviews `decision="manual"`; the touched-source map remains transient.
- `scripts/check-template-studio-figma-import.ts`
  - Added distinct-origin, metadata isolation, independent binding edit, rotation, and no-offlineMemo assertions.
- `scripts/check-figma-grid-final-review.tsx`
  - Added independent origin graph fixture.
- `scripts/check-figma-grid-review-confirmation.tsx`
  - Added variant-isolated review edit fixture and updated the route fixture for explicit online/offline origins.

Unrelated dirty files were not staged or modified by the commit.

## Verification

Focused checks:

```text
node --import tsx scripts/check-template-studio-figma-import.ts
Figma import contract checks passed

node --import tsx scripts/check-figma-grid-final-review.tsx
18 tests, 18 pass, 0 fail

node --import tsx scripts/check-figma-grid-review-confirmation.tsx
6 tests, 6 pass, 0 fail
```

Combined verification:

```text
node --import tsx scripts/check-template-studio-figma-import.ts && node --import tsx scripts/check-figma-grid-final-review.tsx && node --import tsx scripts/check-figma-grid-review-confirmation.tsx && npx tsc --noEmit && git diff --check
exit 0
```

`npx tsc --noEmit` produced no output. `git diff --check` produced no output.

```text
npm run lint
exit 0
```

Lint emitted the repository's existing warning set, including the `next lint` deprecation, `.eslintignore` migration warning, unused variables, hook dependency warnings, and `<img>` warnings. No lint error occurred.

## Commit

`97a274d0` — `refactor: convert GRID origin variants independently`

## Concerns

- Task 6 document merge/UI work is intentionally not included. The analyze response currently retains the old online top-level graph projection for compatibility while exposing the new nested independent variants; Task 6 should consume `candidate.variants` as the source of truth and remove/retire that projection from persistence paths.
- No production build was run, per the repository rule to avoid production builds for this image-heavy project.
