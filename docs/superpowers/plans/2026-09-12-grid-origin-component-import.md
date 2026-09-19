# GRID Origin Component Import and Hybrid Semantic Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Treat the seven GRID children as placement instances, resolve their Figma origin components, infer semantic data slots from placement evidence, and import the explicit online and offline origin variants as one independent Studio Component Set.

**Architecture:** The server will keep the current transient analysis flow but split analysis into four phases: origin resolution, placement-evidence collection, hybrid semantic review, and origin-graph conversion. Deterministic rules will collect stable node mappings and recognizable value patterns; AI will interpret ambiguous semantic roles from summarized evidence; a deterministic fusion layer will decide whether a result is automatic or requires review. The document merge will receive two independently converted origin graphs and will never clone a placement or one status variant to manufacture another.

**Tech Stack:** Next.js App Router API route, React/TypeScript, Figma REST API, existing Template Studio graph/document schema, existing asset-sync pipeline, OpenAI-compatible JSON review call, project check scripts.

**Spec:** docs/superpowers/plans/2026-09-10-grid-figma-component-import.md, docs/v2-figma-structure-contract.md, and docs/template-studio-day-component-sets-plan.md.

## Global Constraints

- The direct children of the selected GRID frame are placement data only; their page position, rotation, day/date override text, and instance-specific visual overrides must not become the imported component source.
- The origin component set is the source of truth for the imported graph. The given GRID example must collapse its seven placements into one candidate when those placements resolve to one component set with online and offline variants.
- Only explicit online and offline origin variants are in scope. Do not synthesize offlineMemo or multi, and do not classify MEMO/REST DAY as a status variant for this change.
- If an origin group cannot resolve exactly one usable online and one usable offline variant, it must not be importable; return a safe warning/error instead of cloning one status into the other.
- Origin metadata, placement summaries, and semantic evidence are transient analysis data. They may be shown in the review UI but must not be persisted into StudioTemplateDocument, database payloads, save events, or asset records.
- The origin graph, not the placement graph, supplies geometry, styles, assets, default text, and node identity. Placement values are used only to infer semantic bindings and validate origin mapping.
- Placement order and absolute canvas coordinates are not semantic identity. Coordinate regularity may be supporting evidence only; nearest-node or direct-child-index matching is never sufficient.
- Deterministic rules are responsible for structural mapping, known-value detection, invariants, and final safety checks. AI may suggest semantic roles and explain ambiguous text, but it may not invent node IDs, bindings, component variants, or graph structure.
- A high-confidence rule result may be automatic only when the origin mapping is stable and the value pattern is recognized. AI-only arbitrary title/subtitle suggestions remain reviewable suggestions and are never silently treated as deterministic facts.
- Review precedence is explicit user edit, then validated hybrid decision, then deterministic rule result, then safe static/unknown fallback. Disagreement must remain visible in the review metadata.
- For this GRID scope, day, time, and strongly evidenced date fields may be auto-approved; title/subtitle fields require AI/manual review when their semantics cannot be established from structure and samples. ONLINE/OFFLINE is primarily a variant discriminator, not a runtime dynamic text binding.
- Existing entryComponentId, existing component sets, day assignments, runtime values, and unrelated dirty worktree files must remain unchanged.
- Imported origin assets still follow the existing data-URL-to-asset-sync path. Figma temporary URLs and access tokens must never leave the server or enter the document.
- Do not add hardcoded Korean title aliases in this plan. Arbitrary names are handled through placement evidence, AI suggestion, and explicit UI review.
- If a subagent is used during implementation, invoke it with model gpt-5.6-luna.
- Use npm run lint, npx tsc --noEmit, and the related check:* scripts. If sandboxed tsx execution returns EPERM, use node --import tsx scripts/<check-file> as the project instructions require.

## Figma REST Data Contract

The implementation must use the file-nodes response rather than inferring origin from rendered instance text:

