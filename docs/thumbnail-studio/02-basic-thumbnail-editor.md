# Phase 2. 썸네일 기본 편집기

상태: 계획 완료, 구현 전  
선행 단계: [Phase 1 — Studio Core와 Adapter 분리](./01-studio-core-extraction.md)  
후속 단계: [Phase 3 — 고급 텍스트 표현](./03-text-effects.md)

## 1. 목표

공통 Studio 셸 위에서 썸네일 문서를 처음부터 구성할 수 있는 관리자 편집기를
만든다.

이 단계의 결과만으로 텍스트, 이미지와 배경 블록을 이용한 기본 썸네일 레이아웃을
제작할 수 있어야 한다. 다중 아웃스트로크와 사용자 런타임은 다음 단계에서
추가한다.

## 2. 관리자 화면

라우트:

```text
/admin/thumbnail-studio/[templateId]/edit
```

Phase 6 이전에는 임시 또는 로컬 문서로 화면을 실행할 수 있다. 원격 저장 API가
준비되지 않아도 기본 편집 기능 개발이 막히지 않게 한다.

### 공통 셸 구성

상단:

- 목록
- 임시 저장 상태
- 실행 취소와 다시 실행
- 캔버스 크기
- 줌과 Fit
- 설정
- 미리보기

좌측:

- Layers
- Assets 자리 표시 탭
- Text Presets 자리 표시 탭
- Inputs 자리 표시 탭

중앙:

- `StudioCanvasViewport`
- `StudioRenderer`
- 선택선과 조작 핸들

우측:

- Canvas
- Transform
- Layout
- Appearance
- Binding 자리 표시 섹션

시간표 전용 상단 전환, `Component Set`, 상태와 `Table` 탭은 렌더링하지 않는다.

## 3. 노드 타입 dispatch 강화

`shape`를 union에 추가하기 전에 현재 노드 타입 처리의 fallback을 제거한다.

현재 renderer와 기본값 함수는 알려지지 않은 새 타입을 텍스트로 처리할 수 있다.
이 상태에서 `shape`를 추가하면 컴파일 오류 없이 빈 텍스트 노드처럼 렌더링될 수
있다.

노드 정의를 exhaustive registry로 구성한다.

```ts
const STUDIO_NODE_DEFINITIONS = {
  group: { ... },
  text: { ... },
  flexibleText: { ... },
  image: { ... },
  shape: { ... },
} satisfies Record<StudioGraphNodeType, StudioNodeDefinition>;
```

registry 책임:

- 표시 label
- 아이콘 또는 icon key
- 기본 style factory
- 기본 binding factory
- 허용 inspector section
- 자식 허용 여부

renderer는 모든 타입을 명시적으로 처리하고 마지막 fallback으로 텍스트를
렌더링하지 않는다. switch를 사용한다면 `assertNever`로 누락을 컴파일 단계에서
잡는다.

노드 추가 메뉴와 picker의 타입 목록도 별도 문자열 배열을 하드코딩하지 않고
registry에서 만든다.

## 4. 빈 문서 팩토리

신규 함수:

```ts
createThumbnailStudioDocument(options?: {
  name?: string;
  width?: number;
  height?: number;
  background?: string;
}): StudioTemplateDocument
```

기본 결과:

- `metadata.kind="thumbnail"`
- `canvas=1280×720`
- 빈 root graph
- 빈 inputs
- 빈 assets
- 기본 style map
- `domains.thumbnail.version=1`
- PNG export
- 시간표 도메인 없음

초기 문서는 캔버스 자체를 표현하기 위한 불필요한 root node를 만들지 않는다.
사용자가 추가한 노드만 graph에 들어간다.

## 5. 노드 추가

### 추가 메뉴

초기 메뉴:

- Text
- Auto-fit Text
- Image
- Rectangle
- Group

추가 위치:

- 현재 뷰포트 중앙
- 부모 그룹을 선택했다면 해당 그룹의 자식
- 캔버스 경계를 벗어나지 않는 기본 좌표

기본 크기:

| 노드 | 기본 크기 |
| --- | --- |
| Text | 480 × 100 |
| Auto-fit Text | 480 × 140 |
| Image | 400 × 300 |
| Rectangle | 400 × 200 |
| Group | 600 × 400 |

값은 상수로 관리하고 템플릿 데이터에 별도 기능 의미를 부여하지 않는다.

### 기본 스타일

Text:

- 흰색 또는 현재 테마와 무관한 명시적 글자색
- 기본 프로젝트 폰트
- 64px
- 700 weight
- 왼쪽 정렬
- 기본 binding: `{ kind: "staticText", value: "New text" }`

