# SDD ledger — plan: docs/superpowers/plans/2026-09-12-grid-origin-component-import.md

## Setup

- The repository is currently on the non-main branch template-studio/260903, but it is not a linked worktree and contains pre-existing dirty files.
- Ruling: continue in the current branch instead of creating another worktree — the user requested immediate implementation, the branch is not main/master, and moving only committed state to a new worktree would omit the user's existing dirty work and the untracked plan. Cost if wrong: implementation changes share the current checkout and must be separated carefully at handoff.
- No implementation task has been dispatched yet.

## Pre-flight task/interface scan

| Area | Shared tasks | Produced/consumed contract | Finding and ruling |
|---|---|---|---|
| Origin/review types | Task 1 → Task 2 | Task 1 adds componentId, origin refs, and candidate variant types; Task 2 fetches and fills them | Compatible; Task 2 must not reintroduce direct-child candidate roots. |
| Origin service | Task 2 → Task 3 | Task 2 produces origin roots and placement observations; Task 3 maps descendant samples | Sequential dependency; Task 3 must consume origin roots and never alter source-of-truth geometry. |
| Review types | Task 1 → Task 3/4 | Task 1 adds evidence, source, decision, and candidate metadata; Task 3 produces rule evidence; Task 4 fuses AI | Compatible; rule and AI candidates remain separate until fusion. |
| Analyze handler | Task 2 → Task 3/4/5 | Task 2 groups candidates; Task 3 attaches evidence; Task 4 reviews with context; Task 5 converts final reviews | Shared file is intentionally sequential; each task owns one phase of the pipeline. |
| Text classifier | Task 3 → Task 4 | Task 3 exposes aliases/patterns as signals; Task 4 treats them as one input instead of final authority | No conflict; hardcoded Korean aliases remain out of scope. |
| Review fusion | Task 1/4 | Task 1 defines pure contract; Task 4 implements decision matrix and AI transport integration | Task 1 must only establish pure helpers/types; Task 4 owns contextual AI behavior. |
| Converter/review edits | Task 5 → Task 6/7 | Task 5 produces nested online/offline graphs and variant-local review IDs; Task 6 merges them and Task 7 edits them | Compatible; no single candidate.component fallback remains after Task 5. |
| Candidate merge | Task 6 → Task 7/8 | Task 6 consumes nested variant graphs; Task 7 supplies UI candidate; Task 8 verifies persistence/independence | Compatible; review/evidence metadata stays transient. |
| Test fixtures | Tasks 1–8 | Earlier tasks update shared check fixtures; later tasks extend them for nested variants and E2E evidence | Same check file is intentionally updated incrementally; each task must preserve prior assertions. |
| Task 1 self-consistency | Task 1 | Contract fixtures must fail before implementation and pass after pure helpers | Consistent; required decision fields require listed fixture updates. |
| Task 2 self-consistency | Task 2 | Batched fetch tests precede implementation and verify unique origin IDs | Consistent; incomplete groups are excluded rather than synthesized. |
| Task 3 self-consistency | Task 3 | Evidence tests cover shuffled placement order, online/offline aggregation, and ambiguity | Consistent; coordinate-only matching is explicitly rejected. |
| Task 4 self-consistency | Task 4 | AI prompt, validation, fusion matrix, and fallback tests cover all decision paths | Consistent; AI never supplies bindings directly. |
| Task 5 self-consistency | Task 5 | Converter tests consume final reviews and produce variant-local graphs | Consistent; review edits are marked manual. |
| Task 6 self-consistency | Task 6 | Merge tests reject missing variants and preserve document assignments | Consistent; cloneVariantRoot is removed from the import path. |
| Task 7 self-consistency | Task 7 | UI tests render evidence and nested review state and preserve variant isolation | Consistent; confirmation remains explicit human acceptance. |
| Task 8 self-consistency | Task 8 | Full checks and real-link manual verification cover the complete flow | Consistent; no database/push/PR step is required. |

## Pre-flight rulings

- Ruling: execute Tasks 1–8 serially despite some independent test edits — Tasks 2–5 share the analyze/review contracts and parallel writes would create conflicts. Cost if wrong: slower wall-clock execution, but avoids inconsistent intermediate APIs.
- Ruling: keep AI as a contextual candidate generator and deterministic fusion/validator as the final safety layer — this is required to support irregular designs without allowing arbitrary model output to mutate the graph. Cost if wrong: some valid AI suggestions require manual confirmation.
- Ruling: the newer origin/hybrid plan and the user's clarified GRID requirement override the older spec's direct-card candidate model and online-to-offline clone fallback — the seven GRID children are placement evidence, and an incomplete explicit origin set is rejected. Cost if wrong: older consumers expecting clone fallback must be updated or will receive a safe import rejection instead.
- Ruling: the older spec's phrase that AI is only a first reviewer is interpreted as permission for AI suggestions, not final authority; the new fusion layer preserves deterministic validation and explicit human confirmation. Cost if wrong: review metadata and UI work are larger than the original import-only flow.

