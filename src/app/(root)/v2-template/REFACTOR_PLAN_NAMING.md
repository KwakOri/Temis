# v2-template 네이밍/구조 리팩토링 계획

## 1) 목표

- `v2-template` 내부 네이밍 규칙을 일관화한다.
- 레거시 코드와의 결합 지점을 줄인다.
- 큰 파일(특히 builder/editor)을 책임 단위로 분리한다.
- 기존 레거시 템플릿(`time-table` 기존 경로)에는 영향 없이 v2 내부에서만 진행한다.

## 2) 네이밍 규칙 (제안)

### 파일명

- React 컴포넌트 파일: `kebab-case.tsx`
- 유틸/상수 파일: `kebab-case.ts`
- `V2`/`v2_` 접두사는 파일명에서 제거한다. (`v2-template` 경로 자체가 스코프 역할)

### 심볼명

- 컴포넌트: `Template*`, `Scene*`, `Card*`, `Layer*` 등 역할 기반 `PascalCase`
- 훅: `useTemplate*`
- 컨텍스트: `useTemplate*Context`
- 유틸 함수: 파일 스코프가 있으므로 `v2_` 접두사 제거

### 폴더

- `_components/editor`: 편집 셸/패널
- `_components/properties`: 우측 속성 패널
- `_components/scene`: 프리뷰 렌더링
- `_components/legacy-form`: 현재 미사용/레거시 폼 보관

## 3) 1차 파일 리네이밍 맵 (1:1 이동, 동작 변경 없음)

### app/(root)/v2-template/_components

- `builder/V2TemplateBuilderForm.tsx` -> `properties/template-properties-panel.tsx`
- `content/V2CardNodeRenderers.tsx` -> `scene/card-node-renderers.tsx`
- `content/V2SceneRenderer.tsx` -> `scene/scene-renderer.tsx` (2차에서 통합 검토)
- `content/V2SceneStructureRenderer.tsx` -> `scene/scene-structure-renderer.tsx`
- `content/V2TimeTableCell.tsx` -> `scene/card-cell.tsx`
- `content/V2TimeTableContent.tsx` -> `scene/preview-scene.tsx`
- `content/V2TimeTableGrid.tsx` -> `scene/card-grid.tsx`
- `content/v2_highlight.ts` -> `scene/highlight-style.ts`
- `content/v2_style.ts` -> `scene/render-style.ts`
- `editor/V2MobileHeader.tsx` -> `editor/mobile-toolbar.tsx`
- `editor/V2TimeTableControls.tsx` -> `editor/preview-toolbar.tsx`
- `editor/V2TimeTableEditor.tsx` -> `editor/template-editor-shell.tsx`
- `editor/V2TimeTableLayersPanel.tsx` -> `editor/layers-panel.tsx`
- `editor/V2TimeTablePreview.tsx` -> `editor/preview-canvas.tsx`
- `editor/v2_preview_constants.ts` -> `editor/preview-scale.ts`
- `modals/V2ImageCropModal.tsx` -> `modals/image-crop-modal.tsx`
- `modals/V2ImageSaveModal.tsx` -> `modals/image-save-modal.tsx`
- `shared/V2Loading.tsx` -> `shared/loading-screen.tsx`
- `style/V2TemplateFontFaceStyle.tsx` -> `style/template-font-face-style.tsx`
- `tools/V2TimeTableDesignGuideController.tsx` -> `tools/design-guide-controller.tsx`

### form 계열 (현 구조상 레거시)

- `form/V2TimeTableForm.tsx` -> `legacy-form/template-form-legacy.tsx`
- `form/V2MondaySelector.tsx` -> `legacy-form/monday-selector.tsx`
- `form/V2ResetButton.tsx` -> `legacy-form/reset-button.tsx`
- `form/V2TimeTableFormTabs.tsx` -> `legacy-form/template-form-tabs.tsx`
- `form/V2TimeTableInputList.tsx` -> `legacy-form/template-input-list.tsx`
- `form/field-renderers/V2AdaptiveTimeRenderer.tsx` -> `legacy-form/field-renderers/adaptive-time-renderer.tsx`
- `form/field-renderers/V2DescriptionRenderer.tsx` -> `legacy-form/field-renderers/description-renderer.tsx`
- `form/field-renderers/V2ScrollableTimePicker.tsx` -> `legacy-form/field-renderers/scrollable-time-picker.tsx`
- `form/field-renderers/V2TopicRenderer.tsx` -> `legacy-form/field-renderers/topic-renderer.tsx`

## 4) 컨텍스트/훅/타입/유틸 리네이밍 맵

### contexts

- `src/contexts/v2/v2_TemplateRenderConfigContext.tsx`
  -> `src/contexts/v2/template-render-config-context.tsx`