기본 binding은 현재 Template Studio의 노드 추가 동작과 동일하게 제공한다.
binding이 없다고 현재 validator가 바로 발행을 차단하는 것은 아니지만, 새 텍스트가
빈 상태로 생성되거나 기존 편집 동작과 달라지는 것을 방지한다.

Image:

- `cover`
- 투명 배경

Rectangle:

- 단색
- border radius 0

Group:

- 투명 배경
- overflow visible

## 6. 선택과 조작

### 선택

- 클릭 단일 선택
- `Shift` 또는 플랫폼 보조키로 선택 토글
- 빈 캔버스 클릭으로 선택 해제
- 겹친 노드 선택 메뉴
- 레이어 패널과 캔버스 선택 동기화

### 이동

- 드래그 이동
- 방향키 1px 이동
- `Shift + 방향키` 10px 이동
- 잠긴 노드 이동 금지
- `fillParent` 노드 직접 이동 금지
- 다중 선택은 top-level 선택 노드만 이동

### 크기와 회전

- 모서리 및 변 핸들
- 숫자 입력
- 가로세로 비율 잠금
- 이미지의 기본 비율 유지 선택
- 회전 핸들
- 회전 숫자 입력

현재 뷰포트가 제공하지 않는 resize/rotate overlay는 공통 Studio 선택 overlay로
추출하거나 추가한다. Thumbnail Studio 전용 overlay를 별도로 만들지 않는다.

## 7. 레이어 기능

### 트리

- 그래프의 `rootNodeIds`와 `childIds` 순서 표시
- group 열기와 닫기
- 노드 종류별 아이콘
- 선택 표시
- 잠금과 숨김 상태 표시

### 명령

- 위로
- 아래로
- 맨 앞으로
- 맨 뒤로
- 부모 group으로 이동
- root로 이동
- 잠금
- 숨김
- 이름 변경
- 삭제

### 그룹

그룹화:

1. 선택된 top-level 노드의 공통 부모 확인
2. 선택 영역을 감싸는 group frame 생성
3. 자식 좌표를 새 group 기준 좌표로 변환
4. 기존 레이어 순서를 유지
5. 새 group 하나를 선택

그룹 해제:

1. 자식의 절대 위치 계산
2. 부모의 부모로 이동
3. 기존 group 위치에 자식 순서 삽입
4. group 삭제
5. 해제된 자식 선택

관련 기존 유틸리티:

- `src/utils/template-studio/graph-editor.ts`
- `src/utils/template-studio/layer-order.ts`
- `src/utils/template-studio/object-layout.ts`

## 8. 공통 문서 명령

모든 변경은 명령 단위로 실행한다.

```ts
type StudioGraphCommand =
  | { type: "node.add"; payload: ... }
  | { type: "node.update"; payload: ... }
  | { type: "node.remove"; payload: ... }
  | { type: "node.move"; payload: ... }
  | { type: "node.reorder"; payload: ... }
  | { type: "node.group"; payload: ... }
  | { type: "node.ungroup"; payload: ... }
  | { type: "node.duplicate"; payload: ... };
```

실제 union을 한 번에 만들 필요는 없지만 UI가 문서 내부 구조를 직접 임의
변경하지 않는 경계를 유지한다.

명령 결과:

- 새 문서
- 다음 선택 상태
- 이력 표시용 설명
- 변경된 노드 ID

시간표 정규화는 공통 명령 내부에서 실행하지 않는다.

## 9. 편집 이력

이력에 포함:

- 노드 추가와 삭제
- 이동, 크기와 회전
- 스타일
- 레이어 순서
- 그룹화
- 잠금과 숨김
- 캔버스 설정

하나의 이력으로 묶는 동작:

- 한 번의 drag
- 한 번의 resize
- 한 번의 rotate
- 숫자 입력의 focus 시작부터 blur까지
- 연속 색상 picker 조작

복사 자체는 이력을 만들지 않고, 붙여넣기와 잘라내기 완료가 이력을 만든다.

## 10. Canvas 인스펙터

선택 노드가 없을 때 표시한다.

- 캔버스 이름
- 너비와 높이
- 크기 프리셋
- 배경색
- 투명 배경
- 캔버스에 맞추기

크기 변경 정책:

- 노드 좌표 유지
- 캔버스 밖 노드 자동 삭제 금지
- 캔버스 밖 노드 경고 표시 가능
- 전체 비율 조정은 후속 기능

## 11. 공통 Transform 인스펙터

필드:

- X
- Y
- Width
- Height
- Rotation
- Opacity
- Aspect ratio lock
- Layout mode

다중 선택:

- 공통 값이 같으면 값 표시
- 값이 다르면 mixed 상태
- 입력한 필드만 모든 선택 노드에 적용

