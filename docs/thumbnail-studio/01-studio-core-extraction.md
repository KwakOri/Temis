# Phase 1. Studio Core와 Adapter 분리

상태: 계획 완료, 구현 전  
선행 단계:
[Phase 0 — 제품 계약과 문서 모델](./00-product-contract.md),
[Phase 0A — PNG 렌더링 선행 스파이크](./00a-rendering-feasibility-spike.md)  
후속 단계: [Phase 2 — 썸네일 기본 편집기](./02-basic-thumbnail-editor.md)

## 1. 목표

현재 Template Studio의 외형과 범용 편집 기능을 실제 공통 컴포넌트로 분리한다.
기존 시간표 기능은 Timetable Studio Adapter로 다시 연결하고, 동일한 공통 셸을
Thumbnail Studio가 사용할 수 있게 한다.

이 단계가 끝나기 전에는 Thumbnail Studio 기능을 본격적으로 추가하지 않는다.

## 2. 현재 구조와 문제

현재 관리자 편집 화면은 다음 파일에 집중돼 있다.

- `src/app/(root)/template-studio/_components/template-studio-client.tsx`

현재 파일에서 함께 소유하는 책임:

- 문서 상태
- 시간표 상태와 작업 공간
- 선택과 다중 선택
- 실행 취소와 다시 실행
- 클립보드 명령
- 상단 도구 모음
- 좌측 탭과 레이어
- 중앙 캔버스
- 우측 속성
- 설정과 미리보기
- 저장과 발행

구체적인 결합:

- 상단 바 안에 `Cards / Timetable` 작업 공간 전환이 있다.
- 좌측 패널 상단에 `Component Set`과 상태 선택이 있다.
- 좌측 탭 구성이 작업 공간에 따라 바뀐다.
- 우측 패널이 노드, 입력과 시간표 오브젝트를 직접 분기한다.
- 설정 모달이 카드와 시간표 canvas/guide/capability를 모두 받는다.
- 범용 문서 갱신 뒤 시간표 frame 보정이 함께 수행된다.

`StudioCanvasViewport`와 `StudioRenderer`는 이미 별도 컴포넌트이므로 공통 기반의
출발점으로 사용한다.

### 2.1 추출 전 시간표 UI 기준선

공통화 작업을 시작하기 전에 현재 Template Studio의 주요 UI와 동작을 기준선으로
기록한다. 추출 후 깨진 화면을 새 기준으로 굳히지 않기 위한 선행 작업이다.

필수 기준 요소:

- 상단 `Cards / Timetable` 전환
- 캔버스 크기와 guide control
- 좌측 `Component Set`과 상태 선택
- `Layers`, `Presets`, `Inputs`, `Table` 탭
- 시간표 레이어 트리
- 우측 Component Set과 시간표 속성 섹션
- 저장, 발행, Preview와 공유
- 줌과 Fit

기준선 산출물:

- 대표 화면의 브라우저 screenshot
- 요소별 표시 조건 목록
- 핵심 전환과 선택 동작의 짧은 smoke 시나리오
- 추출 후 동일 여부를 확인할 최소 guard

현재 `TemplateStudioClient` 전체는 `useRouter`, React Query와 브라우저 상태에
의존하므로 `renderToStaticMarkup` 하나로 억지로 렌더링하지 않는다.

첫 번째 추출에서 순수 presentational shell을 만든 뒤, 해당 컴포넌트는
`renderToStaticMarkup` 기반의 마크업 guard를 추가할 수 있다. 실제 관리자 route는
얇은 브라우저 smoke로 보완한다.

이 기준선은 상세 테스트 체계 구축이 아니라 대형 컴포넌트 분리의 안전 조건이다.

## 3. 목표 구성

```text
src/components/studio/
├── editor-shell/
│   ├── studio-editor-shell.tsx
│   ├── studio-top-toolbar.tsx
│   ├── studio-left-sidebar.tsx
│   └── studio-properties-panel.tsx
├── layers/
│   └── studio-layer-panel.tsx
├── inspector/
│   ├── studio-inspector-section.tsx
│   └── studio-transform-section.tsx
└── settings/
    └── studio-settings-dialog.tsx

src/hooks/studio/
├── use-studio-document-history.ts
├── use-studio-selection.ts
└── use-studio-clipboard.ts

src/app/(root)/template-studio/_components/
├── timetable-studio-adapter.tsx
└── timetable 전용 패널

src/app/(root)/admin/thumbnail-studio/_components/
└── thumbnail-studio-adapter.tsx
```

실제 경로는 현재 프로젝트의 컴포넌트 배치 관례에 맞춰 조정할 수 있다. 중요한
것은 공통 컴포넌트가 특정 route 폴더 아래의 시간표 타입에 의존하지 않는 것이다.

## 4. Editor Shell

`StudioEditorShell`은 전체 화면 배치만 책임진다.