1. Request the selected GRID node with GET /v1/files/:fileKey/nodes?ids=:gridNodeId&geometry=paths.
2. Preserve document.componentId, componentProperties, and override metadata for each direct INSTANCE child when present.
3. Read the corresponding component metadata from the response components map. Use its node_id as the origin component node ID and containing_frame.containingComponentSet as the component-set node ID when available.
4. Batch-fetch the unique origin component node IDs with the same nodes endpoint and preserve their component/component-set metadata.
5. Map an instance descendant to an origin descendant using override/component-property identity first, stable origin path second, and structural matching third. If the mapping is ambiguous, emit evidence warnings and do not bind that sample.
6. Resolve status only from origin metadata or the origin subtree. Recognize online and offline; reject offlineMemo, multi, missing, or ambiguous status values for this plan.

Figma's REST node schema defines INSTANCE.componentId, and the nodes response exposes the component metadata needed to determine which component an instance came from. The official references are [Figma file node types](https://developers.figma.com/docs/rest-api/file-node-types/) and [Figma file endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/).

## Candidate, Evidence, and Review Interfaces

The transient types must make the distinction between source graph, placement evidence, and review decision explicit:

~~~ts
type StudioFigmaGridVariantStatus = "online" | "offline";
type FigmaReviewSource = "rule" | "ai" | "hybrid";
type FigmaReviewDecision = "auto" | "needs_review" | "manual";
type FigmaReviewAgreement = "agree" | "rule_only" | "ai_only" | "disagree";

interface FigmaOriginComponentRef {
  componentId: string;
  componentNodeId: string;
  componentSetNodeId: string;
  componentName: string;
  componentSetName?: string;
}

interface FigmaPlacementTextSample {
  placementInstanceId: string;
  variantStatus: StudioFigmaGridVariantStatus;
  originNodeId: string;
  value: string;
}

interface FigmaSemanticEvidence {
  samples: FigmaPlacementTextSample[];
  sampleValues: string[];
  matchedPlacementCount: number;
  distinctValueCount: number;
  signals: Array<
    | "stable_origin_mapping"
    | "known_weekday_set"
    | "date_pattern"
    | "time_pattern"
    | "status_variant_match"
    | "value_variation"
    | "layer_name_alias"
    | "layout_support"
  >;
  mapping: "override" | "stable_path" | "structural" | "ambiguous";
}

interface FigmaReviewCandidate {
  suggestedRole: StudioFigmaNodeReviewRole;
  suggestedStudioType: StudioFigmaNodeReview["suggestedStudioType"];
  confidence: number;
  reason: string;
}

interface StudioFigmaNodeReview {
  sourceNodeId: string;
  label: string;
  sourceType: string;
  suggestedRole: StudioFigmaNodeReviewRole;
  suggestedStudioType: "text" | "flexibleText" | "image" | "shape" | "group";
  suggestedBinding: StudioBinding;
  sourceCharacters?: string;
  confidence: number;
  source: FigmaReviewSource;
  decision: FigmaReviewDecision;
  agreement?: FigmaReviewAgreement;
  evidence?: FigmaSemanticEvidence;
  ruleCandidate?: FigmaReviewCandidate;
  aiCandidate?: FigmaReviewCandidate;
  reason: string;
}
~~~

The origin source and public candidate retain the existing independent-variant shape:

~~~ts
interface FigmaGridOriginVariantSource {
  status: StudioFigmaGridVariantStatus;
  origin: FigmaOriginComponentRef;
  root: FigmaNormalizedNode;
  assets: FigmaTransientAsset[];
  placementEvidence: Record<string, FigmaSemanticEvidence>;
  warnings: string[];
}

interface FigmaGridCandidateSource {
  candidateId: string;
  label: string;
  frame: { left: number; top: number; width: number; height: number };
  placementInstanceIds: string[];
  variants: Record<StudioFigmaGridVariantStatus, FigmaGridOriginVariantSource>;
  warnings: string[];
}

interface StudioFigmaGridVariantCandidate {
  status: StudioFigmaGridVariantStatus;
  origin: FigmaOriginComponentRef;
  component: {
    nodes: Record<string, StudioGraphNode>;
    styles: Record<string, StudioStyleRecord>;
    rootNodeId: string;
    assets: StudioAsset[];
  };
  reviews: StudioFigmaNodeReview[];
  reviewNodeIds?: Record<string, string>;
  reviewDefaults?: Record<string, StudioFigmaNodeReview>;
  warnings: string[];
}