잠긴 노드는 편집 필드를 비활성화한다.

## 12. 노드별 기본 인스펙터

### Text

- 내용
- font family
- font size
- font weight
- line height
- letter spacing
- horizontal align
- vertical align
- color
- auto-fit 최소와 최대 크기

다중 아웃스트로크와 그림자는 Phase 3에서 추가한다.

### Image

- 정적 에셋 선택
- fit: cover/contain/fill
- object position
- opacity
- border radius

업로드와 crop은 Phase 4에서 완성한다. Phase 2에서는 문서에 포함된 표본 에셋으로
이미지 노드 동작을 구현할 수 있다.

### Shape

- fill
- border color
- border width
- border radius
- opacity

### Group

- background
- overflow
- layout mode

## 13. 정렬과 분배

단일 선택:

- 캔버스 왼쪽/가운데/오른쪽
- 캔버스 위/가운데/아래

다중 선택:

- 선택 영역 기준 좌/가운데/우 정렬
- 선택 영역 기준 상/가운데/하 정렬
- 가로 간격 분배
- 세로 간격 분배

그룹 안의 노드는 부모의 좌표계를 기준으로 계산한다.

## 14. 복사와 붙여넣기

복사 snapshot:

- 선택된 top-level 노드
- 모든 자손
- 참조 style
- 참조 asset ID
- binding
- 노드별 구조화 속성

붙여넣기:

- 모든 node/style ID 재생성
- 내부 parent/child 참조 재매핑
- 같은 문서 안에서는 asset 재사용
- 기본 offset 적용
- 새 노드 선택

다른 문서 간 붙여넣기는 초기 범위에서 보장하지 않는다.

## 15. 미리보기

관리자 편집 화면의 preview는 현재 메모리 문서를 사용한다.

- 선택선 제거
- guide는 선택적으로 표시하지 않음
- 원본 canvas 크기
- 같은 `StudioRenderer`
- 사용자 입력은 기본값

Phase 6의 저장 기반 preview와 구분하기 위해 개발 중에는 draft preview임을
표시한다.

## 16. 파일 변경 계획

신규:

- `src/utils/thumbnail-studio/document-factory.ts`
- `src/utils/template-studio/node-definitions.ts`
- `src/utils/thumbnail-studio/node-defaults.ts`
- `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client.tsx`
- `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-layer-tabs.tsx`
- `src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector.tsx`

공통 수정:

- `src/types/template-studio.ts`
- `src/utils/template-studio/graph-editor.ts`
- `src/utils/template-studio/layer-order.ts`
- `src/utils/template-studio/object-layout.ts`
- `src/utils/template-studio/validator.ts`
- `src/app/(root)/template-studio/_components/studio-renderer.tsx`

Phase 1에서 만든 공통 경로와 이름이 다르면 해당 구조를 따른다.

## 17. 구현 순서

1. exhaustive 노드 정의 registry와 renderer dispatch
2. 빈 썸네일 문서 팩토리
3. 관리자 편집 route와 Adapter 연결
4. Layers 탭과 빈 캔버스
5. 기본 binding을 포함한 노드 추가
6. 선택과 이동
7. Transform 인스펙터
8. 레이어 순서와 잠금·숨김
9. resize와 rotate
10. 그룹화와 그룹 해제
11. 복사·붙여넣기와 복제
12. Canvas 인스펙터
13. 정렬과 분배
14. 기본 preview

## 18. 완료 조건

- 시간표 도메인 없이 빈 썸네일 문서가 열린다.
- 모든 `StudioGraphNodeType`이 registry와 renderer에서 exhaustive하게 처리된다.
- Text, Auto-fit Text, Image, Rectangle와 Group을 추가할 수 있다.
- 새 Text와 Auto-fit Text가 기본 `staticText` binding을 가진다.
- 좌측 레이어와 캔버스 선택이 동기화된다.
- 노드를 이동, resize, rotate, 복제와 삭제할 수 있다.
- 레이어 순서, 잠금, 숨김과 그룹 구조를 편집할 수 있다.
- 우측 공통 속성에서 위치와 기본 스타일을 변경할 수 있다.
- undo와 redo가 사용자 동작 단위로 동작한다.
- 캔버스 크기와 배경을 설정할 수 있다.
- 시간표 전용 UI와 상태가 썸네일 문서 변경에 개입하지 않는다.

## 19. 이 단계에서 하지 않는 일

- 다중 외곽선
- 텍스트 효과 프리셋
- 실제 이미지 업로드
- 사용자 입력 UI
- PNG 다운로드
- 원격 저장과 발행
- 상세 테스트 계획