```ts
type StudioEditorShellProps = {
  themeStyle?: CSSProperties;
  topToolbar: ReactNode;
  leftSidebar: ReactNode;
  canvas: ReactNode;
  propertiesPanel: ReactNode;
  overlays?: ReactNode;
};
```

Shell이 하지 않는 일:

- 문서 저장
- 선택 상태 계산
- 시간표 모드 전환
- 레이어 데이터 변환
- 속성 변경
- PNG 생성

Shell이 소유하는 것:

- 전체 화면 높이와 overflow
- 상단 바 높이
- 좌우 패널 너비
- 중앙 캔버스 확장
- 공통 배경과 경계선
- 반응형 최소 너비 정책

## 5. 상단 도구 모음

### 공통 표시

- 목록으로 이동
- 저장
- 발행
- 캔버스 크기
- 줌 아웃
- 현재 줌
- 줌 인
- Fit
- 설정
- Preview
- 공유 또는 발행본 열기

### 확장 지점

```ts
type StudioTopToolbarProps = {
  backAction: StudioToolbarAction;
  saveAction: StudioAsyncToolbarAction;
  publishAction: StudioAsyncToolbarAction;
  canvasSize: StudioCanvasSize;
  zoom: StudioZoomController;
  settingsAction: StudioToolbarAction;
  previewAction: StudioToolbarAction;
  shareAction?: StudioToolbarAction;
  centerSlot?: ReactNode;
  extraActions?: ReactNode;
};
```

Timetable Adapter:

- `centerSlot`: `Cards / Timetable`
- 선택적 가이드 제어
- 시간표 목록과 미리보기 경로

Thumbnail Adapter:

- `centerSlot`: 비움 또는 캔버스 정보
- 선택적 썸네일 가이드
- 썸네일 목록과 미리보기 경로

공통 상단 컴포넌트가 `activeWorkspaceMode`를 직접 받지 않는다.

## 6. 좌측 사이드바

### 공통 프레임

- 260px 기본 너비
- 선택적 context header
- 탭 행
- 스크롤 콘텐츠
- 활성 탭 스타일
- 패널 빈 상태

```ts
type StudioLeftSidebarProps = {
  contextHeader?: ReactNode;
  tabs: StudioPanelTab[];
  activeTabId: string;
  content: ReactNode;
  onTabChange: (tabId: string) => void;
};
```

### Timetable Adapter

`contextHeader`:

- Component Set 선택
- Component Set 복제와 삭제
- 상태 선택

탭:

- Layers
- Presets
- Inputs
- Table

### Thumbnail Adapter

`contextHeader`를 사용하지 않는다.

탭:

- Layers
- Assets
- Text Presets
- Inputs

## 7. 공통 레이어 패널

공통 레이어 패널은 `StudioNodeGraph`를 기준으로 동작한다.

지원 기능:

- 트리 표시
- 열기와 닫기
- 선택과 다중 선택
- 이름 표시
- 잠금
- 숨김
- 순서 변경
- 부모 변경
- 드롭 가능 여부 표시

패널은 그래프를 직접 변경하지 않고 명령 callback을 호출한다.

```ts
type StudioLayerPanelProps = {
  graph: StudioNodeGraph;
  selectedNodeIds: StudioNodeId[];
  expandedNodeIds: Set<StudioNodeId>;
  capabilities: StudioLayerCapabilities;
  onSelect: StudioLayerSelectHandler;
  onCommand: (command: StudioGraphCommand) => void;
};
```

시간표 composition object는 일반 `StudioNodeGraph`와 모델이 다르므로 초기에는
Timetable Adapter의 전용 레이어 패널을 유지할 수 있다. 다만 컨테이너와 행의
시각 컴포넌트는 공통 primitive를 사용한다.

Thumbnail Studio는 일반 그래프 레이어 패널을 그대로 사용한다.

## 8. 우측 속성 패널

### 공통 프레임

- 선택 타입 아이콘
- 선택 이름
- 선택 개수
- 이름 변경 입력
- 접이식 속성 섹션
- 스크롤과 섹션 간격

```ts
type StudioPropertiesPanelProps = {
  header: StudioSelectionHeaderModel;
  sections: StudioPropertySection[];
  onRename?: (label: string) => void;
};
```

공통 섹션:

- Transform
- Layout
- Visibility
- Layer

Timetable 전용 섹션:

- Component Set
- Day layout
- Timetable composition
- Built-in field
- Capability

Thumbnail 전용 섹션:

- Text appearance
- Image
- Shape
- Binding
- Input policy

섹션 배열은 Adapter에서 만들고 공통 패널은 순서대로 렌더링만 한다.

## 9. 설정 모달

현재 `StudioSettingsModal`을 다음 두 층으로 나눈다.

공통 설정:

- 테마
- 문서 이름과 설명
- 캔버스
- 웹 폰트
- JSON 가져오기와 내보내기
- 원격 문서 다시 불러오기

도메인 설정 슬롯:

- Timetable: 카드 캔버스, 시간표 캔버스, capability, 각 guide
- Thumbnail: 썸네일 캔버스, 배경, 투명 배경, guide와 export

