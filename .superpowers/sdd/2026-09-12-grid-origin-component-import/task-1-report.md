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
