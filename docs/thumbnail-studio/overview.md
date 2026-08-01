# Thumbnail Studio 전체 기능 계획

- 상태: 기능 계획
- 기준 브랜치: `features/template-system`
- 작성일: 2026-07-30
- 대상: 썸네일 템플릿 제작용 Studio와 템플릿 사용자용 썸네일 편집 화면

## 1. 문서 목적

현재 `template-studio`에는 문서 그래프, DOM 렌더러, 캔버스 뷰포트, 레이어 조작, 입력 바인딩, 에셋, 웹 폰트, 저장·발행·런타임 렌더링 등 재사용 가능한 기반이 이미 존재한다.

다만 현재 편집기 화면은 시간표 제작을 중심으로 성장하면서 다음 기능이 하나의 큰 클라이언트 컴포넌트에 함께 들어가 있다.

- 시간표 일자와 항목 편집
- 시간표 컴포지션과 카드 배치
- 상태 및 컴포넌트 변형
- 시간표 전용 입력과 미리보기
- 일반적인 선택, 레이어, 이력, 복사·붙여넣기, 인스펙터

새 Thumbnail Studio는 이 화면을 그대로 복제하지 않고, 기존 Studio의 범용 기반만 분리해 사용한다. 썸네일에 필요한 기능은 별도 도메인으로 구성하고, 시간표 전용 개념이 썸네일 문서나 UI에 유입되지 않게 한다.

이 문서는 상세 테스트 케이스나 검증 절차보다 다음 내용을 중심으로 개발 방향을 정한다.

- 제공할 사용자 기능
- 편집기 화면과 사용 흐름
- 기존 Studio에서 재사용할 범위
- 썸네일 문서와 텍스트 효과 모델
- 단계별 구현 범위와 완료 결과

## 2. 제품 목표

### 2.1 핵심 목표

관리자는 별도의 Thumbnail Studio에서 썸네일 템플릿을 제작하고 발행할 수 있다.

템플릿 사용자는 관리자가 노출한 텍스트와 이미지 입력값만 변경하면서 결과를 실시간으로 확인하고 PNG로 내려받을 수 있다.

특히 일반 CSS 속성 입력만으로 다루기 어려운 다음 표현을 편집기 기능으로 제공한다.

- 한 텍스트에 여러 개의 아웃스트로크 중첩
- 아웃스트로크별 색상과 두께 조절
- 텍스트 그림자
- 텍스트 채우기와 효과 프리셋
- 자동 크기 조절 텍스트와 효과 레이어의 정확한 동기화

### 2.2 성공 상태

초기 버전의 성공 상태는 다음과 같다.

1. 관리자가 빈 썸네일 문서를 만들 수 있다.
2. 텍스트, 이미지, 그룹, 기본 도형을 캔버스에 배치할 수 있다.
3. 레이어와 인스펙터를 통해 위치, 크기, 회전, 스타일을 조절할 수 있다.
4. 텍스트에 여러 개의 외곽선과 그림자를 적용하고 프리셋으로 재사용할 수 있다.
5. 텍스트와 이미지 중 사용자에게 노출할 항목을 입력 필드로 지정할 수 있다.
6. 템플릿 사용자가 입력값을 바꾸면 동일한 렌더러로 결과를 미리 볼 수 있다.
7. 작성 화면과 사용자 화면에서 같은 결과를 PNG로 내보낼 수 있다.
8. 기존 시간표 Template Studio는 동작과 문서 호환성을 유지한다.

## 3. 제품 구성

Thumbnail Studio는 역할이 다른 두 화면으로 구성한다.

### 3.1 관리자용 Thumbnail Studio

템플릿 원본을 설계하는 전체 편집 화면이다.

관리자가 할 수 있는 작업:

- 캔버스 크기와 배경 설정
- 오브젝트 추가, 이동, 크기 변경, 회전
- 레이어 순서와 그룹 구조 편집
- 텍스트와 이미지 스타일 편집
- 중첩 텍스트 효과 편집
- 사용자 입력 필드 생성과 오브젝트 연결
- 에셋과 웹 폰트 관리
- 미리보기, 저장, 발행

### 3.2 사용자용 Thumbnail Editor

발행된 템플릿을 실제 콘텐츠로 만드는 제한형 편집 화면이다.

사용자가 할 수 있는 작업:

- 관리자가 공개한 텍스트 값 변경
- 관리자가 공개한 이미지 교체
- 이미지가 허용된 경우 초점이나 맞춤 방식 조절
- 실시간 결과 미리보기
- PNG 다운로드

초기 버전에서는 사용자가 레이어를 자유롭게 이동하거나 템플릿 구조를 변경하지 않는다. 템플릿의 디자인 안정성을 유지하는 입력 중심 편집을 기본 정책으로 한다.

자유 배치형 사용자 편집은 초기 범위에서 제외하고, 향후 별도 편집 권한 모델로 확장한다.

## 4. 핵심 설계 원칙

### 4.1 하나의 Studio 기반, 분리된 도메인

시간표와 썸네일은 다음 기반을 공유한다.

- 문서 그래프
- 기본 노드와 트리 구조
- 캔버스 렌더링
- 뷰포트
- 선택 상태
- 편집 이력
- 레이어 명령
- 입력 바인딩
- 에셋과 폰트
- 저장, 개정, 발행
- 런타임 미리보기와 이미지 내보내기

반면 다음 도메인 기능은 서로 분리한다.

- 시간표의 일자, 항목, 카드 컴포지션, 상태 변형
- 썸네일의 텍스트 효과, 효과 프리셋, 대표 이미지 입력

문서 저장 인프라는 공유하되 템플릿 종류를 명시적으로 구분한다.

```ts
type StudioTemplateKind = "timetable" | "thumbnail";
```

### 4.2 편집기 기본 틀은 동일한 공통 컴포넌트 사용

Thumbnail Studio의 관리자 편집 화면은 현재 Template Studio와 같은 기본 틀과 조작 방식을 사용한다. 두 편집기를 비슷하게 보이도록 따로 구현하지 않고, 다음 UI를 실제 공통 컴포넌트로 공유한다.

- 상단 도구 모음의 기본 구조
- 왼쪽 사이드바와 레이어 패널
- 중앙 캔버스와 뷰포트
- 오른쪽 속성 패널과 공통 속성 섹션
- 패널 접기, 크기, 간격과 같은 편집기 레이아웃
- 선택, 다중 선택, 드래그, 단축키, 줌과 팬의 조작 방식
- 저장 상태, 실행 취소와 다시 실행의 표시 방식

목표 공통 단위:

- `StudioEditorShell`
- `StudioTopToolbar`
- `StudioLeftSidebar`
- `StudioLayerPanel`
- `StudioCanvasViewport`
- `StudioPropertiesPanel`
- 공통 속성 섹션
- `useStudioDocumentHistory`
- `useStudioSelection`
- 범용 그래프 명령과 클립보드 명령
- 공용 텍스트 렌더러

