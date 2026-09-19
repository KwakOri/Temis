# GRID Figma Day Component Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시간표 Template Studio의 설정 탭에서 Figma GRID 링크를 일시적으로 분석하고, 사용자가 확인한 요일 카드 하나를 기존 문서를 덮어쓰지 않는 새 Component Set으로 추가한다.

**Architecture:** Figma 링크는 클라이언트 상태에만 두고, 서버 route가 Figma REST API로 GRID 노드와 필요한 export asset을 가져온다. 서버는 AI를 텍스트 의미/바인딩 후보를 제안하는 1차 검토기로만 사용하고, 최종 변환은 결정론적인 importer가 수행한다. 사용자가 검토 결과를 확인한 뒤에만 현재 `StudioTemplateDocument`에 graph/style/asset/component를 병합한다.

**Tech Stack:** Next.js App Router API route, React/TypeScript, existing Template Studio graph/document schema, Figma REST API, existing R2 asset-sync pipeline, existing project check scripts.

**Spec:** `docs/template-studio-day-component-sets-plan.md`의 Component Set 계약을 따르되, 이번 범위는 GRID 요일 카드만이다. `docs/v2-figma-structure-contract.md`와 Git commit `5dda3d92`는 레거시 구현을 직접 호출하지 않고 구조·회전 보정 참고 자료로만 사용한다.

## Global Constraints

- GRID 내부의 요일 카드만 처리한다. `PROFILE`, `top_object`, `board`, `WEEK_DATES`, 전체 페이지 배경은 이번 범위에서 제외한다.
- 링크 하나에 여러 요일 카드가 있으면 후보를 개별 표시하고, 사용자가 선택한 카드 하나만 문서에 추가한다.
- Figma 원본 URL은 `StudioTemplateDocument`, `metadata`, DB payload, save event에 저장하지 않는다.
- 새 결과는 `document.domains.timetable.components`에 추가하고 기존 `entryComponentId`, 기존 component set, 요일 할당을 변경하지 않는다.
- 새 Component Set은 기본적으로 미할당 상태로 추가한다. 사용자가 기존 component-set 선택 UI로 적용한다.
- Figma access token과 OpenAI access token은 서버 환경변수에서만 읽고 브라우저 번들·로그·응답에 포함하지 않는다.
- Figma MCP의 임시 asset URL은 문서에 저장하지 않는다. 서버에서 즉시 다운로드해 data URL로 변환하고 기존 asset sync가 R2 주소로 교체한다.
- `text`와 `flexibleText`는 이름만으로 결정하지 않는다. 의미 역할을 우선하고 Figma auto-resize/layout metadata를 보조 신호로 사용한다.
- 회전 좌표 보정은 import 시점에 한 번만 적용한다. 기존 CSS center-rotation 보정 계약을 재사용하고 renderer에서 좌표를 다시 보정하지 않는다.
- 구현 전 각 작업의 failing check를 먼저 작성하고 실행한다. 기본 검증은 `npm run lint`, `npx tsc --noEmit`, 관련 `check:*` 스크립트로 한다. production build는 프로젝트 규칙상 기본 검증에서 제외한다.
- 현재 worktree의 기존 변경 파일은 되돌리거나 포맷 전역 변경하지 않는다.

## Product Contract

### Input

설정 탭의 `컴포넌트 카드 링크` 입력은 `https://www.figma.com/design/:fileKey/:fileName?node-id=1412-5814` 형식을 받는다. parser는 `/design/` URL, file key, `node-id`를 검증하고 `node-id`의 `-`를 `:`로 정규화한다. 링크에 `node-id`가 없거나 다른 Figma 제품 URL이면 분석하지 않는다.

### Analysis result

분석 결과는 다음 정보를 가진 일시적인 후보다.

```ts
interface StudioFigmaGridCandidate {
  candidateId: string;
  label: string;
  frame: { left: number; top: number; width: number; height: number };
  component: {
    nodes: Record<string, StudioGraphNode>;
    styles: Record<string, StudioStyleRecord>;
    rootNodeId: string;
    assets: StudioAsset[];
  };
  reviews: StudioFigmaNodeReview[];
  warnings: string[];
}

interface StudioFigmaNodeReview {
  sourceNodeId: string;
  label: string;
  sourceType: string;
  suggestedRole:
    | "main_title"
    | "sub_title"
    | "time"
    | "day_label"
    | "date"
    | "status_label"
    | "decoration"
    | "unknown";
  suggestedStudioType: "text" | "flexibleText" | "image" | "shape" | "group";
  suggestedBinding: StudioBinding;
  confidence: number;
  source: "rule" | "ai";
  reason: string;
}
```