interface StudioFigmaGridCandidate {
  candidateId: string;
  label: string;
  frame: { left: number; top: number; width: number; height: number };
  placementInstanceIds: string[];
  variants: Record<StudioFigmaGridVariantStatus, StudioFigmaGridVariantCandidate>;
  warnings: string[];
}
~~~

FigmaNormalizedNode must add only the source fields needed for origin resolution and evidence mapping, such as componentId, componentProperties, and overrides. The public candidate's origin, placementInstanceIds, and evidence are transient review metadata. applyStudioFigmaGridCandidate must ignore them during document merge.

---

### Task 1: Define origin, evidence, and hybrid-review contracts

**Files:**

- Modify: src/types/template-studio-figma.ts
- Modify: src/services/server/figmaTemplateStudioService.ts
- Create: src/utils/template-studio/figma-import/figma-origin.ts
- Create: src/utils/template-studio/figma-import/figma-review-fusion.ts
- Modify: scripts/check-template-studio-figma-import.ts
- Modify: scripts/check-figma-grid-final-review.tsx
- Modify: scripts/check-figma-grid-review-confirmation.tsx
- Modify: scripts/check-studio-figma-component-import.tsx

**Interfaces:**

- normalizeFigmaNode(raw) preserves componentId, componentProperties, overrides, and the existing visual fields.
- resolveFigmaOriginComponent(input) returns FigmaOriginComponentRef or null from an instance node plus the response component maps.
- inferFigmaGridVariantStatus(input) returns online, offline, or null and never returns offlineMemo or multi.
- groupFigmaGridPlacements(input) returns groups keyed by componentSetNodeId, each with unique origin refs and placement instance IDs.
- fuseFigmaReview(input) returns one validated StudioFigmaNodeReview containing ruleCandidate, optional aiCandidate, agreement, evidence, decision, and the effective suggested binding.

- [ ] Add a raw fixture representing seven INSTANCE children, five pointing to an online origin and two pointing to an offline origin, both sharing one component-set ID, with shuffled child order, different placement transforms, and overridden MON through SUN values.
- [ ] Add assertions that normalizeFigmaNode retains componentId and override metadata while keeping placement geometry diagnostic-only.
- [ ] Add assertions that the seven placements produce one origin group, two unique origin refs, and seven placement IDs.
- [ ] Add status assertions for status=online, status=offline, ONLINE, and OFFLINE; assert that offlineMemo, multi, missing status, and conflicting status signals return null.
- [ ] Add type-level/runtime fixture assertions for evidence samples, review source values, decision values, and rule/AI agreement values.
- [ ] Add a failing fusion assertion showing that a rule result and an agreeing AI result produce source=hybrid and decision=auto.
- [ ] Run node --import tsx scripts/check-template-studio-figma-import.ts and confirm the new assertions fail before implementation.
- [ ] Implement only the contracts and pure helpers in this task; do not change the document merge.
- [ ] Run the focused check again and confirm the origin, evidence, and fusion contract assertions pass.
- [ ] Commit with git add src/types/template-studio-figma.ts src/services/server/figmaTemplateStudioService.ts src/utils/template-studio/figma-import/figma-origin.ts src/utils/template-studio/figma-import/figma-review-fusion.ts scripts/check-template-studio-figma-import.ts && git commit -m "test: define GRID hybrid review contract".

### Task 2: Resolve and fetch unique origin component nodes

**Files:**

- Modify: src/services/server/figmaTemplateStudioService.ts
- Modify: src/services/server/figmaGridAnalyzeHandler.ts
- Modify: scripts/check-template-studio-figma-import.ts

**Interfaces:**

- fetchFigmaGridNode(source) returns the normalized GRID node plus component/component-set metadata maps from the nodes response.
- fetchFigmaGridOriginCandidates(source) returns FigmaGridCandidateSource[] grouped by origin component set, not by direct GRID child.
- FigmaGridCandidateSource contains placementInstanceIds and two origin variant sources; its root fields come from fetched origin nodes, never from a GRID instance root.