## Task progress

- Task 1: complete (commits e403e32..e20ac7d, review clean)
- Task 2: pending
- Task 3: complete (commit fc4d454e; focused final rerun timed out and is documented in task-3-report.md)
- Task 4: pending
- Task 5: pending
- Task 6: pending
- Task 7: pending
- Task 8: pending

## Task 8 verification update

- Added scoped end-to-end fixture/assertions in `scripts/check-template-studio-figma-import.ts` for one component-set candidate, seven shuffled placements, online five/offline two evidence aggregation, origin-only geometry, date/time slots, arbitrary title reviewability, memo/status exclusions, disagreement safety, and graph/source independence.
- Focused import/UI checks, TypeScript, lint, diff check, and the `node --import tsx` fallback checks passed. The exact `tsx` npm commands hit sandbox IPC `EPERM`; `check:studio:component-sets` is not an npm script in this checkout and its actual `check:template-studio:component-sets` counterpart passed.
- Real-link verification was unavailable because `FIGMA_ACCESS_TOKEN` was absent. Task 8 remains pending manual authenticated-link confirmation; see `task-8-report.md`.

## Task 1 review findings

- Important: inferFigmaGridVariantStatus must parse the normalized Figma componentProperties shape where a recognized property value is nested under an object such as { value: "ONLINE" }.
- Important: Task 1 must cover the declared evidence/review enum values and the AI-only fusion path, not only agree/hybrid/auto.
- Minor: the implementation touched figmaGridReviewService.ts to initialize the new required decision field; the report must document this scope exception.

Task 1: fix round 1/5 (3 addressed, 0 open; commits f38b56a..e20ac7d)
Task 1: complete (commits e403e32..e20ac7d, review clean)

## Task 2 review findings

- Critical: the production parser reads components/componentSets from the top-level nodes response, but the official GET file nodes response nests those maps inside each nodes[id] entry alongside document. The fixture must match the documented shape.
- Important: the metadata-derived component-set label is lost when the analyze handler converts the candidate through the legacy converter; the final candidate label must remain the origin metadata label.
- Minor: add a route-level label assertion so the fixture cannot mask label loss.

Task 2: fix round 1/5 (3 addressed, 0 open; commits 4bc453a..e3add73)
Task 2: complete (commits 4bc453a..e3add73, review clean)

## Task 3 review notes

- Initial implementation commit: fc4d454e. The implementer reported the focused check passed before adding the final coordinate-only assertion, but the final rerun hung for 30 seconds and was interrupted; this is an open verification concern for the review.
- High: stable-path mapping only compared child index and node type, so reversed descendants could cross-bind and coordinate-only nodes could be accepted; the focused assertion failed and explained the hang.
- High: collected placement/component-set evidence was not passed into the analyze/review path, leaving Task 3 evidence unused.
- Medium: warning/evidence output could include raw user-controlled names/values; semantic normalization did not expose canonical weekday aliases; date association ignored component-set-only weekday evidence.

Task 3: fix round 1/5 (5 findings to address; commit pending)
Task 3: fix round 1/5 (5 findings addressed in implementation; re-review pending; commits fc4d454..5e15a3f7)
Task 3: fix round 1/5 (5 addressed, 0 implementation findings open; docs commit 54491cb4 verified)
Task 3: complete (commits fc4d454..54491cb4, review clean)

## Task 4 review notes

- Initial implementation commit: 37129ce3. The report records focused import, TypeScript, lint, and diff checks as passing; review must verify the contextual request contract, safe fusion matrix, and invalid-AI fallback paths.
- P1: the array compatibility wrapper copied node.evidence into contextual input, so legacy callers could trigger contextual auto/AI behavior; the wrapper must pass empty evidence and have a regression test with AI configured.

Task 4: fix round 1/5 (1 finding to address; commit pending)
Task 4: fix round 1/5 (1 addressed, 0 open; commit 073951ac)
Task 4: complete (commits 37129ce3..073951ac, review clean)

## Task 5 review notes

- Initial implementation commit: 80ab0522. The report says all three focused checks, TypeScript, lint, and diff checks passed; review must verify independent origin graphs, variant-local edits, and the legacy online projection boundary.
- The report currently names `97a274d0` as the Task 5 commit although the implementation commit is `80ab0522`; treat this as a documentation finding unless code review reveals more.
- P1: UI edits mutate the compatibility `candidate.reviews`, while `applyStudioFigmaReviewEdits` traverses only nested variant reviews after JSON serialization; edits can be discarded before graph mutation.
- P2: the route fixture injects an empty candidate adapter and conditionally checks review capture, so it does not prove both variants receive independent review evidence/context.

Task 5: fix round 1/5 (2 findings to address; commit pending)
Task 5: fix round 1/5 (2 addressed, 0 open; commits 4818e40a..379a01dc)
Task 5: complete (commits 80ab0522..379a01dc, review clean)

## Task 6 review notes