공통 셸은 도메인별 UI를 슬롯이나 설정으로 주입받는다.

```ts
type StudioEditorShellConfig = {
  leftPanelTabs: StudioPanelTab[];
  propertySections: StudioPropertySection[];
  toolbarActions: StudioToolbarAction[];
};
```

예를 들어 레이어 탭, 변환 속성, 캔버스 뷰포트는 두 편집기가 같은 구현을 사용한다. 시간표의 일자·항목 패널과 썸네일의 에셋·텍스트 프리셋 패널만 각 도메인이 공통 셸에 추가한다.

현재 `TemplateStudioClient` 전체를 한 번에 범용화하거나 복제하지는 않는다. 먼저 기본 레이아웃과 범용 패널을 실제 공유 컴포넌트로 추출하고, 시간표 전용 상태와 패널은 기존 위치에 유지한다. 공통 기반 추출은 Thumbnail Studio 개발에 필요한 범위에서 점진적으로 진행한다.

두 편집기의 공통 UI를 파일 복사로 나누지 않는 것을 원칙으로 한다. 공통 레이어나 속성 UI를 변경하면 Template Studio와 Thumbnail Studio에 함께 반영되어야 한다.

#### 4.2.1 공통 프레임과 도메인 기능의 실제 분리 경계

현재 `TemplateStudioClient`의 화면은 공용 UI와 시간표 전용 UI가 하나의 JSX 트리 안에 섞여 있다. 따라서 현재 상단 바, 좌측 패널, 우측 패널을 통째로 Thumbnail Studio에 가져다 쓰지 않는다.

각 영역을 다음과 같이 나눈다.

| 영역 | 공통으로 분리할 부분 | Template Studio에만 남길 부분 | Thumbnail Studio에서 넣을 부분 |
| --- | --- | --- | --- |
| 전체 화면 | 상단·좌측·캔버스·우측의 배치, 크기와 테마 | 없음 | 없음 |
| 상단 왼쪽 | 목록 이동, 저장, 발행 버튼의 UI와 상태 표현 | 시간표 목록 경로와 시간표 저장 동작 연결 | 썸네일 목록 경로와 썸네일 저장 동작 연결 |
| 상단 중앙 | 캔버스 크기 표시 영역과 확장 슬롯 | `Cards / Timetable` 작업 공간 전환 | 썸네일 캔버스 정보 또는 썸네일 전용 도구 |
| 상단 오른쪽 | 줌, Fit, 설정, 미리보기, 공유의 UI | 시간표 미리보기와 공유 동작 연결 | 썸네일 미리보기와 공유 동작 연결 |
| 가이드 도구 | 가이드 표시와 투명도 UI를 선택적 공용 도구로 분리 | 카드·시간표 가이드 상태와 에셋 | 썸네일 가이드 상태와 에셋 |
| 좌측 패널 프레임 | 패널 너비, 탭 행, 스크롤, 선택 스타일 | `Component Set`, 상태 선택, `Table`, 시간표 프리셋 | `Layers`, `Assets`, `Text Presets`, `Inputs` |
| 레이어 | 그래프 트리, 선택, 잠금, 숨김, 정렬과 드래그 UI | 시간표 컴포지션 전용 레이어 해석 | 일반 썸네일 그래프 노드 |
| 중앙 캔버스 | `StudioCanvasViewport`, 줌, 팬, 선택 표시 | `StudioTimetablePreview`, 시간표 레이어 이동 | `StudioRenderer`, 썸네일 노드 이동 |
| 우측 패널 프레임 | 헤더, 이름 입력, 접이식 속성 섹션, 스크롤 | 일자·컴포넌트 세트·시간표 배치·내장 필드 | 텍스트 효과·이미지·도형·썸네일 입력 |
| 설정창 | 모달 프레임, 테마, 폰트, JSON, 공통 캔버스 설정 | 시간표 capability, 카드·시간표 캔버스와 가이드 | 썸네일 캔버스, 배경, 내보내기 설정 |

공통 컴포넌트가 `activeWorkspaceMode`, `timetableDays`, `cardStatusOptions`, `StudioTimetableDomain` 같은 시간표 상태를 직접 참조하지 않게 한다. 공통 컴포넌트는 표시할 값, 활성화 상태와 이벤트 핸들러만 전달받는다.

```ts
type StudioTopToolbarProps = {
  navigation: StudioNavigationAction;
  save: StudioAsyncAction;
  publish: StudioAsyncAction;
  canvasSize: StudioCanvasSize;
  zoom: StudioZoomControls;
  centerSlot?: ReactNode;
  extraActions?: ReactNode;
};
```

Template Studio 컨테이너는 `centerSlot`에 `Cards / Timetable` 전환을 넣는다. Thumbnail Studio는 이 슬롯을 비워두거나 썸네일 전용 도구만 넣는다. 따라서 상단 바의 외형은 같지만 시간표 전용 전환은 썸네일 화면에 렌더링되지 않는다.

좌측과 우측 패널도 같은 방식을 사용한다.

```ts
type StudioLeftSidebarProps = {
  contextHeader?: ReactNode;
  tabs: StudioPanelTab[];
  activeTabId: string;
  content: ReactNode;
};

type StudioPropertiesPanelProps = {
  selectionHeader: StudioSelectionHeader;
  sections: StudioPropertySection[];
};
```

`contextHeader`는 Template Studio의 `Component Set` 및 상태 선택 영역에 사용한다. Thumbnail Studio에서는 이를 전달하지 않는다. 속성 패널은 공통 변환 섹션 뒤에 도메인 컨테이너가 만든 섹션 목록을 합성한다.

#### 4.2.2 공통 UI와 도메인 상태의 소유권

두 편집기는 다음과 같이 구성한다.

```text
Studio Core
├── 화면 프레임과 공통 패널
├── 범용 문서·선택·이력·그래프 명령
└── 도메인 상태를 알지 않는 공통 UI

Timetable Studio Adapter
├── 시간표 상태와 명령
├── Cards / Timetable 작업 공간 전환
├── Component Set과 상태 선택
└── 시간표 전용 속성 섹션

Thumbnail Studio Adapter
├── 썸네일 상태와 명령
├── 에셋과 텍스트 프리셋 탭
├── 텍스트 효과 명령
└── 썸네일 전용 속성 섹션
```

공통 UI는 레이아웃과 표현을 소유하고, 각 Adapter는 도메인 상태와 동작을 소유한다. 이 경계를 지키면 Template Studio의 시간표 기능을 유지하면서 Thumbnail Studio에는 필요한 공용부만 가져갈 수 있다.

### 4.3 작성 화면과 결과 화면은 같은 렌더러 사용

다음 세 지점은 동일한 그래프 해석과 텍스트 렌더링을 사용해야 한다.