- [ ] Extend the mocked Figma fetch fixture so the first nodes request returns GRID children and component metadata, while a second batched nodes request returns the unique online/offline origin component documents.
- [ ] Assert that only unique origin node IDs are requested in the second call even when five or two placements point to the same origin.
- [ ] Assert that the candidate label comes from component-set/origin metadata rather than Component 130, Component 131, or another placement layer name.
- [ ] Assert that changing a placement's absolute x, y, rotation, or overridden MON/07 text does not change the candidate source root, frame, text nodes, asset source IDs, or origin transforms.
- [ ] Add failure cases for a direct child without componentId, an unknown component metadata key, a missing component-set ID, a group with only online origin, and a group with two ambiguous online origins.
- [ ] Run the focused service checks and confirm they fail before the server implementation changes.
- [ ] Implement batched origin fetching using the existing Figma token and response-size guards. Reuse the existing decorative asset exporter against origin node IDs.
- [ ] Filter direct GRID children to visible instance placements for origin grouping. Keep the existing exclusion of profile, topobject, board, weekdates, and background roots.
- [ ] Return one candidate per unique component set with explicit online/offline origins. Put incomplete groups in a redacted warning response and exclude them from importable candidates.
- [ ] Run the focused service checks and confirm the one-candidate/seven-placement assertions pass.
- [ ] Commit with git add src/services/server/figmaTemplateStudioService.ts src/services/server/figmaGridAnalyzeHandler.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: resolve GRID placements to origin variants".

### Task 3: Map placement descendants and infer deterministic semantic evidence

**Files:**

- Create: src/utils/template-studio/figma-import/figma-placement-inference.ts
- Modify: src/utils/template-studio/figma-import/figma-text-classifier.ts
- Modify: src/services/server/figmaTemplateStudioService.ts
- Modify: src/types/template-studio-figma.ts
- Modify: scripts/check-template-studio-figma-import.ts

**Interfaces:**

- mapFigmaPlacementNodesToOrigin(input: { origin: FigmaNormalizedNode; placements: Array<{ instanceId: string; status: StudioFigmaGridVariantStatus; root: FigmaNormalizedNode }> }): { evidenceByOriginNodeId: Record<string, FigmaSemanticEvidence>; warnings: string[] }.
- inferFigmaSemanticEvidence(input: { origin: FigmaNormalizedNode; evidenceByOriginNodeId: Record<string, FigmaSemanticEvidence>; componentSetEvidence?: Record<string, FigmaSemanticEvidence> }): Array<{ sourceNodeId: string; candidate: FigmaReviewCandidate; evidence: FigmaSemanticEvidence }>.
- normalizeFigmaSemanticValue(value) canonicalizes whitespace, case, leading zeros, and weekday aliases without changing the sourceCharacters shown in the UI.

- [ ] Add a fixture where one origin TEXT node receives shuffled MON, TUE, WED, THU, FRI, SAT, and SUN values across the seven placements; assert that one source node receives a day_label candidate regardless of child order or canvas coordinates.
- [ ] Add a fixture where online receives five weekday samples and offline receives two; assert that component-set-level evidence can recognize the same day semantic role without requiring every variant to contain all seven values.
- [ ] Add date assertions requiring a numeric 1–31 pattern plus stable node mapping and same-card association with a day sample; a random numeric title must remain unresolved.
- [ ] Add time assertions for AM/PM hh:mm and HH:mm; add status assertions that ONLINE/OFFLINE agrees with the resolved variant but is not treated as a new component variant.
- [ ] Add arbitrary Korean/English title and subtitle fixtures with varying values. Assert that variation alone does not create a binding; layer/path context may create an AI-review candidate but not an automatic rule decision.
- [ ] Add mapping failures for duplicate structural matches, missing origin descendants, and coordinate-only matches. Assert that ambiguous samples produce warnings and no semantic binding.
- [ ] Add assertions that MEMO, REST DAY, and hidden memo text produce no semantic evidence in this plan.
- [ ] Run node --import tsx scripts/check-template-studio-figma-import.ts and confirm the new inference assertions fail.
- [ ] Implement mapping in this order: override/component-property identity, stable origin descendant path, then node type/name/local-geometry structural signature. Use absolute coordinates only as a tie-breaker and validation signal.
- [ ] Implement order-independent value evidence. Day recognition requires at least two distinct canonical weekday values with stable mapping, and the seven-card fixture must aggregate evidence across the component set.
- [ ] Keep the existing layer-name classifier for direct aliases, but expose its result as one signal among several rather than the final decision.
- [ ] Return evidence samples and signal names without returning raw Figma URLs, tokens, or binary assets.
- [ ] Run the focused check and confirm day/date/time/status evidence and ambiguity behavior pass.
- [ ] Commit with git add src/utils/template-studio/figma-import/figma-placement-inference.ts src/utils/template-studio/figma-import/figma-text-classifier.ts src/services/server/figmaTemplateStudioService.ts src/types/template-studio-figma.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: infer GRID semantics from placement evidence".