- Initial implementation commit: d9f9e4d8. The report records the focused import/component-import checks, TypeScript, lint, and diff checks as passing; review must verify independent remapping, unchanged existing assignments/frames, and missing-variant rejection before mutation.

Task 6: complete (commit d9f9e4d8, review clean)

## Task 7 review notes

- Initial implementation commit: 67354474. The report records UI/settings checks, TypeScript, lint, and diff checks as passing; review must verify grouped candidate markup and variant-scoped client edits without expanding into Task 8.
- P1: Task 5 compatibility synchronization always overwrites the edited nested online reviews with stale top-level `candidate.reviews`; current UI edits are discarded before conversion.
- P2: the UI check is static markup/source inspection only and does not exercise a callback or assert Online edit isolation/manual state.

Task 7: fix round 1/5 (2 findings to address; commit pending)
Task 7: fix round 1/5 (2 addressed, 0 open; commits 046bbd88..bb0d55bc)
Task 7: complete (commits 67354474..bb0d55bc, review clean)

## Task 8 review notes

- Initial verification commit: d19b588e. Mocked seven-placement/origin assertions and fallback checks pass; exact npm aliases are partly blocked by sandbox tsx IPC and one missing script alias, and authenticated real-link verification is unavailable because `FIGMA_ACCESS_TOKEN` is absent. Review must verify the added assertions and record the manual limitation without treating it as a code failure.
- P1: URL redaction assertions use `new RegExp(privateFigmaUrl)`, so `?` makes the leakage check ineffective; use literal includes or escaped regex.
- P2: route fixture injects a synthetic `toCandidates` graph, while graph isolation is asserted on a separate candidate; it does not prove the seven-placement route result itself converts/imports without placement IDs.

Task 8: fix round 1/5 (2 verification findings to address; commit pending)
Task 8: fix round 1/5 (2 addressed, 0 open; commit df85cdea; authenticated real-link still unavailable)
- P1 follow-up: imported-document redaction checks cover URLs and transient metadata but omit the synthetic secret token; add the literal token assertion.

Task 8: fix round 2/5 (1 verification assertion to address; commit pending)
Task 8: fix round 2/5 (1 addressed, 0 open; commit 18b76079; authenticated real-link still unavailable)
- Final broad review P1: production fetch records mapping evidence but never calls inferFigmaSemanticEvidence, so default review lacks day/date/time semantic signals.
- Final broad review P1: variant status is derived only from placement componentProperties while origin metadata is discarded; explicit origin status must be authoritative with placement status as consistency evidence.
- Final broad review P1: fusion auto-approves any auto role with stable mapping even without role-specific recognized evidence signals.
- Final broad review P1: check-figma-grid-final-review.tsx still supplies legacy single-root candidates and currently fails 3 assertions after clone fallback removal.
- Final broad review P2: nested variant candidate contracts are duplicated in converter and public API remains old single-graph shape, causing unsafe casts.

Final review fix wave 1/5 (5 findings to address; commit pending)
Task 8: automated verification complete (commits d19b588e..18b76079, review clean; authenticated real-link pending FIGMA_ACCESS_TOKEN)

Final review fix wave 1/5 complete (commit 5cf18f02; report final-review-fix-wave-report.md)
- Production semantic inference is wired through origin fetch and default contextual review, with day/date/time auto rules gated by recognized evidence and arbitrary title review.
- Origin metadata/subtree status is authoritative; conflicting placement metadata warns without changing online/offline grouping.
- Final broad-review fixture uses explicit independent online/offline graphs and passes 19/19.
- Shared nested candidate/variant types are public; top-level component/reviews remain optional compatibility projections only.
- Verification: all requested focused checks, `npx tsc --noEmit`, `npm run lint`, and `git diff --check` exited 0. Authenticated real-link verification remains unavailable without `FIGMA_ACCESS_TOKEN`.

## Final review re-review findings

- P1: `resolveFigmaOriginComponent` does not read the official component metadata linkage `containing_frame.containingComponentSet`; an official-shaped response can therefore lose the component-set origin before status grouping. Add support for this shape and a regression fixture.

Final review fix wave 2/5 (1 finding addressed; commits 7a964005..91a4bfa9)
- `resolveFigmaOriginComponent` now supports official `containing_frame.containingComponentSet` metadata, resolves references to the component-set response key, preserves legacy metadata shapes, and has a regression fixture.
- Fresh Luna final review: APPROVED; all six review conditions passed and the dirty-file list was unchanged.
- Fresh controller verification: importer passed; final review 19/19; review confirmation 8/8; component import/settings/component-set/asset-sync/auto-text/timetable checks passed; `npx tsc --noEmit`, `npm run lint`, and `git diff --check` exited 0. `npm test` is unavailable because this checkout has no `test` script.
- Authenticated live Figma verification remains pending because `FIGMA_ACCESS_TOKEN` is not configured.

Task 8: complete (commits d19b588e..91a4bfa9; automated verification and final review clean; authenticated real-link pending FIGMA_ACCESS_TOKEN)
