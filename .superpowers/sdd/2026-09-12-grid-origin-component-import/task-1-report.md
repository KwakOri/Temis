# Task 1 report: GRID origin, placement evidence, and hybrid-review contracts

## Changed files

- `src/types/template-studio-figma.ts`
- `src/services/server/figmaTemplateStudioService.ts`
- `src/services/server/figmaGridReviewService.ts`
- `src/utils/template-studio/figma-import/figma-origin.ts`
- `src/utils/template-studio/figma-import/figma-review-fusion.ts`
- `scripts/check-template-studio-figma-import.ts`
- `scripts/check-figma-grid-final-review.tsx`
- `scripts/check-figma-grid-review-confirmation.tsx`
- `scripts/check-studio-figma-component-import.tsx`

## Decisions

- Direct GRID children are represented as placement instances; origin component references are grouped by component-set ID.
- `normalizeFigmaNode` preserves `componentId`, `componentProperties`, and `overrides` alongside the existing visual metadata. Placement geometry remains available for diagnostics but is not used as identity.
- Origin resolution requires an instance component ID, a component-map entry, and a component-set-map entry.
- Variant status accepts only explicit, unambiguous `online`/`offline` signals, case-insensitively. `offlineMemo`, `multi`, missing, and conflicting signals resolve to `null`.
- Review metadata is transient. The review contract now carries source, decision, agreement, evidence, and rule/AI candidates; fusion keeps disagreements visible and only auto-approves agreeing supported semantic roles with stable evidence.
- Existing deterministic review behavior remains intact; its new default decision is `needs_review`.
- Figma REST fetching, placement descendant inference, AI transport/model selection, converter changes, and document merge were intentionally left for later tasks. Luna was not invoked because AI transport is explicitly out of scope here.

## Tests and exact output

Red phase command:

```text
node --import tsx scripts/check-template-studio-figma-import.ts
```

Observed failure before implementation:

```text
Error: Cannot find module '../src/utils/template-studio/figma-import/figma-origin'
```

Green verification command:

```text
node --import tsx scripts/check-template-studio-figma-import.ts && node --import tsx scripts/check-figma-grid-final-review.tsx && node --import tsx scripts/check-figma-grid-review-confirmation.tsx && node --import tsx scripts/check-studio-figma-component-import.tsx && npx tsc --noEmit
```

Observed output:

```text
Figma import contract checks passed
17 tests, 17 pass, 0 fail
5 tests, 5 pass, 0 fail
Studio Figma component import panel checks passed
npx tsc --noEmit: exit 0, no output
```

## Commits

- `962699d76e11419a41e730c36aa1e84a7598bc47` — `test: define GRID hybrid review contract`

## Concerns

- The report itself is a follow-up artifact and is not included in the implementation commit above.
- The origin helper intentionally accepts normalized component maps rather than performing REST requests; later fetch/inference tasks must adapt their response shape to this contract.

## Round 1 fix report

### Review findings addressed

1. `inferFigmaGridVariantStatus` now reads the normalized Figma component-property shape `{ status: { value: "ONLINE" } }` while retaining rejection of `offlineMemo`, `multi`, missing, and conflicting status values. A focused regression assertion covers the nested structure.
2. The focused contract check now type-checks and runtime-asserts all declared review source, decision, agreement, and evidence-sample values. `fuseFigmaReview` now returns `agreement="ai_only"` for an unknown rule result with a valid AI candidate, keeps `decision="needs_review"`, and generates the deterministic binding for the AI role.
3. `src/services/server/figmaGridReviewService.ts` was changed in the original task because `StudioFigmaNodeReview.decision` was made required by the new contract. Its existing deterministic review constructors/defaults therefore needed the required `decision: "needs_review"` field to remain type-correct without changing their behavior.

### Round 1 changed files

- `src/utils/template-studio/figma-import/figma-origin.ts`
- `src/utils/template-studio/figma-import/figma-review-fusion.ts`
- `scripts/check-template-studio-figma-import.ts`
- This report: `.superpowers/sdd/2026-09-12-grid-origin-component-import/task-1-report.md`

### Exact verification command and output

```text
node --import tsx scripts/check-template-studio-figma-import.ts && node --import tsx scripts/check-figma-grid-final-review.tsx && node --import tsx scripts/check-figma-grid-review-confirmation.tsx && node --import tsx scripts/check-studio-figma-component-import.tsx && npx tsc --noEmit
```

```text
Figma import contract checks passed
17 tests, 17 pass, 0 fail
5 tests, 5 pass, 0 fail
Studio Figma component import panel checks passed
npx tsc --noEmit: exit 0, no output
```

### Round 1 commits

- `a12f961cabeddbaf5603f8eb6e98d9a79ea0dbcf` — `fix: complete GRID review contract round one`
- `f38b56a25c51f8018756d2ecdc59ae01cb92f319` — `docs: add GRID contract task report`