### Task 4: Fuse deterministic rules and contextual AI review

**Files:**

- Modify: src/services/server/figmaGridReviewService.ts
- Modify: src/services/server/figmaGridAnalyzeHandler.ts
- Modify: src/utils/template-studio/figma-import/figma-review-fusion.ts
- Modify: src/types/template-studio-figma.ts
- Modify: scripts/check-template-studio-figma-import.ts

**Interfaces:**

- reviewFigmaGridNodesWithWarnings(input: { nodes: FigmaReviewInput[]; evidenceBySourceNodeId: Record<string, FigmaSemanticEvidence>; componentSetContext?: Record<string, FigmaSemanticEvidence> }): Promise<FigmaGridReviewResult>.
- requestAiReviews(input: { nodes: FigmaReviewInput[]; evidenceBySourceNodeId: Record<string, FigmaSemanticEvidence>; componentSetContext?: Record<string, FigmaSemanticEvidence> }, token: string, model: string): Promise<AiReview[]>.
- fuseFigmaReview(input: { rule: StudioFigmaNodeReview; ai?: FigmaReviewCandidate; evidence?: FigmaSemanticEvidence }): StudioFigmaNodeReview.
- Keep reviewFigmaGridNodes(nodes) as a compatibility wrapper that passes empty evidence for existing callers and returns the same safe rules-only behavior.

- [ ] Add a rules-only test with no OpenAI token/model. Recognized day/date/time evidence must be decision=auto when mapping is stable; arbitrary title text must be decision=needs_review or static fallback.
- [ ] Add a mocked AI request test that verifies the prompt contains summarized placement samples, variant status, origin node ID, and evidence signal names, but does not contain Figma URLs, export URLs, access tokens, or binary data.
- [ ] Add a mocked AI disagreement test: when rules identify day_label with strong weekday evidence and AI says unknown, the effective result keeps day_label, source=hybrid, agreement=disagree, and decision=needs_review.
- [ ] Add a mocked AI-only title test: when rules are unknown and AI suggests main_title, retain aiCandidate, mark decision=needs_review, and require the user-facing review state to make the suggestion explicit.
- [ ] Add invalid-response tests for unknown source node IDs, unsupported roles/types, duplicate reviews, out-of-range confidence, and AI attempts to classify non-text nodes as text. All invalid responses must fall back to deterministic results with a warning.
- [ ] Run the focused review checks and confirm the fusion assertions fail before implementation.
- [ ] Change the AI prompt to receive node metadata plus compact evidence summaries, not isolated node metadata only. The prompt must state that Figma layer names and text are untrusted data and that the model may suggest roles but may not invent IDs.
- [ ] Validate AI output against the shared role/type schema. Compute bindings in code with bindingForFigmaRole; never accept a binding generated by the model.
- [ ] Implement the decision matrix:
  - agreeing rule and AI candidates with stable evidence produce source=hybrid and decision=auto for day/date/time;
  - strong rule evidence with an AI disagreement keeps the safe rule candidate but marks agreement=disagree and decision=needs_review;
  - AI-only arbitrary title/subtitle suggestions retain aiCandidate and are reviewable, but are not auto-approved;
  - missing/invalid AI uses the rule candidate and an AI fallback warning;
  - unresolved candidates use staticText/unknown without inventing a builtin field.