- 관리자 편집 캔버스
- 사용자 런타임 미리보기
- PNG 내보내기 대상

작성 화면만 별도 방식으로 효과를 그리면 실제 다운로드 결과가 달라질 수 있으므로, 표현 기능은 편집기 UI가 아니라 공용 렌더러에 구현한다.

동일한 렌더러 사용은 필요 조건이지만 충분 조건은 아니다. PNG rasterizer가
공용 renderer의 CSS와 폰트를 보존하는지는 Phase 0A에서 별도로 확인한다.

### 4.4 논리 오브젝트와 시각 효과 레이어 분리

중첩 아웃스트로크를 구현하기 위해 동일한 텍스트를 여러 그래프 노드로 복제하지 않는다.

그래프에는 텍스트 오브젝트 하나만 존재하고, 렌더러가 내부적으로 필요한 시각 레이어를 생성한다.

이 원칙으로 다음 동작을 일관되게 유지한다.

- 레이어 패널에서 텍스트가 하나로 표시됨
- 드래그와 리사이즈 대상이 하나임
- 바인딩 값이 하나임
- 접근성 텍스트가 중복 노출되지 않음
- 복사·붙여넣기와 그룹화가 한 오브젝트 기준으로 동작함

### 4.5 DOM 기반을 우선하되 PNG 충실도 먼저 확인

현재 Studio의 DOM 렌더러를 첫 후보로 사용한다. 다만 같은 DOM을 사용해도
PNG rasterizer가 stroke, shadow와 웹 폰트를 다르게 처리할 수 있으므로
[Phase 0A 선행 스파이크](./00a-rendering-feasibility-spike.md)에서 실제 결과를
먼저 비교한다.

`html-to-image`와 `modern-screenshot` 중 표준 하나를 선택하고, DOM effect layer가
기준을 만족하지 못할 때만 SVG text 또는 Canvas 대안을 검토한다. 초기 기능을
위해 Fabric.js, Konva.js 같은 별도 캔버스 프레임워크를 선제적으로 도입하지
않는다.

## 5. 기능 범위

### 5.1 문서와 캔버스

#### 캔버스 생성

- 기본 썸네일 크기: 1280 × 720
- 자주 쓰는 크기 프리셋 제공
- 사용자 정의 너비와 높이
- 캔버스 배경색
- 캔버스 배경 이미지
- 투명 배경 허용 여부

초기 크기 프리셋 후보:

- YouTube 썸네일: 1280 × 720
- 가로형 카드: 1200 × 630
- 정사각형: 1080 × 1080
- 세로형: 1080 × 1350

#### 캔버스 탐색

- 확대와 축소
- 화면에 맞추기
- 100% 보기
- 패닝
- 현재 확대 비율 표시
- 선택 오브젝트로 화면 이동

#### 배치 보조

- 방향키 이동
- 보조키를 이용한 큰 단위 이동
- 캔버스 중앙과 가장자리 기준 정렬
- 여러 오브젝트 간 정렬
- 여러 오브젝트 간 간격 분배

스마트 가이드와 스냅은 기본 정렬 기능 이후 확장한다.

### 5.2 오브젝트

#### 지원 노드

초기 지원 노드:

- `group`: 여러 오브젝트의 묶음과 컨테이너
- `text`: 고정 크기 텍스트
- `flexibleText`: 영역에 맞게 글자 크기가 조절되는 텍스트
- `image`: 이미지
- `shape`: 배경 블록과 강조 영역용 기본 도형

`shape`의 초기 범위:

- 사각형
- 둥근 사각형
- 배경색
- 투명도
- 테두리

복잡한 벡터 패스와 자유 도형 편집은 초기 범위에서 제외한다.

#### 공통 조작

- 선택과 다중 선택
- 이동
- 너비와 높이 변경
- 회전
- 복제
- 복사, 잘라내기, 붙여넣기
- 삭제
- 잠금
- 숨김
- 그룹화와 그룹 해제
- 부모 그룹 변경
- 앞으로 보내기와 뒤로 보내기
- 맨 앞과 맨 뒤로 보내기

#### 공통 속성

- 이름
- 위치
- 너비와 높이
- 회전 각도
- 투명도
- 표시 여부
- 잠금 여부
- 오버플로 처리

### 5.3 레이어 패널

레이어 패널은 문서 그래프의 계층을 그대로 보여준다.

제공 기능:

- 트리 열기와 닫기
- 이름 변경
- 단일 및 다중 선택
- 드래그를 통한 순서 변경
- 드래그를 통한 그룹 이동
- 잠금과 숨김 토글
- 선택된 레이어로 캔버스 포커스 이동
- 노드 종류별 아이콘
- 입력 필드에 연결된 오브젝트 표시

텍스트 효과의 내부 시각 레이어는 레이어 패널에 별도 노드로 노출하지 않는다. 사용자는 텍스트 노드의 인스펙터에서 효과 목록을 편집한다.

### 5.4 인스펙터

오른쪽 인스펙터는 선택 대상에 따라 섹션을 바꾼다.

공통 섹션:

- 변환
- 정렬
- 투명도와 표시
- 레이어 동작

텍스트 섹션:

- 내용
- 폰트
- 크기
- 굵기
- 줄 높이
- 자간
- 정렬
- 자동 크기 조절 정책
- 채우기
- 외곽선
- 그림자
- 효과 프리셋
- 입력 바인딩

이미지 섹션:

- 원본 에셋
- 채우기 방식
- 맞춤 방식
- 오브젝트 위치
- 초점
- 모서리
- 투명도
- 입력 바인딩

도형 섹션:

- 채우기
- 테두리
- 모서리 반경
- 투명도

그룹 섹션:

- 배경
- 패딩
- 자식 오버플로
- 그룹 크기 정책

### 5.5 텍스트 기능

#### 기본 편집

- 캔버스 더블 클릭을 통한 직접 텍스트 편집
- 인스펙터를 통한 내용 편집
- 여러 줄 텍스트
- 가로 정렬
- 세로 정렬
- 줄 높이와 자간
- 웹 폰트 선택
- 고정 글자 크기
- 영역에 맞춘 자동 글자 크기
- 최소 및 최대 글자 크기

#### 텍스트 채우기

초기 지원:

- 단색
- 투명도

후속 확장:

- 선형 그라데이션
- 방사형 그라데이션
- 이미지 또는 텍스처 채우기

#### 중첩 아웃스트로크

한 텍스트에 여러 외곽선을 추가할 수 있다.

각 외곽선의 속성:

- 활성화 여부
- 이름
- 색상
- glyph 바깥쪽 실효 두께
- 투명도
- 표시 순서

효과 목록은 사용자가 추가, 삭제, 복제, 재정렬할 수 있다.

외곽선은 시각적으로 가장 바깥쪽 효과부터 뒤에 렌더링하고, 마지막에 실제 텍스트 채우기를 렌더링한다. 각 레이어는 동일한 글자 크기, 줄바꿈, 자간, 줄 높이와 정렬 결과를 공유한다.

