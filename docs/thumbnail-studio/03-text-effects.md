# Phase 3. 고급 텍스트 표현

상태: 계획 완료, 구현 전  
선행 단계: [Phase 2 — 썸네일 기본 편집기](./02-basic-thumbnail-editor.md)  
후속 단계: [Phase 4 — 입력, 이미지와 에셋](./04-inputs-assets.md)

## 1. 목표

하나의 논리 텍스트 노드에 여러 아웃스트로크와 그림자를 적용한다.

고정 크기 텍스트와 자동 크기 텍스트가 같은 렌더링 구조를 사용하고, 관리자
캔버스, 사용자 미리보기와 PNG 결과가 동일한 표현을 사용하게 한다.

## 2. 범위

초기 지원:

- 단색 텍스트 채우기
- 여러 아웃스트로크
- 아웃스트로크별 색상, 두께, 투명도와 순서
- 그림자 하나
- 텍스트 효과 프리셋
- 자동 크기와 줄바꿈 공유
- 효과 바깥 영역 계산

후속 범위:

- 그라데이션 채우기
- 여러 그림자
- 글로우
- 텍스처 채우기
- 텍스트 일부 구간 스타일
- 텍스트 휘기

## 3. 저장 모델

텍스트 효과는 실제 그래프 자식 노드가 아니다.

```ts
interface StudioTextFill {
  type: "solid";
  color: string;
  opacity: number;
}

interface StudioTextStroke {
  id: string;
  label?: string;
  enabled: boolean;
  color: string;
  width: number;
  opacity: number;
}

interface StudioTextShadow {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
}

interface StudioTextAppearance {
  fill: StudioTextFill;
  strokes: StudioTextStroke[];
  shadow?: StudioTextShadow;
  presetRef?: {
    presetId: string;
    presetVersion: number;
  };
}
```

텍스트 노드:

```ts
interface StudioGraphNode {
  // 기존 필드
  textAppearance?: StudioTextAppearance;
}
```

적용 대상:

- `text`
- `flexibleText`

다른 노드가 `textAppearance`를 가지면 validator가 경고하거나 제거한다.

## 4. 기존 스타일과의 관계

현재 `StudioStyleRecord`는 CSS형 scalar 값에 적합하다. 다음 속성은 계속 style
record에 둔다.

- font family
- font size
- font weight
- line height
- letter spacing
- text align
- vertical align
- width와 height
- position과 rotation

새 텍스트의 fill은 `textAppearance.fill`을 기준으로 한다.

기존 문서 호환:

- `textAppearance`가 없으면 `style.color`를 solid fill로 해석한다.
- 기존 `WebkitTextStroke` 같은 scalar 값이 있다면 legacy fallback으로만 읽는다.
- 새 편집기에서 효과를 저장하는 순간 구조화된 `textAppearance`를 생성한다.
- 기존 시간표 문서는 자동으로 시각 결과가 바뀌지 않아야 한다.

공용 resolver:

```ts
resolveStudioTextAppearance(
  node: StudioGraphNode,
  style: StudioStyleRecord,
): ResolvedStudioTextAppearance
```

렌더러와 인스펙터 모두 resolver를 사용하고 fallback 규칙을 복제하지 않는다.

## 5. 공용 텍스트 렌더러

신규 역할:

```text
StudioTextRenderer
├── text content resolve
├── typography style resolve
├── text layout measure
├── effect outset calculate
├── visual effect layers
└── accessible foreground layer
```

사용 지점:

- `StudioRenderer`
- Thumbnail Studio 관리자 캔버스
- Thumbnail 사용자 런타임
- PNG export DOM
- 향후 `StudioTimetablePreview`의 일반 텍스트

초기에는 시간표 미리보기 전체를 한 번에 교체하지 않는다. 기존 결과를 유지하면서
일반 graph text부터 공용 렌더러를 사용한다.

## 6. 렌더링 구조

논리 구조:

```html
<div data-studio-text-node>
  <span aria-hidden="true" data-effect-layer="outer-stroke">...</span>
  <span aria-hidden="true" data-effect-layer="inner-stroke">...</span>
  <span data-effect-layer="foreground">...</span>
</div>
```

원칙:

- wrapper만 선택과 pointer event 대상이다.
- 효과 레이어는 `pointer-events: none`이다.
- 뒤쪽 효과 레이어는 `aria-hidden`이다.
- foreground만 실제 텍스트로 노출한다.
- 모든 레이어가 동일한 typography와 layout 결과를 사용한다.

아웃스트로크는 가장 바깥쪽에서 가장 안쪽 순으로 뒤에 그린다.

예시:

```text
stroke[0] 12px black
stroke[1] 6px white
foreground yellow
```

화면상 결과:

```text
검정 외곽
→ 흰색 외곽
→ 노란 글자
```

인스펙터의 목록 순서와 실제 앞뒤 순서를 UI 설명으로 명확히 표시한다.

## 7. CSS 표현

DOM 렌더링 기본:

- `-webkit-text-stroke`
- `paint-order`
- 동일 텍스트 중첩
- `text-shadow`

두꺼운 outer stroke를 표현할 때 CSS stroke가 glyph 안쪽까지 침범하는 부분은
위에 놓인 다음 레이어와 foreground가 덮는다.

브라우저별 표현 차이가 제품 품질을 만족하지 못하는 경우에만 SVG text 또는
Canvas 렌더링을 후속 검토한다. 초기 구현에 새 그래픽 프레임워크를 도입하지
않는다.

## 8. 텍스트 측정

현재 자동 크기 텍스트는 컴포넌트 내부 state로 최종 `fontSize`를 계산한다.
효과 레이어마다 기존 컴포넌트를 렌더링하면 레이어별 측정 시점과 줄바꿈이 달라질
수 있다.

측정 단계를 별도 공용 로직으로 분리한다.

```ts
type StudioTextLayout = {
  fontSize: number;
  lineHeightPx: number;
  lines: StudioTextLineLayout[];
  contentWidth: number;
  contentHeight: number;
};
```

고정 텍스트:

- 지정 font size 사용
- 동일 폭과 typography로 줄바꿈 계산

자동 크기 텍스트:

1. font 로드 확인
2. 노드의 사용 가능 width/height 확인
3. min/max 범위에서 font size 탐색
4. 최종 줄바꿈과 크기 계산
5. 한 `StudioTextLayout`을 모든 효과 레이어에 전달

관련 변경:

- `src/components/AutoResizeTextCard/AutoResizeText.tsx`
- `src/app/(root)/template-studio/_components/studio-auto-text.tsx`
- 신규 공용 text layout utility 또는 hook

기존 컴포넌트는 새 공용 측정 결과를 사용하는 wrapper로 줄이거나, 시간표에서
기존 API를 유지하는 호환 adapter를 둔다.

## 9. 효과 바깥 영역

효과가 논리 텍스트 박스 밖으로 나가는 최대 범위를 계산한다.

```ts
type StudioEffectOutset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
```

고려 값:

- 최대 stroke width
- shadow offset
- shadow blur
- 회전 전 로컬 영역

용도:

- 효과 clipping 방지
- 선택 표시
- 그룹 overflow 경고
- PNG 캡처 경계
- 캔버스 밖 효과 경고

문서의 X, Y, width와 height는 논리 텍스트 박스 기준으로 유지한다. effect outset을
문서 프레임 값에 더해 저장하지 않는다.

## 10. 인스펙터

### Fill

- 색상
- 투명도

### Strokes

- 효과 추가
- 이름
- 활성화
- 색상
- 두께
- 투명도
- 복제
- 삭제
- drag 순서 변경

초기 stroke 제한:

- 0~8개
- width 0~64px
- opacity 0~1

제한은 과도한 DOM과 PNG 생성 비용을 방지하기 위한 제품 기본값이다. 상수로
관리한다.

### Shadow

- 활성화
- 색상
- X
- Y
- blur
- opacity

### 조작 방식

- 숫자 입력과 slider
- 색상 picker
- 변경 즉시 canvas 반영
- 한 번의 연속 조작을 하나의 history transaction으로 기록

## 11. 텍스트 효과 프리셋

모델:

```ts
interface StudioTextEffectPreset {
  id: string;
  version: number;
  label: string;
  previewText: string;
  typography: Partial<StudioStyleRecord>;
  appearance: StudioTextAppearance;
}
```