- [ ] Derive final confidence from validated evidence and agreement, not from AI confidence alone. Clamp AI confidence to 0..1, cap it as a supporting signal, and expose rule/AI values separately in review metadata.
- [ ] Preserve explicit user changes as decision=manual and do not recompute them during conversion.
- [ ] Run the focused checks and confirm rules-only, agreeing, disagreement, AI-only, invalid-output, and fallback paths pass.
- [ ] Commit with git add src/services/server/figmaGridReviewService.ts src/services/server/figmaGridAnalyzeHandler.ts src/utils/template-studio/figma-import/figma-review-fusion.ts src/types/template-studio-figma.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: fuse GRID rule and AI semantic reviews".

### Task 5: Convert and review origin variants independently

**Files:**

- Modify: src/utils/template-studio/figma-import/figma-node-converter.ts
- Modify: src/services/server/figmaGridAnalyzeHandler.ts
- Modify: src/utils/template-studio/figma-import/figma-review-edits.ts
- Modify: scripts/check-template-studio-figma-import.ts
- Modify: scripts/check-figma-grid-final-review.tsx
- Modify: scripts/check-figma-grid-review-confirmation.tsx

**Interfaces:**

- convertFigmaGridVariant(input: { status: StudioFigmaGridVariantStatus; origin: FigmaOriginComponentRef; root: FigmaNormalizedNode; reviews: StudioFigmaNodeReview[]; exportedAssets: FigmaTransientAsset[] }): StudioFigmaGridVariantCandidate.
- convertFigmaGridOriginCandidate(input: { label: string; frame: { left: number; top: number; width: number; height: number }; placementInstanceIds: string[]; variants: Record<StudioFigmaGridVariantStatus, { status: StudioFigmaGridVariantStatus; origin: FigmaOriginComponentRef; root: FigmaNormalizedNode; reviews: StudioFigmaNodeReview[]; exportedAssets: FigmaTransientAsset[] }> }): StudioFigmaGridCandidate.
- applyStudioFigmaReviewEdits traverses candidate.variants.online and candidate.variants.offline; the existing bindingTouchedSourceNodeIds map remains transient UI state.

- [ ] Add a conversion fixture with distinct online/offline origin roots and seven unrelated placement transforms. Assert that converted online/offline graphs have different roots, styles, and source asset mappings.
- [ ] Assert that the converter never uses a placement root's absolute position or instance override characters when an origin root is supplied.
- [ ] Assert that hybrid review bindings are copied to origin nodes, while evidence, origin refs, and placement IDs remain outside the persisted graph.
- [ ] Assert that MEMO, REST DAY, and hidden memo text do not participate in variant status inference or create an offlineMemo binding.
- [ ] Assert that rotation correction is applied to origin child geometry once, preserving existing nested-transform behavior.
- [ ] Run converter/review checks and confirm the nested-variant assertions fail before the refactor.
- [ ] Extract the existing converter body into convertFigmaGridVariant without visual behavior changes for one origin root, then wrap both roots under the grouped candidate contract.
- [ ] Run hybrid review independently for each origin variant while passing component-set-level evidence so the five online and two offline samples can inform shared semantic roles.
- [ ] Keep source-node IDs and review defaults variant-local so editing online text cannot mutate offline text.
- [ ] Update the review-edit helper to preserve untouched converter-effective types/bindings/assets for both variants and mark changed rows as decision=manual.
- [ ] Run the focused conversion/review checks and confirm they pass.
- [ ] Commit with git add src/utils/template-studio/figma-import/figma-node-converter.ts src/services/server/figmaGridAnalyzeHandler.ts src/utils/template-studio/figma-import/figma-review-edits.ts scripts/check-template-studio-figma-import.ts && git commit -m "refactor: convert GRID origin variants independently".

### Task 6: Merge explicit origin variants as one independent Component Set

**Files:**

- Modify: src/utils/template-studio/figma-import/figma-component-import.ts
- Modify: scripts/check-template-studio-figma-import.ts

**Interfaces:**