후보에 들어간 graph/style/asset ID는 문서 병합 전에 생성한 local ID이며, 후보를 취소하면 폐기한다. 응답에는 원본 URL을 넣지 않는다.

### Text mapping defaults

- `main_title`, `mainTitle`, `title`, `main` 계열 → `flexibleText` + `entry.main_title`
- `sub_title`, `subTitle`, `subtitle`, `sub` 계열 → `flexibleText` + `entry.sub_title`
- `time`, `streamingTime`, `clock` 계열 → `text` + `entry.time`
- `day`, `streamingDay`, `weekday` 계열 → `text` + `day.short_label` 및 `shortUpper`
- `date`, `streamingDate` 계열 → `text` + `day.date` 및 기본 `dateRangeFormat: "day"`
- `status`, `state`, `online`, `offline` 계열 → `text` + `entry.status_label`
- 의미를 확정할 수 없는 TEXT → `text` + `staticText`, warning 표시

AI는 위 후보를 변경할 수 있지만 직접 문서에 쓰지 않는다. 사용자는 각 텍스트 행에서 역할, `text`/`flexibleText`, static/builtin binding을 확인·수정한 뒤 확정한다.

### Image mapping defaults

- 실제 이미지 fill 또는 이미지 export가 필요한 장식 → `image` + `staticAsset`
- 단순 solid fill/vector rectangle → `shape`
- 자식에 semantic TEXT가 없는 장식 group → export asset으로 flatten 가능
- semantic TEXT가 포함된 group → graph group으로 유지
- 회전이 export 결과에 baked-in 된 flatten asset → `rotateDeg: 0`

### Component Set mapping

현재 validator의 base variant 계약을 만족시키기 위해 선택된 GRID 카드는 `online` variant로 만든다. 같은 링크에 명시적인 `offline` variant가 있으면 독립 graph subtree로 함께 만든다. 없으면 `online` subtree를 deep clone하여 독립적인 `offline` variant를 만든다. `multi`, `offlineMemo`는 Figma에서 명시적으로 분석되고 해당 capability가 켜진 경우에만 추가한다. 기존 component-set clone/variant clone 유틸의 독립 root 및 style 복사 규칙을 지킨다.

## File Map

### New files

- `src/types/template-studio-figma.ts` — 분석 응답, node review, candidate, import 결과의 공유 타입.
- `src/utils/template-studio/figma-import/figma-url.ts` — Figma URL parser.
- `src/utils/template-studio/figma-import/figma-rotation.ts` — rotation 단위 정규화와 Figma→CSS center 보정.
- `src/utils/template-studio/figma-import/figma-text-classifier.ts` — 이름 alias, semantic role, text/auto text 결정의 순수 함수.
- `src/utils/template-studio/figma-import/figma-node-converter.ts` — normalized Figma subtree를 current graph/style/asset candidate로 변환.
- `src/utils/template-studio/figma-import/figma-component-import.ts` — candidate를 문서에 새 component set으로 병합하는 순수 mutation 함수.
- `src/services/server/figmaTemplateStudioService.ts` — Figma REST fetch, export URL fetch, data URL 변환.
- `src/services/server/figmaGridReviewService.ts` — AI JSON review와 rules-only fallback.
- `src/app/api/admin/template-studio/figma/analyze/route.ts` — admin-only transient analyze endpoint; DB write 없음.
- `src/components/studio/settings/studio-figma-component-import.tsx` — 링크 입력, 후보 목록, 텍스트 mapping review, confirm UI.
- `scripts/check-template-studio-figma-import.ts` — parser/classifier/rotation/converter/merge 회귀 check.
- `scripts/check-studio-figma-component-import.tsx` — import panel markup and interaction contract check.

### Existing files to modify

- `src/services/templateStudioService.ts` — `analyzeFigmaGridComponent()` API client.
- `src/app/(root)/template-studio/_components/studio-settings-modal.tsx` — Timetable 설정에 `컴포넌트 카드 링크` section 연결.
- `src/app/(root)/template-studio/_components/template-studio-client.tsx` — transient analysis state, document merge callback, selection/status message wiring.
- `scripts/check-studio-settings.tsx` — 새 설정 섹션·라벨 기준선.
- `package.json` — `check:template-studio:figma-import`, `check:studio:figma-component-import` scripts.