#### 그림자

초기 지원:

- 색상
- X 오프셋
- Y 오프셋
- 블러
- 투명도

초기에는 텍스트당 그림자 하나를 제공한다. 여러 그림자가 실제 템플릿 요구로 확인되면 외곽선과 같은 배열 구조로 확장한다.

#### 자동 크기 텍스트 동기화

`flexibleText`는 시각 레이어마다 글자 크기를 따로 계산하지 않는다.

공용 텍스트 렌더러가 다음 결과를 한 번 계산한다.

- 최종 글자 크기
- 줄바꿈 결과
- 줄별 배치
- 전체 텍스트 영역

채우기, 외곽선, 그림자 레이어가 이 결과를 공유한다. 이를 위해 기존 자동 크기 텍스트 컴포넌트의 내부 계산 결과를 공용 측정 단계로 분리한다.

#### 선택 영역과 클리핑

외곽선과 그림자는 원래 텍스트 박스 바깥으로 확장될 수 있다.

렌더러와 편집기는 효과의 최대 확장 범위를 계산해 다음에 반영한다.

- 편집 중 시각적 잘림 방지
- 선택 표시 영역
- 그룹 오버플로
- 캔버스 경계에서의 PNG 결과

문서상의 위치와 크기는 논리 텍스트 박스를 기준으로 유지하고, 효과 확장 범위는 렌더링 메타데이터로 계산한다.

### 5.6 텍스트 효과 프리셋

자주 쓰는 텍스트 스타일을 프리셋으로 저장한다.

프리셋에 포함할 수 있는 값:

- 폰트와 굵기
- 글자 크기 정책
- 자간과 줄 높이
- 텍스트 채우기
- 외곽선 목록
- 그림자

프리셋 기능:

- 새 프리셋 만들기
- 현재 텍스트에서 프리셋 만들기
- 프리셋 적용
- 이름 변경
- 복제
- 삭제
- 미리보기 카드

프리셋 적용 시 문서는 프리셋을 실시간 참조하지 않고 현재 설정의 복사본을 저장한다.

```ts
type StudioTextPresetReference = {
  source: "builtin" | "custom";
  presetId: string;
  presetVersion: number;
};
```

노드에는 적용 출처를 기록할 수 있지만 실제 렌더링은 노드에 복사된 설정을 기준으로 한다. 따라서 프리셋이 변경되어도 이미 발행된 템플릿의 디자인은 자동으로 바뀌지 않는다.

초기에는 프로젝트 공용 프리셋을 제공하고, 개인 프리셋은 권한과 소유권 정책이 정해진 뒤 확장한다.

### 5.7 이미지와 에셋

#### 이미지 오브젝트

- 에셋 선택
- 새 이미지 업로드
- 교체
- 원본 비율 유지
- `cover`, `contain`, `fill`
- 오브젝트 위치 조절
- 초점 조절
- 모서리 반경
- 투명도

#### 사용자 이미지 입력

관리자가 이미지 노드를 사용자 입력 필드로 노출할 수 있다.

필드별 정책:

- 이미지 교체 허용
- 초점 변경 허용
- 맞춤 방식 변경 허용
- 권장 비율 안내
- 파일 크기와 파일 형식 안내
- 기본 이미지

#### 에셋 패널

- 업로드
- 최근 사용
- 검색
- 썸네일 미리보기
- 캔버스로 추가
- 선택 이미지 교체
- 사용 중인 에셋 표시

기존 Studio의 에셋 업로드, 동기화, 정리 흐름을 재사용한다.

### 5.8 사용자 입력과 바인딩

썸네일은 시간표의 일자 및 항목 범위를 사용하지 않는다. 초기 버전의 모든 사용자 입력은 문서 전역 입력이다.

지원 입력 타입:

- 한 줄 텍스트
- 여러 줄 텍스트
- 이미지
- 선택 목록
- 색상은 템플릿별 필요가 확인된 뒤 확장

입력 필드 속성:

- 키
- 표시 이름
- 설명
- 입력 타입
- 기본값
- 필수 여부
- 표시 순서
- UI 그룹
- 최대 글자 수
- 여러 줄 허용 여부
- 이미지 정책

바인딩 대상:

- 텍스트 내용
- 이미지 소스
- 선택 목록에 따른 미리 정한 속성 값

초기에는 하나의 입력이 여러 노드에 연결되는 것을 허용한다. 계산식과 복합 조건식은 현재 Studio 바인딩 해석 범위를 유지하며, 별도의 로직 빌더는 만들지 않는다.

### 5.9 편집 이력과 문서 명령

지원 기능:

- 실행 취소
- 다시 실행
- 복사
- 잘라내기
- 붙여넣기
- 복제
- 삭제
- 그룹화
- 그룹 해제
- 레이어 순서 변경

문서 변경은 공통 그래프 명령을 통해 수행한다. 각 패널이 문서를 직접 임의 변경하지 않게 해 시간표와 썸네일에서 같은 이력 처리 방식을 사용할 수 있도록 한다.

연속 드래그나 숫자 입력은 사용자 동작 단위로 하나의 이력으로 묶는다.

### 5.10 저장, 발행, 런타임

#### 관리자 저장 흐름

- 자동 또는 수동 초안 저장
- 저장 상태 표시
- 발행
- 발행본 기준 미리보기
- 개정 이력
- 발행 취소 또는 이전 개정 복구는 기존 정책에 맞춰 제공

#### 사용자 런타임

- 발행된 문서 로드
- 노출된 입력 필드 표시
- 입력값 변경
- 실시간 미리보기
- 기본값으로 초기화
- PNG 다운로드

#### PNG 내보내기

Phase 0A에서 선택한 PNG 라이브러리와 옵션을 공용 export controller로 감싸
재사용한다. 신규 Studio UI가 `html-to-image`와 `modern-screenshot`을 각각 직접
호출하지 않는다.

내보내기 시 보장할 기능:

- 문서의 원본 캔버스 크기 사용
- 편집기 선택선과 핸들 제외
- 웹 폰트 로드 완료 후 생성
- 이미지 에셋 로드 완료 후 생성
- 투명 배경 처리
- 관리자 미리보기와 사용자 결과의 동일한 렌더링

JPG, WebP, 배수 해상도 내보내기는 후속 기능으로 둔다.

## 6. 화면 구성

### 6.1 관리자 편집 화면

관리자 화면의 전체 배치, 패널 크기, 시각적 위계와 기본 조작은 기존 Template Studio와 동일하게 유지한다. 아래 영역은 Thumbnail Studio 전용으로 새로 그리는 화면 명세가 아니라 공통 `StudioEditorShell`에 제공할 내용의 구분이다.

#### 상단 도구 모음