- validateCandidate validates both candidate.variants.online.component and candidate.variants.offline.component using the existing graph, style, asset, binding, and document validation rules.
- applyStudioFigmaGridCandidate imports each variant graph independently, remaps IDs/assets independently, and never calls a fallback cloneVariantRoot for the offline variant.

- [ ] Add a failing merge assertion that online and offline roots originate from distinct candidate graphs and retain distinct visual labels/assets.
- [ ] Add assertions that the shared frame is applied to both roots, both variants have direct entry slot 0, and no graph/style/asset IDs collide with existing document data.
- [ ] Add assertions that entryComponentId, every existing day.componentId, existing component frames, and existing variant roots remain byte-for-byte unchanged.
- [ ] Add assertions that importing the same origin candidate twice creates unique component IDs/labels and that JSON.stringify(document) contains neither the Figma URL nor temporary asset URLs.
- [ ] Add a failure assertion for a candidate with only one status variant; the merge must reject it instead of cloning the available graph.
- [ ] Add a validation assertion that evidence, review source, AI reason, and placement IDs cannot enter persisted graph nodes or document metadata.
- [ ] Run the merge checks and confirm the new assertions fail against the current clone-based implementation.
- [ ] Replace the single candidate.component validation/merge path with a loop over the two explicit variant components. Use fresh IDs and style/asset copies per variant while preserving the shared component frame.
- [ ] Keep the existing optional-capability guard: if multi or offlineMemo is enabled and the candidate has no explicit variant for that enabled capability, return a clear error and leave the document unchanged.
- [ ] Keep applyStudioTimetableComponentFrames and restoreExistingComponentFrames after both variants are merged, before final validation and mutation.
- [ ] Run the merge checks and confirm independence, rejection, assignment-preservation, evidence-redaction, and URL-redaction assertions pass.
- [ ] Commit with git add src/utils/template-studio/figma-import/figma-component-import.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: merge explicit GRID origin status variants".

### Task 7: Expose hybrid evidence and nested variant review in the settings UI

**Files:**

- Modify: src/components/studio/settings/studio-figma-component-import.tsx
- Modify: src/app/(root)/template-studio/_components/template-studio-client.tsx
- Modify: scripts/check-studio-figma-component-import.tsx
- Modify: scripts/check-studio-settings.tsx only if the existing baseline needs the new copy.

**Interfaces:**

- The client keeps the raw Figma link, candidates, selected candidate, review edits, and pending flags in transient state only.
- The selected candidate renders one Component Set candidate with Online and Offline review sections.
- onReviewChange and onBindingChange address the nested variant by status and source node ID.
- The review row shows effective role/binding, decision, confidence, rule/AI agreement, sample values, and a concise reason.

- [ ] Add markup checks that seven placements produce one candidate row for one component set, not seven candidate rows.
- [ ] Add markup checks for Online and Offline review sections and a placement summary stating that the seven instances were used as discovery evidence only.
- [ ] Add markup checks for a hybrid review row showing source=hybrid, rule/AI agreement, sample values such as MON/TUE/WED, and needs_review state.
- [ ] Add an interaction check that changing a review row in Online does not change the corresponding Offline row and marks only the edited row as manual.
- [ ] Run node --import tsx scripts/check-studio-figma-component-import.tsx and confirm the grouped/evidence assertions fail before the UI changes.
- [ ] Update candidate selection/status copy from card candidate semantics to Component Set candidate semantics without changing the existing Korean input label or confirm action.
- [ ] Render evidence samples with a bounded display count and keep raw placement identifiers out of persisted state.
- [ ] Render rule/AI disagreement as a warning. Keep the confirm action as the explicit human acceptance step, but never label needs_review as auto-approved.
- [ ] Preserve the existing role/type/binding controls. If a user accepts an AI-only title/subtitle suggestion, set decision=manual before conversion.
- [ ] Update client review state and binding-touched tracking to update the matching nested variant while preserving all other variants.
- [ ] Keep cancel/success clearing behavior and ensure the Figma URL is never handed to applyStudioFigmaGridCandidate or saved into the document.
- [ ] Run the UI checks and confirm grouped-candidate, evidence-display, independent-review, and manual-override assertions pass.
- [ ] Commit with git add src/components/studio/settings/studio-figma-component-import.tsx 'src/app/(root)/template-studio/_components/template-studio-client.tsx' scripts/check-studio-figma-component-import.tsx scripts/check-studio-settings.tsx && git commit -m "feat: review GRID hybrid evidence in settings".