```ts
type StudioSettingsDialogProps = {
  common: StudioCommonSettingsModel;
  domainSections?: StudioSettingsSection[];
};
```

## 10. 공통 상태 훅

### `useStudioSelection`

소유 상태:

- `selectedNodeId`
- `selectedNodeIds`
- 단일 선택
- 토글 선택
- 다중 선택 정리
- 삭제된 노드 선택 해제

시간표 composition 선택은 Timetable Adapter가 별도로 소유한다.

### `useStudioDocumentHistory`

소유 상태:

- undo stack
- redo stack
- 현재 문서 snapshot
- drag/input transaction
- 최대 이력 수

시간표 frame 보정은 이 훅에 포함하지 않는다. 문서 변경 전후에 적용할 도메인
정규화가 필요하면 Adapter가 명시적인 `normalizeDocument` 함수를 전달한다.

```ts
type StudioDocumentHistoryOptions = {
  normalizeDocument?: (document: StudioTemplateDocument) =>
    StudioTemplateDocument;
};
```

Thumbnail Adapter는 시간표 정규화 함수를 전달하지 않는다.

### `useStudioClipboard`

- copy
- cut
- paste
- duplicate
- 새 ID 생성
- 잘라낸 노드 삭제
- 부모와 child ID 복구

시간표 root 잠금과 semantic object 제약은 Timetable Adapter의 capability로
전달한다.

## 11. Adapter 책임

### Timetable Studio Adapter

- 기존 문서 로드와 저장
- `Cards / Timetable` 상태
- 시간표 도메인과 composition
- 카드 상태와 Component Set
- 시간표 전용 layer/inspector/settings
- 기존 runtime preview 경로
- 기존 frame normalization

### Thumbnail Studio Adapter

Phase 1에서는 최소 골격만 만든다.

- 빈 썸네일 문서
- `layers` 기본 탭
- 공통 그래프 선택과 이력
- 공통 캔버스 렌더러
- 시간표 전용 slot 미전달

본격적인 썸네일 패널은 Phase 2부터 추가한다.

## 12. 추출 순서

작은 diff로 다음 순서를 지킨다.

0. 현재 Template Studio UI 기준선과 smoke guard 기록
1. 공통 시각 primitive 추출
2. `StudioEditorShell` 추출 후 기존 Template Studio 연결
3. 상단 도구 모음 추출 후 기존 callback 연결
4. 좌측 sidebar frame 추출
5. 우측 properties frame과 section 추출
6. settings frame 분리
7. 일반 graph용 layer panel 추출
8. selection/history/clipboard 훅 추출
9. 기존 Template Studio를 Timetable Adapter 형태로 정리
10. 최소 Thumbnail Adapter로 동일 셸 렌더링

각 단계에서 기존 `TemplateStudioClient`가 추출한 공통 컴포넌트를 먼저 사용하게
한 뒤 Thumbnail Studio에 연결한다. 공용 컴포넌트를 썸네일 전용 화면에서만
사용하는 중간 상태를 오래 유지하지 않는다.

## 13. 파일 변경 계획

주요 수정:

- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
- `src/app/(root)/template-studio/_components/studio-settings-modal.tsx`
- `src/app/(root)/template-studio/_components/studio-canvas-viewport.tsx`

신규 공통 파일:

- `src/components/studio/editor-shell/*`
- `src/components/studio/layers/*`
- `src/components/studio/inspector/*`
- `src/components/studio/settings/*`
- `src/hooks/studio/*`

신규 썸네일 골격:

- `src/app/(root)/admin/thumbnail-studio/[templateId]/edit/page.tsx`
- `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client.tsx`
- `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-adapter.tsx`

## 14. 완료 조건

- 두 Studio가 같은 `StudioEditorShell`을 사용한다.
- 두 Studio가 같은 상단, 좌측과 우측 패널 프레임을 사용한다.
- Thumbnail Studio에 `Cards / Timetable` 전환이 없다.
- Thumbnail Studio에 `Component Set`, 상태와 `Table` 탭이 없다.
- Thumbnail Studio 우측에 시간표 전용 속성이 없다.
- 공통 컴포넌트가 `StudioTimetableDomain`을 import하지 않는다.
- 기존 Template Studio의 시간표 Adapter가 기존 기능을 계속 제공한다.
- 추출 전 기록한 시간표 UI 기준 요소가 추출 후에도 유지된다.
- 빈 썸네일 문서가 공통 캔버스와 레이어 패널에 나타난다.
- 공통 UI 변경이 두 편집기에 함께 반영되는 단일 구현 구조다.

## 15. 이 단계에서 하지 않는 일

- 다중 아웃스트로크
- 텍스트 프리셋
- 이미지 에셋 패널
- 사용자 런타임
- DB 종류 컬럼 적용
- Template Hub 통합
- 대규모 디렉터리 재배치
- 상세 테스트 계획 작성