- `src/contexts/v2/v2_TimeTableEditorRuntimeContext.tsx`
  -> `src/contexts/v2/template-editor-runtime-context.tsx`

### hooks

- `src/hooks/v2/useV2TimeTableEditor.ts`
  -> `src/hooks/v2/useTemplateEditor.ts`
- `src/hooks/v2/useV2TimeTableData.ts`
  -> `src/hooks/v2/useTemplateData.ts`
- `src/hooks/v2/useV2TimeTablePersistence.ts`
  -> `src/hooks/v2/useTemplatePersistence.ts`
- `src/hooks/v2/useV2TimeTableState.ts`
  -> `src/hooks/v2/useTemplateState.ts`
- `src/hooks/v2/useV2TimeTableTheme.ts`
  -> `src/hooks/v2/useTemplateTheme.ts`

### types

- `src/types/time-table/v2_template_render_config.ts`
  -> `src/types/time-table/template-render-config.ts`
- `src/types/time-table/v2_template_editor_ui.ts`
  -> `src/types/time-table/template-editor-ui.ts`
- `src/types/time-table/v2_data.ts`
  -> `src/types/time-table/template-data.ts`

### utils

- `src/utils/time-table/v2_template_render_config.ts`
  -> `src/utils/time-table/template-render-config.ts`
- `src/utils/time-table/v2_scene_nodes.ts`
  -> `src/utils/time-table/scene-nodes.ts`
- `src/utils/time-table/v2_data.ts`
  -> `src/utils/time-table/template-data.ts`

## 5) 결합/분리 권장안

### 분리 권장

- `template-editor-shell.tsx`
  - 셸 레이아웃/패널 토글만 담당
  - z-index 계산/section resolver는 `editor/model`로 분리
- `template-properties-panel.tsx` (현재 7k+ 라인)
  - 탭 단위 분리:
    - `schema-panel.tsx`
    - `properties-panel.tsx`
    - `style-panel.tsx`
    - `assets-panel.tsx`
    - `theme-panel.tsx`
    - `export-panel.tsx`
  - 공통 유틸:
    - `properties/style-catalog.ts`
    - `properties/style-groups.ts`
    - `properties/binding-utils.ts`

### 결합 권장

- `scene-renderer.tsx` + `scene-structure-renderer.tsx`는 최종적으로 하나로 합쳐도 된다.
  - 현재 `scene-renderer.tsx`는 단순 passthrough라 책임 분리가 약함.

## 6) 안전한 실행 순서 (커밋 단위)

### Commit A - 준비

- 새 파일명/폴더로 이동만 수행하고 내용은 유지
- 모든 `index.ts` export 업데이트
- 앱 빌드/타입체크 통과 확인

### Commit B - import 경로 정리

- v2-template 내부 import 전부 새 경로로 교체
- contexts/hooks/types/utils 경로도 교체

### Commit C - editor 모델 분리

- `template-editor-shell.tsx`에서 resolver/zIndex 로직 분리
- `editor/model/layer-z-index.ts`
- `editor/model/style-section-resolver.ts`

### Commit D - properties 패널 분해

- 큰 파일에서 탭별 컴포넌트 추출
- 기능 변경 없이 단순 분리만

### Commit E - legacy-form 격리

- 현재 실제 렌더 경로에서 미사용인 form 계열을 `legacy-form`로 이동
- `_components/index.ts` 기본 export에서 제외하거나 `legacy` 네임스페이스로만 노출

### Commit F - 심볼 리네이밍

- `V2*` 타입/컴포넌트/훅 심볼을 역할 기반 이름으로 변경
- 파일명 리네이밍 완료 후 마지막에 수행 (충돌 최소화)

### Commit G - 후처리

- dead export, 미사용 파일, 구 네이밍 alias 제거
- README 업데이트

## 7) 검증 체크리스트

- `pnpm -s tsc --noEmit`
- `pnpm -s lint` (프로젝트에서 사용 중인 린트 명령 기준)
- v2-template 진입 후:
  - 레이어 패널 선택/하이라이트
  - 속성 패널 편집 반영
  - z-index 드래그 정렬
  - 에셋 업로드/기본 에셋 fallback
  - localStorage 저장/복원

## 8) 주의사항

- 현재 워크트리에 아래 파일이 이미 변경되어 있으므로 본 리팩토링 커밋과 섞지 않는다.
  - `src/hooks/v2/useV2TimeTableData.ts`
  - `src/hooks/v2/useV2TimeTableState.ts`
  - `src/hooks/v2/useV2TimeTableTheme.ts`
- 위 3개는 별도 선정리 후 리네이밍 단계에 포함한다.