### Task 8: Add end-to-end fixtures and verify against the real GRID link

**Files:**

- Modify: scripts/check-template-studio-figma-import.ts
- Modify: scripts/check-studio-figma-component-import.tsx
- Modify: docs/superpowers/sdd/2026-09-10-grid-figma-component-import/task-10-brief.md if the verification ledger is still active.

- [ ] Add a fixture assertion that the expected GRID example yields one component-set candidate with seven placement IDs, one explicit online origin, and one explicit offline origin.
- [ ] Add an assertion that the candidate origin frame is independent of GRID canvas coordinates and that the imported graph does not contain placement instance IDs as graph source nodes.
- [ ] Add an assertion that the day origin node receives evidence from all seven placements even though its origin component contains only one text node.
- [ ] Add assertions for online five/offline two evidence aggregation, shuffled placement order, different card coordinates, and distinct ONLINE/OFFLINE origin layouts.
- [ ] Add assertions that date/time bindings are inferred from stable repeated slots, arbitrary title text remains reviewable, and MEMO/REST DAY/OFFLINE_MEMO are not inferred.
- [ ] Add an assertion that rule/AI disagreement is visible and does not silently become decision=auto.
- [ ] Add an assertion that optional offlineMemo is neither inferred nor synthesized when the source exposes only online/offline origins.
- [ ] Run the full focused set:

~~~bash
npm run check:template-studio:figma-import
npm run check:studio:figma-component-import
npm run check:studio:settings
npm run check:studio:component-sets
npm run check:studio:asset-sync
npm run check:template-studio:auto-text
npm run check:template-studio:timetable-runtime
npx tsc --noEmit
npm run lint
~~~

- [ ] If npm test is attempted, record that this repository has no test script instead of treating that as a feature failure.
- [ ] In an authenticated admin session, enter the supplied GRID URL and confirm:
  - analysis reports one Component Set candidate for the shared origin set;
  - the seven GRID placements are shown only as a placement/evidence summary;
  - the single origin day text slot is inferred from the placement samples;
  - Online and Offline origin reviews are available independently;
  - hybrid rows show rule/AI agreement or an explicit needs_review warning;
  - confirming creates one new unassigned Component Set with independent Online/Offline roots;
  - switching runtime status changes between the origin variants without requiring OFFLINE_MEMO;
  - existing day assignments and the existing default component remain unchanged;
  - save/reload preserves imported assets and no Figma URL appears in exported document JSON.
- [ ] Run git diff --check and inspect git status --short to confirm only intended implementation/test/plan files changed. Do not stage pre-existing dirty files listed in repository status.
- [ ] Record the real-link manual result and any pre-existing verification limitations in the SDD ledger.

## Self-Review Checklist

- The plan never uses a placed instance's geometry or override text as the component source.
- The plan has explicit tasks for componentId, component metadata, component-set grouping, origin-node fetch, descendant evidence mapping, deterministic semantic inference, contextual AI review, hybrid fusion, nested variant conversion, merge independence, and UI evidence review.
- The seven-card case does not require seven text nodes in the origin component; it uses one origin node plus seven placement samples.
- Placement order is explicitly ignored as semantic identity, and coordinate-only matching is rejected.
- day/date/time rules, arbitrary title/subtitle AI review, status-as-variant semantics, and MEMO/REST DAY exclusion are all covered by tasks and tests.
- AI output is validated, cannot invent IDs or bindings, cannot bypass type constraints, and cannot convert disagreement into automatic approval.
- Manual review precedence and evidence visibility are explicit.
- offlineMemo is explicitly out of scope and is not synthesized.
- Every production change has a corresponding failing fixture/assertion before implementation and a focused passing command after implementation.
- No step requires a new dependency, database mutation, push, PR, or modification of unrelated dirty files.