공통 상단 바 프레임을 사용하되 Template Studio의 `Cards / Timetable` 전환은 포함하지 않는다.

- 문서 이름
- 저장 상태
- 실행 취소와 다시 실행
- 오브젝트 추가
- 확대 비율과 화면 맞추기
- 미리보기
- 발행
- PNG 내보내기

#### 왼쪽 패널

기존 Template Studio의 왼쪽 패널과 같은 컨테이너 및 레이어 시스템을 사용한다.

탭 구성:

- 레이어
- 에셋
- 텍스트 프리셋
- 사용자 입력

#### 중앙 영역

- 캔버스
- 캔버스 외부 작업 영역
- 선택 박스와 조작 핸들
- 다중 선택 표시
- 정렬 보조선
- 팬과 줌

#### 오른쪽 패널

기존 Template Studio의 속성 탭 컨테이너, 공통 속성 입력과 섹션 UI를 그대로 사용한다. 선택한 노드 종류에 따라 썸네일 전용 속성 섹션만 추가한다.

- 문서 인스펙터
- 캔버스 인스펙터
- 선택 오브젝트 인스펙터
- 다중 선택 공통 인스펙터

#### 하단 또는 상태 영역

- 선택 오브젝트 이름
- 캔버스 좌표
- 확대 비율
- 경고 또는 저장 오류

### 6.2 사용자 편집 화면

사용자 화면은 템플릿 구조보다 콘텐츠 입력에 집중한다.

권장 구성:

- 왼쪽 또는 오른쪽: 입력 필드
- 중앙: 결과 미리보기
- 상단: 템플릿 이름과 초기화
- 주요 액션: PNG 다운로드

모바일에서는 입력과 미리보기를 세로로 배치한다. 복잡한 레이어 패널과 인스펙터는 사용자 화면에 노출하지 않는다.

## 7. 문서 모델

### 7.1 기본 문서

기존 `StudioTemplateDocument`를 유지하고 썸네일에 필요한 도메인만 선택적으로 추가한다.

```ts
type StudioTemplateDocument = {
  schema: "studio_template_document";
  version: 7;
  metadata: {
    editor: "template-studio";
    kind: "timetable" | "thumbnail";
    name: string;
    description?: string;
  };
  canvas: StudioCanvasConfig;
  graph: StudioNodeGraph;
  inputs: Record<StudioInputId, StudioInputDefinition>;
  styles: StudioStyleMap;
  assets: StudioAssetMap;
  resources?: StudioTemplateResources;
  domains?: {
    thumbnail?: StudioThumbnailDomain;
    timetable?: StudioTimetableDomain;
  };
};
```

한 문서에서 `thumbnail`과 `timetable` 도메인을 동시에 사용하지 않는 것을 기본 규칙으로 한다. 템플릿 레코드의 `template_kind`와 문서 도메인이 일치해야 한다.

기존 v6 문서에는 `metadata.kind`가 없으므로 로드와 migration 경계에서는
`getStudioTemplateKind()`가 metadata, timetable domain과 DB context 순으로 kind를
판정한다. migration 이후 canonical v7 문서와 신규 문서는 kind를 필수로 기록한다.

### 7.2 썸네일 도메인

```ts
type StudioThumbnailDomain = {
  version: 1;
  export: {
    defaultFormat: "png";
    transparentBackground: boolean;
  };
  guide?: {
    assetId?: StudioAssetId | null;
    visible?: boolean;
    opacity?: number;
  };
};
```

썸네일 도메인에는 시간표의 일자, 항목, 컴포넌트 변형과 같은 데이터를 두지 않는다.

### 7.3 스타일과 효과 모델

기존 `StudioStyleRecord`는 단일 CSS형 값에 적합하지만, 순서가 있는 다중 효과를 표현하기에는 부족하다.

텍스트의 구조화된 표현 속성을 별도 모델로 둔다.

```ts
type StudioTextAppearance = {
  fill: StudioTextFill;
  strokes: StudioTextStroke[];
  shadow?: StudioTextShadow;
  presetRef?: StudioTextPresetReference;
};

type StudioTextStroke = {
  id: string;
  name?: string;
  enabled: boolean;
  color: string;
  outset: number;
  opacity: number;
};
```

일반 배치와 단순 CSS 속성은 기존 스타일 레코드를 계속 사용하고, 배열이나 순서가 필요한 표현은 구조화된 속성으로 분리한다.

`outset`은 glyph 바깥으로 보이는 실효 두께다. 중앙 정렬 CSS stroke를 사용할
경우 renderer가 CSS 값으로 변환할 때 2배 한다. resize와 저장에는 논리 텍스트
박스를 사용하고, effect outset을 적용한 시각 박스는 선택 효과와 clipping/overflow/PNG
진단에만 사용한다.

`strokes` 배열은 실제 뒤에서 앞으로 그릴 순서다. renderer가 `outset`으로 다시
정렬하지 않으므로 inspector의 순서 변경과 화면 결과가 일치한다. 비정상적인 두께
순서로 stroke가 가려지면 inspector가 이를 진단한다.

장기적으로 표현 모델은 텍스트 외 이미지 필터나 도형 효과로 확장할 수 있지만, 초기에는 텍스트 효과만 다룬다.

### 7.4 런타임 값

Thumbnail Studio의 초기 런타임은 기존 모델 중 `global` 입력만 사용한다.

```ts
type ThumbnailStudioRuntimeValues =
  Pick<StudioRuntimeValues, "global">;
```

기존 시간표 문서 호환을 위해 `StudioRuntimeValues`의 `days`, `entries`, `timetable` 필드를 즉시 제거하지 않는다. 런타임 Adapter가 템플릿 종류에 맞는 필드만 사용하고, 장기적으로 도메인별 runtime union을 도입할 수 있다.

## 8. 코드 구조 계획

목표 구조:

```text
studio-core
├── document model
├── graph commands
├── selection and history
├── renderer
│   └── text renderer
├── viewport
├── layer tree
└── generic inspector

thumbnail-studio
├── thumbnail document factory
├── admin editor shell
├── thumbnail panels
├── text effect editor
├── text presets
├── runtime editor
└── routes

timetable-studio
├── existing timetable domain
├── existing timetable panels
└── existing editor shell
```

실제 디렉터리 이동은 한 번에 수행하지 않는다. 먼저 현재 경로에서 공통 모듈의 책임을 분리하고, 안정된 단위부터 `studio-core` 성격의 경로로 옮긴다.

## 9. 기존 코드 재사용 경계

### 그대로 재사용할 가능성이 높은 영역

- `StudioTemplateDocument`의 캔버스와 그래프 구조
- `StudioRenderer`
- `StudioCanvasViewport`
- 그래프 편집 유틸리티
- 레이어 순서 유틸리티
- 오브젝트 배치 유틸리티
- 바인딩 해석기
- 입력값 정규화
- 웹 폰트 로딩
- 에셋 저장과 동기화
- Studio 문서 저장, 개정, 발행 서비스
- 런타임 셸의 범용 렌더링 경로
- HTML 기반 PNG 내보내기