## Implementation Tasks

### Task 1: Define the transient Figma import contract and URL parser

**Files:**

- Create: `src/types/template-studio-figma.ts`
- Create: `src/utils/template-studio/figma-import/figma-url.ts`
- Create: `scripts/check-template-studio-figma-import.ts`
- Modify: `package.json`

**Interfaces:**

- Produces `parseFigmaDesignUrl(value: string): { fileKey: string; nodeId: string } | null`.
- Produces the `StudioFigmaGridCandidate`, `StudioFigmaNodeReview`, and API response types used by Tasks 3–6.

- [ ] Write failing checks for a valid `/design/` URL, hyphenated node ID, missing node ID, non-design URL, and invalid file key.

```ts
assert.deepEqual(parseFigmaDesignUrl(validUrl), {
  fileKey: "T2VDXkMPVFa6yEl9FnVvYo",
  nodeId: "1412:5814",
});
assert.equal(parseFigmaDesignUrl("https://www.figma.com/design/file/name"), null);
```

- [ ] Run `npx tsx scripts/check-template-studio-figma-import.ts` and confirm the new parser check fails because the function is absent.
- [ ] Implement strict parser logic without logging or returning the original URL.
- [ ] Run the check again and confirm it passes.
- [ ] Add `check:template-studio:figma-import` to `package.json`.
- [ ] Commit with `git add src/types/template-studio-figma.ts src/utils/template-studio/figma-import/figma-url.ts scripts/check-template-studio-figma-import.ts package.json && git commit -m "feat: define Figma GRID import contract"`.

### Task 2: Extract and test the existing Figma→CSS rotation correction

**Files:**

- Create: `src/utils/template-studio/figma-import/figma-rotation.ts`
- Modify: `scripts/check-template-studio-figma-import.ts`

**Interfaces:**

- Produces `normalizeFigmaRotation(raw: number | undefined): number | undefined`.
- Produces `adjustFigmaRectForCssCenterRotation(input: { left: number; top: number; width: number; height: number; rotateDeg?: number; rotatedWidth?: number; rotatedHeight?: number }): { left: number; top: number; width: number; height: number; }`.

- [ ] Add failing assertions for zero rotation, the historical `160 × 100 / -13.5°` example, a radians input, and a missing size.

```ts
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 31,
    top: 3,
    width: 160,
    height: 100,
    rotateDeg: -13.5,
  }),
  { left: 40.46, top: 19.52, width: 160, height: 100 },
);
```

- [ ] Run the check and confirm the rotation assertions fail.
- [ ] Move the behavior from historical commit `5dda3d92` into the pure utility: keep the unrotated width/height, use rotated absolute bounds when present, otherwise calculate bounds with sine/cosine, and apply the center offset only once.
- [ ] Keep the renderer contract unchanged: imported style stores corrected `left/top` and `rotateDeg`; `studio-renderer.tsx` and timetable preview append only CSS `rotate()`.
- [ ] Run the check and confirm all rotation cases pass.
- [ ] Commit with `git add src/utils/template-studio/figma-import/figma-rotation.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: reuse Figma center rotation correction"`.

### Task 3: Implement semantic text classification and binding suggestions

**Files:**

- Create: `src/utils/template-studio/figma-import/figma-text-classifier.ts`
- Modify: `scripts/check-template-studio-figma-import.ts`

**Interfaces:**

- Produces `classifyFigmaTextNode(input: { name: string; characters: string; textAutoResize?: string; layoutSizingHorizontal?: string; width?: number; height?: number }): { role: StudioFigmaNodeReview["suggestedRole"]; studioType: "text" | "flexibleText"; binding: StudioBinding; confidence: number; reason: string }`.
- Produces `normalizeFigmaLayerName(value: string): string` and alias matching that handles spaces, `_`, `-`, camelCase, and case differences.

- [ ] Add failing checks for `main_title`, `mainTitle`, `title`, `sub_title`, `PM 8:00`, `MON`, `07`, `ONLINE`, and unknown text.
- [ ] Add checks that long/dynamic title roles default to `flexibleText`, while time/day/date/status roles default to `text`.
- [ ] Run the check and confirm the classifier assertions fail.
- [ ] Implement semantic-role-first classification. Use Figma auto-resize metadata only to raise/lower confidence; it must not turn a status/date node into Auto Text solely because its box is flexible.
- [ ] Implement bindings using existing builtin field IDs and `dateRangeFormat: "day"` for date candidates.
- [ ] Return `staticText` for unresolved names and include a reason for the review UI.
- [ ] Run the check and confirm all text cases pass.
- [ ] Commit with `git add src/utils/template-studio/figma-import/figma-text-classifier.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: classify Figma GRID text roles"`.