기능:

- preset 목록
- preview card
- 현재 텍스트에 적용
- 현재 텍스트에서 preset 생성
- 복제
- 이름 변경
- 삭제

Phase 3 저장 방식:

- 기본 preset은 코드 registry
- 편집 중 만든 preset은 문서 내부 또는 브라우저 개발 상태
- 원격 공용 preset 저장은 Phase 6

적용:

1. preset typography를 현재 style에 복사
2. appearance를 deep copy
3. 새 stroke ID 생성
4. `presetRef` 기록
5. 이후 preset 수정과 노드 분리

## 12. 폰트 로딩

효과 렌더링과 측정 전에 실제 웹 폰트가 준비돼야 한다.

재사용:

- `src/utils/template-studio/web-fonts.ts`
- `src/app/(root)/template-studio/_components/studio-web-font-loader.tsx`

정책:

- 편집기는 폰트 로딩 중 임시 상태 표시
- 폰트가 바뀌면 layout 재계산
- PNG 내보내기는 폰트 준비 후 실행
- 폰트 실패 시 fallback 폰트를 결과로 확정하지 않고 오류 안내

## 13. Renderer API 경계

`StudioRenderer`가 텍스트 세부 DOM을 직접 만들지 않고 공용 컴포넌트에 위임한다.

```ts
<StudioTextRenderer
  node={node}
  style={style}
  content={resolvedText}
  mode="authoring" | "runtime" | "export"
/>
```

mode 차이:

- authoring: 선택 wrapper와 진단 표시 허용
- runtime: 편집 UI 없음
- export: animation과 임시 cursor 없음

텍스트 시각 결과와 layout 계산은 mode별로 달라지지 않는다.

## 14. 파일 변경 계획

신규:

- `src/components/studio/text/studio-text-renderer.tsx`
- `src/components/studio/text/studio-text-effect-layers.tsx`
- `src/utils/template-studio/text-appearance.ts`
- `src/utils/template-studio/text-layout.ts`
- `src/utils/template-studio/text-effect-outset.ts`
- `src/utils/thumbnail-studio/text-effect-presets.ts`
- Thumbnail Studio text inspector components

수정:

- `src/types/template-studio.ts`
- `src/app/(root)/template-studio/_components/studio-renderer.tsx`
- `src/app/(root)/template-studio/_components/studio-auto-text.tsx`
- `src/components/AutoResizeTextCard/AutoResizeText.tsx`
- `src/utils/template-studio/migrations.ts`
- `src/utils/template-studio/validator.ts`
- Phase 2의 Thumbnail inspector

## 15. 구현 순서

1. appearance 타입과 resolver
2. 고정 크기 `StudioTextRenderer`
3. 단일 stroke
4. 여러 stroke와 순서
5. shadow
6. 공용 text layout 측정
7. flexibleText 연결
8. effect outset 계산
9. Thumbnail inspector
10. preset registry와 preview
11. 현재 텍스트에서 preset 생성
12. runtime/export가 사용할 renderer API 확정

## 16. 완료 조건

- 하나의 텍스트 노드에 여러 stroke를 추가할 수 있다.
- stroke별 색상, 두께, 투명도와 순서를 바꿀 수 있다.
- 그림자를 설정할 수 있다.
- 레이어 패널에는 텍스트가 하나만 표시된다.
- 효과 레이어가 선택과 pointer event를 방해하지 않는다.
- flexibleText의 모든 효과 레이어가 같은 font size와 줄바꿈을 사용한다.
- 두꺼운 효과가 불필요하게 잘리지 않는다.
- preset 적용 후 원본 preset 변경이 노드에 자동 전파되지 않는다.
- 관리자, runtime과 export가 같은 `StudioTextRenderer`를 사용할 계약이 완성된다.
- 기존 appearance 없는 시간표 텍스트가 기존 style fallback으로 렌더링된다.

## 17. 이 단계에서 하지 않는 일

- gradient
- glow
- 여러 shadow
- SVG path text
- 사용자 이미지 입력
- PNG 다운로드 UI
- 원격 preset DB
- 상세 테스트 계획
