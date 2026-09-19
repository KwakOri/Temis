# GRID origin/component import — final broad-review fix wave

Date: 2026-09-12

## Scope and commit

Implemented the five final broad-review findings in:

- implementation/tests commit: `5cf18f02` (`fix: complete GRID origin review wave`)
- reviewed prior baseline: `18b76079`

The implementation keeps `ONLINE`/`OFFLINE` only, does not synthesize `offlineMemo`, keeps origin/placement/evidence/review/AI metadata transient, and preserves the existing document merge/ID/frame/redaction/no-clone behavior.

## Fixes delivered

1. Production origin fetch now aggregates component-set evidence, runs deterministic semantic inference for each explicit origin variant, and passes semantic candidates/evidence through the default contextual review path. The default route fixture asserts day/date/time roles and bindings auto-review, while arbitrary title text remains `needs_review`.
2. Fetched origin roots retain component/component-set metadata. Origin subtree/variant/component metadata determines status; placement status is used only for consistency warnings. A conflicting-placement fixture verifies that explicit origin statuses still produce the correct online/offline grouping.
3. Fusion auto decisions require the role-specific signal and adequate mapping/sample evidence: weekday set for `day_label`, date pattern for `date`, and time pattern for `time`. `status_label` is not an auto role. Rule-only and invalid-AI fallback paths also pass through the safety gate.
4. The broad final-review fixture now wraps the old single graph as two explicit, independently remapped online/offline variants and retains a distinct offline graph assertion. Clone fallback is not restored.
5. Shared `StudioFigmaGridVariantCandidate` and `StudioFigmaGridOriginCandidate` contracts live in `src/types/template-studio-figma.ts`. UI/client/analyze/import/review-edit code uses the shared contracts; the optional top-level component/reviews fields are isolated compatibility projections, with nested variants authoritative.

## Verification

Every command below was run with a 60–120 second alarm timeout; no timeout fired.

| Command | Result |
| --- | --- |
| `node --import tsx scripts/check-template-studio-figma-import.ts` | exit 0 — `Figma import contract checks passed` |
| `node --import tsx scripts/check-figma-grid-final-review.tsx` | exit 0 — 19 tests, 19 passed, 0 failed |
| `node --import tsx scripts/check-figma-grid-review-confirmation.tsx` | exit 0 — 8 tests, 8 passed, 0 failed |
| `node --import tsx scripts/check-studio-figma-component-import.tsx` | exit 0 — `Studio Figma component import panel checks passed` |
| `node --import tsx scripts/check-studio-settings.tsx` | exit 0 — `Studio settings baseline checks passed.` |
| `node --import tsx scripts/check-template-studio-component-sets.ts` | exit 0 — `Template Studio component set checks passed.` |
| `node --import tsx scripts/check-studio-asset-sync.ts` | exit 0 — `Studio asset sync baseline checks passed.` |
| `node --import tsx scripts/check-template-studio-auto-text.tsx` | exit 0 — `Template Studio Auto Text line break checks passed.` |
| `node --import tsx scripts/check-template-studio-timetable-runtime.ts` | exit 0 — `Template Studio timetable runtime checks passed.` |
| `npx tsc --noEmit` | exit 0 — no output |
| `npm run lint` | exit 0 — existing repository warnings only; no lint errors |
| `git diff --check` | exit 0 — no output |

## Residual/limitation

The compatibility UI callback adapter still contains the existing arity-detection casts so old single-variant callers can coexist with nested variant callbacks. The legacy `convertFigmaGridCandidate` API remains for existing callers/tests; the production origin route and importer use nested variants. These are isolated compatibility surfaces, not sources of truth.

No authenticated real-link Figma verification was possible in this environment because `FIGMA_ACCESS_TOKEN` was not available. The route/fixture checks use mocked Figma responses and assert redaction; no token or live-link data was written to the repository.

## Official component-set metadata re-review fix

Date: 2026-09-12

The remaining P1 was fixed in implementation commit `7a964005aa8dd7d16fcac757731c3403c98365d9` (`fix: resolve official Figma component sets`). The resolver now accepts the official `containing_frame.containingComponentSet` shape while preserving `componentSetId` and `component_set_id`. Component-set references are matched against the response key and metadata IDs, and the returned `componentSetNodeId` is the response key consumed by the origin fetch path. The production route fixture uses the official shape with a distinct metadata node ID and still verifies explicit online/offline origin resolution and status authority.

Changed files:

- `src/utils/template-studio/figma-import/figma-origin.ts`
- `scripts/check-template-studio-figma-import.ts`

The focused regression was first run red against the official-shaped fixture (`actual: null`, expected resolved origin), then passed after the resolver change.

### Bounded verification

Each command was run with an alarm timeout; no timeout fired:

| Command | Result |
| --- | --- |
| `node --import tsx scripts/check-template-studio-figma-import.ts` | exit 0 — `Figma import contract checks passed` |
| `node --import tsx scripts/check-figma-grid-final-review.tsx` | exit 0 — 19 tests, 19 passed, 0 failed |
| `npx tsc --noEmit` | exit 0 — no output |
| `git diff --check` | exit 0 — no output |

The report commit is separate from the implementation commit. No authenticated real-link Figma verification was available because `FIGMA_ACCESS_TOKEN` was not present; the production behavior is covered by the mocked route fixture.