### Task 4: Add the server-side Figma fetch and transient asset export

**Files:**

- Create: `src/services/server/figmaTemplateStudioService.ts`
- Create: `src/app/api/admin/template-studio/figma/analyze/route.ts`
- Modify: `scripts/check-template-studio-figma-import.ts`

**Interfaces:**

- Produces `fetchFigmaGridNode(source: { fileKey: string; nodeId: string }): Promise<FigmaNodeResponse>`.
- Produces `exportFigmaNodeAsDataUrl(fileKey: string, nodeId: string, format: "png" | "svg"): Promise<{ src: string; mimeType: string; byteSize: number }>`.
- API accepts `{ figmaUrl: string }` and returns `{ success: true; candidates: StudioFigmaGridCandidate[]; warnings: string[] }` without writing a template or asset row.

- [ ] Add a route contract check for invalid payload, invalid URL, and missing server token. The check must assert that errors do not echo the access token or full original URL.
- [ ] Run the route contract check and confirm it fails because the route/service is absent.
- [ ] Implement admin authentication with `requireTemplateStudioAdminActor`.
- [ ] Call Figma `GET /v1/files/:fileKey/nodes?ids=:nodeId` with the server-only `FIGMA_ACCESS_TOKEN`; preserve the node metadata needed for text auto-resize, size, absolute bounds, fills, visibility, children, and rotation.
- [ ] Identify GRID child card candidates without traversing unrelated document roots. Exclude profile/top-object/board/week-date roots from candidate discovery.
- [ ] For image-backed/flattened decorative nodes, call Figma export, download the temporary response URL immediately on the server, and return a supported `data:image/png` or `data:image/svg+xml` URL inside the transient candidate only.
- [ ] Do not return Figma export URLs, MCP asset URLs, access tokens, or original link strings in the response.
- [ ] Add a 10 MiB per-asset response guard. Return a review warning and omit the oversized asset rather than persisting a remote URL.
- [ ] Run the route check and confirm it passes with mocked fetch responses.
- [ ] Commit with `git add src/services/server/figmaTemplateStudioService.ts src/app/api/admin/template-studio/figma/analyze/route.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: analyze GRID components through Figma API"`.

### Task 5: Add AI-assisted review with deterministic fallback

**Files:**

- Create: `src/services/server/figmaGridReviewService.ts`
- Modify: `src/app/api/admin/template-studio/figma/analyze/route.ts`
- Modify: `scripts/check-template-studio-figma-import.ts`

**Interfaces:**

- Produces `reviewFigmaGridNodes(nodes: FigmaReviewInput[]): Promise<StudioFigmaNodeReview[]>`.
- The route reads the fixed server model from `OPENAI_FIGMA_REVIEW_MODEL` and the existing server-only OpenAI token. The UI cannot choose or override the model.

- [ ] Add a rules-only test that returns valid reviews when no OpenAI token/model is available.
- [ ] Add a mocked AI JSON test that rejects unknown roles, invalid node IDs, and invalid `text`/`flexibleText` values instead of trusting arbitrary model output.
- [ ] Run the checks and confirm they fail because the review service is absent.
- [ ] Send only node metadata, layer names, text characters, geometry, and style flags to the model; do not send Figma URLs, export URLs, tokens, or binary assets.
- [ ] Treat Figma names and text as untrusted content in the prompt. Require JSON-only output with source node IDs copied from the input list.
- [ ] Validate the model response against the shared review type. Merge only valid fields and preserve deterministic bindings for unsupported responses.
- [ ] When the model is unavailable or invalid, return rules-based suggestions with `source: "rule"` and a visible warning; analysis remains usable.
- [ ] Run the checks and confirm the fallback and validated AI paths pass.
- [ ] Commit with `git add src/services/server/figmaGridReviewService.ts src/app/api/admin/template-studio/figma/analyze/route.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: add Figma GRID review suggestions"`.

### Task 6: Convert a reviewed Figma subtree into the current Studio graph

**Files:**

- Create: `src/utils/template-studio/figma-import/figma-node-converter.ts`
- Modify: `scripts/check-template-studio-figma-import.ts`