### 분리 후 재사용할 영역

- 편집기 전체 레이아웃과 패널 배치
- 상단 공통 도구 모음
- 왼쪽 사이드바와 범용 레이어 패널
- 오른쪽 속성 탭 컨테이너와 공통 속성 섹션
- 선택 상태
- 실행 취소와 다시 실행
- 복사, 잘라내기, 붙여넣기
- 텍스트 렌더링과 자동 크기 측정

위 항목은 별도 복사본이 아니라 Template Studio와 Thumbnail Studio가 동일한 공통 컴포넌트를 가져다 쓰는 형태로 분리한다.

### 썸네일에서 사용하지 않을 영역

- 시간표 일자와 항목 상태
- 시간표 카드 컴포지션
- 시간표 전용 프레임 자동 적용
- 시간표 상태와 컴포넌트 변형
- 시간표 전용 내장 입력
- 시간표 미리보기 패널

특히 모든 문서 변경 뒤 시간표 프레임을 다시 적용하는 현재 편집기 갱신 흐름은 Thumbnail Studio로 가져오지 않는다.

## 10. 라우트와 서비스 구성

권장 관리자 라우트:

```text
/admin/thumbnail-studio
/admin/thumbnail-studio/create
/admin/thumbnail-studio/[templateId]/edit
/admin/thumbnail-studio/[templateId]/preview
```

권장 사용자 라우트:

```text
/thumbnail/[templateId]
```

사용자 페이지와 관리자 페이지를 구분하고, Template Hub는 `template_kind`에 따라 올바른 경로를 연다.

데이터 접근은 기존 프로젝트 계층을 유지한다.

```text
Page/UI
→ React Query hook
→ service
→ Next.js API route
→ server service
→ database/storage
```

썸네일 화면에서 직접 네트워크 호출을 만들지 않는다. 기존 Studio 쿼리 키와 저장·발행 mutation을 템플릿 종류를 포함하도록 확장한다.

## 11. 저장소와 템플릿 분류

별도의 썸네일 전용 문서 테이블 세트를 복제하지 않고 기존 Studio 저장 구조를 공유하는 방향을 우선한다.

템플릿 레코드에 종류를 명시한다.

```ts
template_kind: "timetable" | "thumbnail"
```

적용 대상:

- 템플릿 목록 필터
- 새 문서 생성
- 편집 라우트 접근
- 발행본 조회
- 사용자 런타임 진입
- 상품 또는 접근 권한 연계

기존 레거시 `thumbnails` 데이터와 새 Studio 문서는 자동으로 같은 데이터로 간주하지 않는다. 마이그레이션이 필요하다면 기존 썸네일 데이터의 실제 사용 형태를 조사한 뒤 별도 이관 계획을 세운다.

초기 개발에서는 로컬 문서 생성과 편집 수직 기능을 먼저 완성하고, 템플릿 종류 컬럼과 카탈로그 통합은 저장 흐름 단계에서 적용한다.

## 12. 단계별 개발 계획

### Phase 0. 제품 계약 확정

목표: 구현 중 문서 구조와 사용자 권한이 흔들리지 않도록 초기 계약을 정한다.

기능 결정:

- 관리자 편집과 사용자 편집의 권한 차이
- 기본 캔버스 크기와 프리셋
- 초기 지원 노드
- 초기 텍스트 효과 범위
- 텍스트 프리셋의 소유 범위
- 템플릿 종류 저장 방식
- 관리자 및 사용자 라우트

결과물:

- `thumbnail` 템플릿 종류 정의
- 빈 썸네일 문서의 기본값
- 초기 기능과 후속 기능의 경계
- 작성 화면과 사용자 화면의 정보 구조

### Phase 0A. 텍스트 효과와 PNG 렌더링 스파이크

목표: 공용 셸과 텍스트 효과를 본격 구현하기 전에 화면과 PNG의 표현 충실도를
확인하고 표준 렌더링 경로를 결정한다.

비교:

- DOM effect layer + `html-to-image`
- DOM effect layer + `modern-screenshot`
- 두 경로가 기준을 만족하지 못할 때 SVG text 또는 Canvas

결과물:

- 표준 PNG 라이브러리 하나
- 텍스트 효과 렌더링 방식
- stroke 실효 두께 변환 규칙
- 웹 폰트, shadow와 투명 배경 지원 범위
- Phase 3과 Phase 5가 사용할 결정 기록

### Phase 1. Studio Core 최소 분리

목표: 시간표 전용 로직 없이 빈 썸네일 편집기를 실행할 수 있는 공통 기반을 만든다.

구현 기능:

- 추출 전 시간표 편집기 UI 기준선
- Template Studio와 Thumbnail Studio가 함께 사용하는 공통 편집기 셸
- 시작·중앙·끝 확장 영역을 가진 공통 상단 도구 모음
- 선택적 context header와 탭을 받는 공통 왼쪽 사이드바
- 동일한 범용 레이어 패널
- 속성 섹션 배열을 받는 공통 오른쪽 속성 탭 컨테이너
- 공통 변환 속성 섹션
- 공통 설정 모달 프레임
- Template Studio의 시간표 전용 Adapter
- Thumbnail Studio 전용 Adapter
- 공통 선택 상태
- 공통 이력 상태
- 공통 문서 명령
- 빈 썸네일 문서 팩토리
- Thumbnail Studio 라우트 진입

완료 상태:

- 빈 1280 × 720 문서가 열린다.
- 두 Studio가 같은 기본 레이아웃, 레이어 패널, 속성 패널 컴포넌트를 사용한다.
- 썸네일 전용 패널은 공통 셸의 확장 지점으로 추가된다.
- Thumbnail Studio 상단에는 `Cards / Timetable` 전환이 나타나지 않는다.
- Thumbnail Studio 좌측에는 `Component Set`, 상태 선택과 `Table` 탭이 나타나지 않는다.
- Thumbnail Studio 우측에는 시간표 일자, 카드 상태와 컴포지션 속성이 나타나지 않는다.
- 공통 컴포넌트는 시간표 도메인 타입과 상태를 직접 참조하지 않는다.
- 기본 노드를 추가하고 선택, 이동, 삭제할 수 있다.
- 시간표 도메인이 없는 문서 변경에 시간표 프레임 로직이 개입하지 않는다.
- 기존 시간표 편집기는 기존 도메인 기능을 유지한다.

### Phase 2. 썸네일 기본 편집 기능

목표: 텍스트 효과를 제외해도 일반 썸네일 레이아웃을 구성할 수 있게 한다.

구현 기능:

- exhaustive 노드 정의 registry와 renderer dispatch
- 텍스트 추가와 편집
- 텍스트 노드의 기본 `staticText` binding
- 자동 크기 텍스트
- 이미지 추가와 교체
- 기본 도형 추가
- 그룹화와 그룹 해제
- 레이어 순서와 부모 변경
- 잠금과 숨김
- 위치, 크기, 회전, 투명도 인스펙터
- 정렬과 간격 분배
- 복사, 붙여넣기, 복제
- 줌, 팬, 화면 맞추기
- 캔버스 배경과 크기 설정

완료 상태:

- 관리자가 기본 이미지, 텍스트, 배경 블록을 조합해 썸네일 레이아웃을 만들 수 있다.
- 모든 조작이 하나의 Studio 문서 그래프에 반영된다.

### Phase 3. 고급 텍스트 표현

목표: Thumbnail Studio의 핵심 차별 기능인 중첩 텍스트 효과를 제공한다.

구현 기능:

- graph 문서를 해석하는 `StudioRenderer`와 공용 텍스트 표현 `StudioText`
- 텍스트 측정 결과 공유
- 단색 채우기
- 실효 두께 계약을 사용하는 다중 아웃스트로크
- 외곽선 추가, 삭제, 복제, 순서 변경
- 텍스트 그림자
- 효과 확장 범위 계산
- 텍스트 효과 인스펙터
- 효과 프리셋 생성과 적용
- builtin/custom preset 출처 기록
- 시간표 variant 전파 제약 기록
- 프리셋 버전 출처 기록

Phase 3의 custom preset은 편집기 세션 상태에만 저장한다. 생성·복제·이름 변경·삭제는
문서 history 대상이 아니며, 노드 적용만 appearance deep copy와 새 stroke ID를 포함해
history 한 단계로 기록한다. 원격 preset DB는 Phase 6 범위다.

완료 상태:

- 하나의 텍스트 노드에 여러 외곽선을 겹쳐 표현할 수 있다.
- 저장된 disabled stroke도 Inspector에서 복구·수정·복제·삭제·drag할 수 있고,
  renderer는 저장 순서대로 유효한 drawable layer를 최대 8개만 그린다.
- `legacy scalar text appearance`는 첫 구조화 변경과 preset 적용 시 style 저장값에서
  제거되며, 지원하지 않는 값은 원본을 보존한 채 materialize를 차단한다.
- logical bounds를 바꾸지 않고 canvas clipping과 hidden/clip group overflow를 진단한다.
- locked node의 텍스트 효과와 preset command는 document와 history를 변경하지 않는다.
- 자동 크기 텍스트에서도 모든 시각 레이어의 글자 크기와 줄바꿈이 일치한다.
- 작성 캔버스와 범용 런타임 렌더러가 같은 텍스트 결과를 사용한다.

### Phase 4. 입력 바인딩과 이미지 워크플로

목표: 완성된 레이아웃을 재사용 가능한 템플릿으로 만든다.

구현 기능:

- 전역 텍스트 입력 생성
- 전역 이미지 입력 생성
- 입력 순서와 그룹 설정
- 텍스트 내용 바인딩
- 이미지 소스 바인딩
- 이미지 업로드와 에셋 선택
- 이미지 맞춤과 초점
- 사용자 변경 허용 범위 설정
- 기본값 미리보기

완료 상태:

- 관리자가 편집 가능한 영역만 입력 필드로 공개할 수 있다.
- 같은 입력값을 여러 노드에서 재사용할 수 있다.
- 기본값만으로도 완성된 템플릿 미리보기가 보인다.

### Phase 5. 사용자 Thumbnail Editor와 내보내기

목표: 발행된 템플릿을 사용자가 실제 썸네일로 만들 수 있게 한다.

구현 기능:

- 발행 문서 런타임 로드
- 입력 필드 UI
- 텍스트와 이미지 값 변경
- 실시간 미리보기
- 입력값 초기화
- PNG 다운로드
- 폰트와 이미지 로딩 상태
- 내보내기 실패 안내

완료 상태:

- 사용자가 템플릿 구조를 건드리지 않고 콘텐츠를 변경할 수 있다.
- 화면 미리보기와 PNG 결과가 같은 공용 렌더러를 사용한다.

### Phase 6. 저장·발행·카탈로그 통합

목표: Thumbnail Studio를 기존 템플릿 운영 흐름에 연결한다.

구현 기능:

- `template_kind` 적용
- 썸네일 템플릿 생성
- 초안 저장
- 개정 관리
- 발행과 발행본 조회
- 썸네일 템플릿 목록 필터
- 에셋 동기화
- 상품 및 접근 권한 흐름 연결
- 기존 템플릿과 라우트 충돌 방지

완료 상태:

- 시간표와 썸네일 템플릿을 동일한 Studio 인프라에서 종류별로 운영할 수 있다.
- 썸네일 템플릿의 작성, 발행, 사용, 다운로드 흐름이 하나로 연결된다.

## 13. 초기 범위에서 제외할 기능

다음 기능은 기반 구조가 불가능해서가 아니라, 초기 제품 복잡도를 제한하기 위해 제외한다.

- 브러시와 자유 그리기
- 펜 도구와 임의 벡터 패스
- 텍스트 휘기와 경로 텍스트
- 3D 텍스트
- 레이어 마스크
- 블렌드 모드 전체 지원
- 이미지 배경 제거
- AI 이미지 생성
- PSD 가져오기와 내보내기
- 자유 배치형 사용자 편집
- 실시간 공동 편집
- 여러 페이지 문서
- 애니메이션과 동영상 내보내기
- 상세한 인쇄용 색상 관리

다음 표현은 기본 기능 안정화 이후 우선순위를 다시 정한다.

- 그라데이션 텍스트
- 글로우
- 여러 그림자
- 텍스처 채우기
- 이미지 필터
- 텍스트 스타일 부분 적용

## 14. 주요 리스크와 대응 방향

### PNG rasterizer가 텍스트 효과를 다르게 그리는 문제

같은 DOM renderer를 사용해도 SVG `foreignObject` 직렬화와 Canvas rasterize
과정에서 stroke, shadow와 웹 폰트가 화면과 다르게 나올 수 있다.

대응:

- Phase 0A에서 `html-to-image`와 `modern-screenshot` 실제 결과 비교
- 표준 PNG 라이브러리 하나 선택
- DOM 결과가 불충분하면 Phase 3 전에 SVG text 또는 Canvas 결정
- Phase 5까지 결정을 미루지 않음

### 텍스트 레이어 간 미세한 위치 차이

브라우저가 각 효과 레이어의 글자를 따로 배치하면 외곽선이 어긋날 수 있다.

대응:

- 글자 크기와 줄바꿈을 한 번만 계산
- 모든 시각 레이어에 동일한 측정 결과 적용
- 동일한 DOM 구조와 폰트 속성 사용

### 효과가 오브젝트 영역에서 잘리는 문제

