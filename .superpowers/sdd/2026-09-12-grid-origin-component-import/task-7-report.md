# Task 7 report — expose hybrid evidence and nested variant review in settings

## Changed files

- `src/components/studio/settings/studio-figma-component-import.tsx`
  - Renders one Component Set candidate row and Online/Offline review sections from `candidate.variants`, with a legacy single-online fallback.
  - Shows discovery-only placement count, bounded evidence samples, effective role/binding, decision, confidence, source, rule/AI agreement, reason, disagreement warning, and explicit needs-review copy.
  - Keeps the Korean URL label and confirm action unchanged; URL and review metadata remain transient.
  - Preserves legacy callback shapes while sending nested status/source-node edits when supported.
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
  - Keeps nested candidates in transient state and updates only the selected `status` + `sourceNodeId` review.
  - Keys binding-touched state as `status:sourceNodeId`; edited rows become `decision: "manual"`.
  - Applies review edits without passing the raw Figma URL into import/persist code.
- `scripts/check-studio-figma-component-import.tsx`
  - Adds grouped-candidate, Online/Offline, discovery evidence, bounded sample, disagreement, needs-review, nested-edit, and manual-override assertions.
- `scripts/check-studio-settings.tsx`
  - Included in the requested staging command; no content change was needed because the settings baseline remained compatible.

## Verification

Passed:

```text
node --import tsx scripts/check-studio-figma-component-import.tsx
Studio Figma component import panel checks passed

node --import tsx scripts/check-studio-settings.tsx
Studio settings baseline checks passed.

npx tsc --noEmit
exit 0

npm run lint
exit 0; existing repository warnings only, no lint errors

git diff --check
exit 0
```

The exact user-specified path ending in `scripts/check-studio-figma-component-import.ts` does not exist; the repository check is `.tsx`, which was run successfully.

## Commit

`67354474` — `feat: review GRID hybrid evidence in settings`

The commit contains the three changed files above. Unrelated dirty files were not staged.

## Concerns

- The public analyze response still carries the legacy online projection for compatibility; the settings UI prefers `candidate.variants` and the importer remains responsible for the nested explicit variants.
- No Task 8 real-link/E2E work or production build was run.

## Round-1 review fixes

### Findings addressed

- P1: `applyStudioFigmaReviewEdits` now compares top-level compatibility reviews with top-level defaults and nested reviews with variant defaults. A changed compatibility review is adopted only when the nested review is unchanged; nested edits win when both changed. Legacy single-root candidates still use their existing review path. Variant-scoped binding-touched keys are also recognized while retaining the legacy source-node key.
- P2: exported `applyStudioFigmaReviewPatch` is the pure transformation used by the client update callback. The Task 7 check calls it directly and asserts that an Online binding edit becomes manual while the corresponding Offline review and decision remain unchanged.

### Changed files

- `src/utils/template-studio/figma-import/figma-review-edits.ts`
- `src/components/studio/settings/studio-figma-component-import.tsx`
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- `scripts/check-studio-figma-component-import.tsx`
- `scripts/check-figma-grid-review-confirmation.tsx`

### Verification

```text
node --import tsx scripts/check-studio-figma-component-import.tsx
Studio Figma component import panel checks passed

node --import tsx scripts/check-studio-settings.tsx
Studio settings baseline checks passed.

node --import tsx scripts/check-figma-grid-review-confirmation.tsx
8 tests, 8 pass, 0 fail

npx tsc --noEmit
exit 0

npm run lint
exit 0; existing repository warnings only, no lint errors

git diff --check
exit 0
```

### Commits

- `046bbd88` — `fix: preserve nested GRID review edits`
- `e4a2fb4b` — `docs: record Task 7 review fixes` (the report append commit)

### Remaining concerns

- The public analyze response retains the legacy online projection for compatibility; nested variant reviews remain the source of truth when they contain a local edit.
- Task 8 real-link/E2E verification and production build remain out of scope.
