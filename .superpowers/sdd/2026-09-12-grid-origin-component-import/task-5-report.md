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

`80ab05228417abcd58270afdcd577c08b08d16f0` — `refactor: convert GRID origin variants independently`

## Concerns

- Task 6 document merge/UI work is intentionally not included. The analyze response currently retains the old online top-level graph projection for compatibility while exposing the new nested independent variants; Task 6 should consume `candidate.variants` as the source of truth and remove/retire that projection from persistence paths.
- No production build was run, per the repository rule to avoid production builds for this image-heavy project.

## Round-1 review fix

### Findings addressed

- P1: `applyStudioFigmaReviewEdits` now detects the serialized legacy top-level `reviews` projection and synchronizes those rows into the online variant-local review collection before traversing the variant graphs. This preserves the existing UI/API projection, changes the intended online graph binding, marks the changed review `decision="manual"`, and leaves the offline graph/review untouched. Legacy single-root candidates continue through the same existing path.
- P2: the route fixture now uses the real default conversion path and a contextual review callback. It asserts exactly two review requests, distinct online/offline origin IDs, local online/offline evidence samples with their placement IDs, component-set context, and distinct converted variant roots. There is no empty `toCandidates` masking or conditional review assertion.

### Exact round-1 verification

```text
node --import tsx scripts/check-template-studio-figma-import.ts && node --import tsx scripts/check-figma-grid-final-review.tsx && node --import tsx scripts/check-figma-grid-review-confirmation.tsx && git diff --check
Figma import contract checks passed
18 tests, 18 pass, 0 fail
7 tests, 7 pass, 0 fail
exit 0

npx tsc --noEmit
exit 0, no output

npm run lint
exit 0
```

Lint retained the repository's existing warnings (`next lint` deprecation, `.eslintignore` migration, unused variables, hook dependencies, and `<img>` warnings); no lint error occurred.

### Round-1 commits

- Original Task 5 implementation: `80ab05228417abcd58270afdcd577c08b08d16f0` — `refactor: convert GRID origin variants independently`.
- Round-1 implementation/tests fix: `4818e40a` — `fix: preserve GRID origin review edits`.
- This round-1 report is committed as a separate documentation follow-up after `4818e40a`; its final hash is reported with the implementation hash in the task handoff.

### Round-1 concerns

- Task 6 document merge/UI redesign remains out of scope. The compatibility synchronization is limited to review edits before merge and does not persist origin metadata into graph nodes.