두꺼운 외곽선과 그림자는 논리 박스 밖으로 나간다.

대응:

- 효과 확장 범위 계산
- 렌더러 내부 여유 영역 적용
- 그룹 오버플로와 PNG 캡처 영역에 반영

### 기존 시간표 편집기의 회귀 위험

공통 기능이 큰 클라이언트 파일에 섞여 있어 무리한 분리가 기존 기능에 영향을 줄 수 있다.

대응:

- 추출 전 주요 시간표 UI와 동작 기준선 기록
- Thumbnail Studio에 필요한 수직 기능만 먼저 추출
- 시간표 전용 상태와 패널은 유지
- 공통 모듈별로 기존 시간표와 새 썸네일이 순차적으로 사용

### 노드 필드 효과가 시간표 상태로 전파되지 않는 문제

초기 `textAppearance`는 노드 필드이며 현재 시간표의 variant style 전파는
`document.styles`만 복사한다.

대응:

- Thumbnail Studio 초기 범위에서는 시간표 상태 전파를 암묵적으로 변경하지 않음
- 시간표가 공용 효과를 채택할 때 `appearance/all` 전파 범위를 명시적으로 확장
- deep copy와 stroke ID 재생성

### 프리셋 수정으로 발행 결과가 바뀌는 문제

공용 프리셋을 실시간 참조하면 기존 템플릿의 디자인이 예고 없이 변경될 수 있다.

대응:

- 적용 시 설정 복사
- builtin/custom source, 프리셋 ID와 버전은 출처로만 기록
- 기존 문서 자동 갱신 금지

### 저장 모델 중복

썸네일 전용 저장 테이블을 새로 만들면 개정, 발행, 에셋 정리 기능이 중복될 수 있다.

대응:

- 기존 Studio 저장 인프라 공유
- 템플릿 종류로 도메인 구분
- 레거시 썸네일 데이터 이관은 별도 결정

### 편집기와 내보내기 결과 차이

렌더러가 여러 개로 나뉘거나 rasterizer가 해당 CSS를 보존하지 못하면 폰트,
이미지와 효과 표현이 달라질 수 있다.

대응:

- 관리자, 사용자, PNG가 동일한 공용 렌더러 사용
- Phase 0A에서 선택한 rasterizer를 공용 export controller로 단일화
- 편집 전용 선택 UI만 렌더 결과에서 분리

## 15. 기능 우선순위

### Must

- 별도 Thumbnail Studio 진입
- 빈 썸네일 문서
- 텍스트, 자동 크기 텍스트, 이미지, 그룹, 기본 도형
- 레이어와 기본 인스펙터
- 선택, 이동, 크기, 회전
- 실행 취소와 다시 실행
- 다중 아웃스트로크
- 텍스트 그림자
- 텍스트 효과 프리셋
- 텍스트와 이미지 입력 바인딩
- 사용자 런타임 미리보기
- PNG 다운로드
- 기존 Studio 저장과 발행 흐름 통합

### Should

- 정렬과 간격 분배
- 이미지 초점 조절
- 캔버스 크기 프리셋
- 입력 UI 그룹과 순서
- 최근 에셋
- 다중 선택 공통 편집
- 프리셋 미리보기

### Could

- 그라데이션 채우기
- 글로우
- 여러 그림자
- 스마트 가이드
- 사용자 정의 내보내기 배수
- JPG와 WebP
- 사용자 개인 프리셋

## 16. Phase 0에서 확정한 제품 기본값

- 관리자 목록: `/admin/thumbnail-studio`
- 관리자 생성: `/admin/thumbnail-studio/create`
- 관리자 편집: `/admin/thumbnail-studio/[templateId]/edit`
- 관리자 미리보기: `/admin/thumbnail-studio/[templateId]/preview`
- 사용자 라우트: `/thumbnail/[templateId]`
- 기본 캔버스: 1280 × 720
- 사용자 편집: 입력 필드만 허용
- 프리셋: 프로젝트 공용, 적용 시 복사
- 도형: 사각형과 둥근 사각형
- 사용자 결과: 초기에는 별도 저장 없이 다운로드
- 레거시 `thumbnails`: 자동 이관하거나 삭제하지 않음

프리셋을 코드 기본값으로만 운영할지 관리자 편집 가능한 DB 대상으로 만들지는 원격 migration 전에 최종 확정한다. 나머지 세부 계약은 [Phase 0 문서](./00-product-contract.md)를 기준으로 한다.

## 17. 관련 현재 코드

계획을 구현할 때 우선 검토할 파일:

- `src/types/template-studio.ts`
  - 공통 문서, 그래프 노드, 스타일, 시간표 도메인, 런타임 값
- `src/app/(root)/template-studio/_components/studio-renderer.tsx`
  - 범용 DOM 렌더러
- `src/app/(root)/template-studio/_components/studio-canvas-viewport.tsx`
  - 캔버스 줌, 팬, 오브젝트 이동
- `src/app/(root)/template-studio/_components/template-studio-client.tsx`
  - 현재 일반 편집 기능과 시간표 기능이 함께 있는 관리자 편집기
- `src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx`
  - 범용 런타임과 PNG 내보내기
- `src/components/AutoResizeTextCard/AutoResizeText.tsx`
  - 자동 글자 크기 계산
- `src/utils/template-studio/graph-editor.ts`
  - 그래프 편집
- `src/utils/template-studio/layer-order.ts`
  - 레이어 순서
- `src/utils/template-studio/object-layout.ts`
  - 오브젝트 배치
- `src/utils/template-studio/binding-resolver.ts`
  - 입력 바인딩 해석
- `src/utils/template-studio/input-values.ts`
  - 런타임 입력값
- `src/utils/template-studio/web-fonts.ts`
  - 웹 폰트
- `src/hooks/useThumbnailEditor.ts`
  - 기존 시간표 및 카드 기반 썸네일 훅으로, 신규 Studio Core 기반 구현의 출발점으로 사용하지 않음

## 18. 최종 개발 순서 요약

```text
템플릿 종류와 썸네일 문서 계약
→ PNG와 텍스트 효과 렌더링 스파이크
→ 최소 Studio Core 분리
→ 빈 Thumbnail Studio
→ 기본 오브젝트와 레이어 편집
→ 공용 텍스트 측정과 렌더러
→ 다중 아웃스트로크와 프리셋
→ 입력 바인딩과 이미지 워크플로
→ 사용자 Thumbnail Editor
→ PNG 내보내기
→ 저장·발행·카탈로그 통합
```

이 순서는 고급 텍스트 기능을 기존 시간표 편집기 안에 먼저 얹지 않고, 새 Thumbnail Studio의 공용 렌더링 경로에서 완성하도록 잡는다. 이후 시간표 문서도 같은 공용 텍스트 렌더러를 선택적으로 사용하게 하면 두 편집기의 표현 기능을 중복 구현하지 않고 확장할 수 있다.