**Interfaces:**

- Produces `convertFigmaGridCandidate(input: { root: FigmaNode; reviews: StudioFigmaNodeReview[]; exportedAssets: StudioAsset[] }): StudioFigmaGridCandidate`.

- [ ] Add failing conversion checks for a group, a text node, an image node, a solid shape, nested relative coordinates, and a rotated text node.
- [ ] Assert that text styles include only supported CSS declarations and that source Figma asset URLs never become `StudioAsset.src`.
- [ ] Run the checks and confirm the converter assertions fail.
- [ ] Convert relative rectangles into `left/top/width/height`; use `figma-rotation.ts` before writing style records.
- [ ] Convert Figma text appearance into existing `textAppearance`/style fields where supported: font family, size, weight, line height, letter spacing, alignment, fill color, opacity, and shadow/stroke warnings.
- [ ] Convert image exports to `image` nodes with `staticAsset` bindings and preserve `fit: "cover"` unless the review explicitly changes it.
- [ ] Convert simple solid fills to `shape`; convert unsupported visual effects to an exported asset and add a warning.
- [ ] Preserve graph parent/child order and add exactly one `meta.entrySlot.index = 0` entry group around the card content when the source does not provide an entry group.
- [ ] Use `createStudioId` for all candidate node/style/asset IDs and ensure no candidate node shares IDs with the current document.
- [ ] Run the checks and confirm the conversion cases pass.
- [ ] Commit with `git add src/utils/template-studio/figma-import/figma-node-converter.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: convert Figma GRID nodes to Studio graph"`.

### Task 7: Merge the candidate as an independent new Component Set

**Files:**

- Create: `src/utils/template-studio/figma-import/figma-component-import.ts`
- Modify: `scripts/check-template-studio-figma-import.ts`

**Interfaces:**

- Produces `applyStudioFigmaGridCandidate(document: StudioTemplateDocument, candidate: StudioFigmaGridCandidate): { ok: true; componentId: StudioTimetableComponentId; rootNodeIds: StudioNodeId[]; warnings: string[] } | { ok: false; reason: string }`.

- [ ] Add failing checks that import creates a new component, leaves `entryComponentId` and all `day.componentId` values unchanged, creates independent online/offline roots and styles, and leaves no source Figma URL in `JSON.stringify(document)`.
- [ ] Add a check that importing the same candidate twice produces unique component IDs and labels.
- [ ] Run the checks and confirm the merge assertions fail.
- [ ] Add candidate assets to `document.assets`, graph nodes to `document.graph.nodes`, styles to `document.styles`, and roots to `document.graph.rootNodeIds`.
- [ ] Add the component under `document.domains.timetable.components` with a unique label derived from the Figma component/card name.
- [ ] Keep the existing `entryComponentId` and day assignments unchanged. Do not auto-assign the new set.
- [ ] Create independent offline fallback roots when the candidate contains only online content; do not point two status variants at the same root.
- [ ] Run `applyStudioTimetableComponentFrames(document)` and return warnings for missing optional statuses or unsupported effects.
- [ ] Run the checks and confirm all merge cases pass.
- [ ] Commit with `git add src/utils/template-studio/figma-import/figma-component-import.ts scripts/check-template-studio-figma-import.ts && git commit -m "feat: import GRID card as new component set"`.

### Task 8: Add the settings-tab review and confirm UI

**Files:**

- Create: `src/components/studio/settings/studio-figma-component-import.tsx`
- Modify: `src/app/(root)/template-studio/_components/studio-settings-modal.tsx`
- Modify: `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- Modify: `src/services/templateStudioService.ts`
- Create: `scripts/check-studio-figma-component-import.tsx`
- Modify: `scripts/check-studio-settings.tsx`

**Interfaces:**

- `TemplateStudioService.analyzeFigmaGridComponent(figmaUrl: string): Promise<StudioFigmaAnalyzeResponse>` calls `POST /api/admin/template-studio/figma/analyze`.
- `StudioSettingsModal` receives `onAnalyzeFigmaGrid` and `onImportFigmaGridCandidate` callbacks; it never writes the link into the document.
- `template-studio-client.tsx` owns the transient link, analysis result, selected candidate, pending/error state, and calls `applyStudioFigmaGridCandidate` only after confirmation.

- [ ] Add failing markup checks for the exact label `컴포넌트 카드 링크`, URL input, 분석 button, candidate selection, text mapping rows, and `새 컴포넌트 세트로 추가` confirmation button.
- [ ] Add a check that rendering/closing the modal does not add `figma`/`url` fields to a sample `StudioTemplateDocument`.
- [ ] Run `npm run check:studio:settings` and the new panel check; confirm they fail before the UI exists.
- [ ] Add the import panel inside the Timetable settings section only when a Timetable domain exists.
- [ ] Keep the raw link in local component state only. Clear it and the candidate after cancel or successful import.
- [ ] Show each candidate separately when a GRID root contains multiple day cards; require one candidate selection before confirmation.
- [ ] Render review rows with editable `text`/`Auto Text`, role, binding, confidence, and warning state. Preserve the candidate’s corrected choices when confirming.
- [ ] Disable analysis/confirm while remote persistence is syncing. Show server errors without exposing tokens or full URLs.
- [ ] On confirm, capture one editor history entry, merge the candidate, select the new component set in the existing component-set UI, keep days unassigned, and show a success message.
- [ ] Add `check:studio:figma-component-import` to `package.json`, update the existing settings baseline, and run both checks.
- [ ] Commit with `git add src/components/studio/settings/studio-figma-component-import.tsx 'src/app/(root)/template-studio/_components/studio-settings-modal.tsx' 'src/app/(root)/template-studio/_components/template-studio-client.tsx' src/services/templateStudioService.ts scripts/check-studio-figma-component-import.tsx scripts/check-studio-settings.tsx package.json && git commit -m "feat: add GRID Figma import review to settings"`.

### Task 9: Verify asset synchronization and document persistence

**Files:**

- Modify: `scripts/check-template-studio-figma-import.ts`
- Modify: `src/utils/template-studio/asset-sync.ts` only if an imported supported data URL is not recognized by the existing parser.
- Modify: `src/hooks/studio/use-studio-template-persistence.ts` only if the existing save pipeline fails to include newly imported assets.

- [ ] Add a check that PNG, JPEG, SVG, and WebP data URLs are planned for upload by `planStudioAssetSync`.
- [ ] Add a check that a candidate containing a temporary Figma URL is rejected before merge rather than persisted.
- [ ] Run `npm run check:studio:asset-sync` and the Figma import check; confirm the checks pass without changing existing asset behavior.
- [ ] If the existing asset pipeline already passes, do not modify it. The expected path is candidate data URL → `ensureAssetsSynced` → R2 patch → document stores stable R2 URL.
- [ ] Commit only if a production change was required, using `fix: sync imported GRID assets through Template Studio`.

### Task 10: Full verification and handoff

**Files:**

- No production file changes unless a verification failure identifies a required fix.

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint` and record existing warnings separately from new errors.
- [ ] Run `npm run check:template-studio:figma-import`.
- [ ] Run `npm run check:studio:figma-component-import`.
- [ ] Run `npm run check:studio:settings`.
- [ ] Run `npm run check:studio:component-sets` and `npm run check:studio:asset-sync`.
- [ ] Run the existing auto-text and timetable runtime checks: `npm run check:template-studio:auto-text` and `npm run check:template-studio:timetable-runtime`.
- [ ] Manually verify the real GRID link in an authenticated admin session: analyze one candidate, change one text suggestion, confirm import, inspect the new Component Set, save draft, reload, and verify that the Figma URL is absent from exported JSON.
- [ ] Do not claim completion until all required checks pass or a specific pre-existing failure is documented with command output and scope.
- [ ] Final handoff must list changed files, the new settings flow, image/text/rotation rules, test commands, and the fact that the new Component Set remains unassigned until the user selects a day.

## Self-review checklist

- GRID-only scope is covered by Tasks 4, 6, and 8; PROFILE/top_object/board/WEEK_DATES are explicitly excluded.
- Image handling is covered by Tasks 4, 6, and 9; temporary Figma URLs cannot reach persisted document state.
- `text` versus `flexibleText` is covered by Tasks 3, 5, 6, and 8 with user override before merge.
- Existing rotation behavior is covered by Task 2 and references commit `5dda3d92`; no second renderer correction is introduced.
- New Component Set/non-overwrite behavior is covered by Task 7 and tested before UI wiring.
- Raw link non-persistence is tested in Tasks 1, 7, and 8.
- AI failure does not block deterministic import; invalid AI output is validated and never trusted directly.
- No document schema version bump is required because `timetable.components`, graph nodes, styles, assets, and existing bindings already support the result.
