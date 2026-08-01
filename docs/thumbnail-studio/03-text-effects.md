# Phase 3. 고급 텍스트 표현

상태: §15 1~13 구현 완료 — 코드·회귀 검증 완료. 브라우저 실측은 기존 기록 범위만 유지
선행 단계:
[Phase 0A — PNG 렌더링 선행 스파이크](./00a-rendering-feasibility-spike.md),
[Phase 2 — 썸네일 기본 편집기](./02-basic-thumbnail-editor.md)  
후속 단계: [Phase 4 — 입력, 이미지와 에셋](./04-inputs-assets.md)

## 1. 목표

하나의 논리 텍스트 노드에 여러 아웃스트로크와 그림자를 적용한다.

고정 크기 텍스트와 자동 크기 텍스트가 같은 렌더링 구조를 사용하고, 관리자
캔버스, 사용자 미리보기와 PNG 결과가 동일한 표현을 사용하게 한다.

## 2. 범위

초기 지원:

- 단색 텍스트 채우기
- 여러 아웃스트로크
- 아웃스트로크별 색상, 바깥쪽 실효 두께, 투명도와 순서
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
  outset: number;
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
    source: "builtin" | "custom";
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
- 기존 `WebkitTextStroke`, `webkitTextStroke`, `textShadow`는
  `legacy scalar text appearance` fallback으로만 읽는다. 이것은 별도의 구형 템플릿
  시스템이 아니라 `StudioTemplateDocument.textAppearance` 도입 전의 style scalar 표현이다.
- 새 편집기에서 효과를 처음 저장하는 순간 resolver 결과를 기준으로 구조화된
  `textAppearance`를 생성한다. fill만 바꿔도 기존 stroke를 잃지 않아야 한다.
- 이 materialize 명령은 `WebkitTextStroke`와 `webkitTextStroke`를 모두 style에서
  제거한다. 남겨 두면 구조화 레이어와 scalar CSS가 이중 렌더된다. command가 기존 style을
  병합할 때도 제거 결과를 다시 적용해 scalar가 되살아나지 않게 한다.
- 기존 scalar `textShadow`가 있으면 지원하는 단일 shadow 형식으로 materialize한 뒤
  제거한다. 해석할 수 없는 값은 조용히 버리지 않고 진단을 표시해 구조화 효과 저장을
  막는다. 여러 shadow를 구조화 모델로 축소하지 않는다.
- 기존 시간표 문서는 자동으로 시각 결과가 바뀌지 않아야 한다.

공용 resolver:

```ts
resolveStudioTextAppearance(
  node: StudioGraphNode,
  style: StudioStyleRecord,
): ResolvedStudioTextAppearance
```

렌더러와 인스펙터 모두 resolver를 사용하고 fallback 규칙을 복제하지 않는다.

### 4.1 시간표 상태 전파 제약

`textAppearance`는 배열과 순서가 있는 구조라 현재 scalar
`StudioStyleRecord`에 넣지 않고 노드 필드에 둔다.

현재 시간표의 `applyStudioVariantStyle()`은 `document.styles[styleId]`만
복사하므로 `textAppearance`는 Online/Multi 등 다른 상태로 자동 전파되지 않는다.

Thumbnail Studio 초기 구현에는 상태 variant가 없어 문제가 되지 않는다. 향후
시간표가 공용 텍스트 효과를 채택할 때 다음 변경이 필요하다.

- `appearance`와 `all` scope에서 `textAppearance` deep copy
- 복사한 stroke의 ID 재생성
- `Apply style to other statuses`에 효과 포함 여부 표시
- 상태별 효과를 유지할 때는 전파 제외 선택

Phase 3에서는 이 제약을 문서와 코드 주석에 남기고 시간표 전파 동작을 암묵적으로
확장하지 않는다.

## 5. 공용 텍스트 렌더러

공용 역할은 실제 구현 이름을 기준으로 둘로 나눈다.

```text
StudioRenderer
├── graph node / binding / style resolve
├── authoring selection wrapper
└── StudioText 호출

StudioText
├── fixed / flexible text layout
├── visual effect layers
└── accessible foreground layer
```

문서에서 계획명으로 사용하던 `StudioTextRenderer`는 별도 컴포넌트를 새로 만들라는
뜻이 아니다. 현재 구현명인 `StudioText`가 공용 텍스트 표현 계약을 소유하고,
`StudioRenderer`가 graph 문서 해석을 소유한다. effect outset은 렌더 DOM을 만드는
책임이 아니라 geometry 진단 utility의 책임이다.

사용 지점:

- `StudioRenderer`
- Thumbnail Studio 관리자 캔버스
- Thumbnail 사용자 런타임
- PNG export DOM
- `StudioTimetablePreview`의 graph text와 composition `flexibleText`

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

`appearance.strokes` 배열은 실제 뒤에서 앞으로 그릴 순서인 저장 목록이다. Inspector는
disabled 항목과 비정상 외부 입력도 원래 배열 순서로 표시해 다시 켜거나 수정할 수 있다.
renderer는 별도 drawable 목록을 사용해 `enabled === false`, `opacity <= 0`,
`outset <= 0`, 유효하지 않은 수치를 제외하고 최대 8개만 그린다. drawable 목록도
`outset`으로 재정렬하지 않는다. Inspector drag 순서가 저장 배열과 화면 결과를 함께 바꾼다.

정상적인 중첩은 가장 바깥쪽에서 가장 안쪽 순으로 둔다. 더 두꺼운 stroke를 앞쪽으로
옮기면 뒤의 얇은 stroke를 가릴 수 있으며, 인스펙터는 보이는 띠 두께와 가려짐을 알려준다.

예시:

```text
stroke[0] outset 12px black
stroke[1] outset 6px white
foreground yellow
```

화면상 결과:

```text
검정 외곽
→ 흰색 외곽
→ 노란 글자
```

인스펙터의 목록 순서와 실제 앞뒤 순서를 UI 설명으로 명확히 표시한다.

## 7. 렌더링 표현

[Phase 0A 선행 스파이크](./00a-rendering-feasibility-spike.md)에서 선택한 표현과
PNG 라이브러리를 이 단계의 기준으로 사용한다.

DOM effect layer가 선택된 경우 기본 표현:

- `-webkit-text-stroke`
- `paint-order`
- 동일 텍스트 중첩
- `text-shadow`

저장된 `outset`은 glyph 바깥으로 보이는 실효 두께다. 중앙 정렬 CSS stroke를
사용하면 다음 변환을 한 곳에서 수행한다.

```ts
const STUDIO_TEXT_STROKE_CSS_SCALE = 2;
const cssStrokeWidth = stroke.outset * STUDIO_TEXT_STROKE_CSS_SCALE;
```

stroke가 glyph 안쪽까지 침범하는 부분은 위에 놓인 다음 레이어와 foreground가
덮는다. renderer, preview와 export가 같은 변환 함수를 사용한다.

스파이크에서 DOM 결과가 기준을 만족하지 못했다면 여기서 SVG 또는 Canvas
결정을 그대로 따른다. Phase 3 중간에 임의로 다른 방식을 섞지 않는다.

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
- `src/components/studio/text/studio-text.tsx`
- 신규 공용 text layout utility 또는 hook

기존 컴포넌트는 새 공용 측정 결과를 사용하는 wrapper로 줄이거나, 시간표에서
기존 API를 유지하는 호환 adapter를 둔다.

### 8.1 현재 제품 경로

현재 `StudioText`의 autoFit 경로는 `AutoResizeText`에 위임하고 `maxLines`를 넘기지
않는다. 그래서 지금 제품은 이분 탐색이 아니라 최대값에서 0.5px씩 줄이는 선형 탐색을
타고, `white-space: pre`로 렌더한다. 즉 자동 줄바꿈을 하지 않고 명시적 개행에서만
줄이 나뉜다. 렌더 시점에 `Math.floor()`가 한 번 더 걸린다.

공용 측정으로 옮길 때 이 동작을 바꾸면 기존 시간표 문서의 줄바꿈과 크기가 함께
바뀐다. 줄바꿈 정책을 바꿀 것인지, 기존 문서에는 유지할 것인지를 먼저 정한다.

### 8.2 맞춤 여유

[Phase 0A §11](./00a-rendering-feasibility-spike.md#11-결정-기록)이 요구한 항목이다.

탐색이 찾은 크기를 그대로 쓰지 않는다. 탐색은 상자에 맞는 최대 크기를 찾으므로
결과가 항상 맞춤 경계 직전이다. 그 상태에서는 측정과 래스터화가 조금만 달라도
결과가 어긋난다.

- 탐색 결과를 한 단계 내리거나 비율로 축소한다.
- 또는 맞춤 판정에 여유 픽셀을 적용해 경계에 붙지 않게 한다.
- 여유값은 상수로 관리한다. 호출부마다 다른 값을 쓰면 같은 문서가 화면과 결과물에서
  다르게 나온다.

여유는 폭과 높이에 모두 적용한다. 2026-08-01 제품 경로 측정에서 두 라스터라이저가
어긋난 장면은 모두 세로가 빡빡한 쪽이었다. 두 줄이 상자 높이를 거의 채우는 제목과,
상자 높이가 줄 높이에 가까운 부제목이다. 폭에만 여유를 두면 그 두 경우가 남는다.

공용 렌더러를 만든 뒤 같은 장면으로 재확인한다.

## 9. 효과 바깥 영역

효과가 논리 텍스트 박스 밖으로 나가는 최대 범위를 회전 전 로컬 좌표계에서 계산한다.

```ts
type StudioEffectOutset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
```

고려 값:

- 켜져 있고 보이는 stroke의 최대 `outset`
- 켜져 있고 보이는 shadow의 offset과 blur
- 회전 전 로컬 영역

초기 계산 계약:

```ts
const strokeOutset = maxDrawableStrokeOutset;
const shadowBlurOutset = drawableShadow ? drawableShadow.blur : 0;
const shadowOffsetX = drawableShadow ? drawableShadow.offsetX : 0;
const shadowOffsetY = drawableShadow ? drawableShadow.offsetY : 0;

top = strokeOutset + max(0, shadowBlurOutset - shadowOffsetY);
right = strokeOutset + max(0, shadowBlurOutset + shadowOffsetX);
bottom = strokeOutset + max(0, shadowBlurOutset + shadowOffsetY);
left = strokeOutset + max(0, shadowBlurOutset - shadowOffsetX);
```

shadow는 현재 가장 뒤의 stroke 레이어에 적용되므로 stroke와 shadow 범위가 누적된다.
stroke가 없으면 `strokeOutset`은 0이다. disabled 또는 opacity 0인 효과는 시각 범위를
늘리지 않는다. 음수, `NaN`과 무한대는 저장 명령과 validator가 거부하고, 순수 함수도
안전하게 0으로 정규화한다.

CSS blur에는 엄밀한 마지막 픽셀 경계가 없으므로 `blur`를 바깥 영역으로 사용하는 것은
제품의 운용상 경계다. 장면 13·14 재검증과 캔버스 경계 표본에서 잘림이 보이면 별도 안전
상수를 한 곳에 추가하고 화면, runtime과 PNG가 함께 사용한다.

용도:

- 효과 clipping 방지
- 선택 효과 표시
- 그룹 overflow 경고
- PNG 캡처 경계
- 캔버스 밖 효과 경고

문서의 X, Y, width와 height는 논리 텍스트 박스 기준으로 유지한다. effect outset을
문서 프레임 값에 더해 저장하지 않는다.

편집기 geometry는 다음 두 경계를 구분한다.

- `logicalBounds`: 선택, 이동, resize handle과 저장 좌표
- `visualBounds`: 효과 표시와 clipping/overflow/PNG 진단

`visualBounds`를 기존 resize용 `selectionBounds`에 넣지 않는다. 회전 노드는 먼저 로컬
박스에 outset을 적용한 뒤 부모 회전을 포함한 canvas bounds로 변환한다. diagnostic box는
회전된 selection overlay 내부에서 역회전하지 않고 canvas 좌표 sibling으로 그린다. 최종
PNG 크기는 canvas로 고정하고 effect 때문에 자동 확장하지 않는다. `visualBounds`가
`left < 0`, `top < 0`, `right > canvas.width`, `bottom > canvas.height`인 부분 canvas
clipping은 기존 완전한 canvas 밖 진단과 별도로 표시한다. `overflow: hidden` 또는
`overflow: clip` 그룹은 자식 visual bounds와 group logical bounds를 비교해 별도 진단한다.

## 10. 인스펙터

### Fill

- 색상
- 투명도

### Strokes

- 효과 추가
- 이름
- 활성화
- 색상
- 바깥쪽 실효 두께
- 투명도
- 복제
- 삭제
- drag 순서 변경

초기 stroke 제한:

- 0~8개
- outset 0~64px
- opacity 0~1

제한은 과도한 DOM과 PNG 생성 비용을 방지하기 위한 제품 기본값이다. 상수로
관리한다. UI input뿐 아니라 document command와 validator에도 같은 제한을 적용한다.
외부 JSON이나 이전 세션이 UI를 우회해 잘못된 값을 넣어도 renderer가 무제한 레이어를
만들면 안 된다.

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

Phase 3의 구조화 효과 편집은 텍스트 노드 하나를 선택했을 때만 제공한다. 기존 Text
섹션의 scalar typography는 다중 선택을 계속 지원할 수 있지만, 순서가 있는 stroke 배열의
mixed state를 암묵적으로 합치거나 한 노드의 배열로 다른 노드를 덮지 않는다.

첫 구조화 변경은 공용 materialize 명령을 통과한다. fill, stroke와 shadow의 추가·수정·
삭제·복제·순서 변경은 모두 이 명령 계층에서 제한과 legacy scalar text appearance 제거를
적용한다. preset 적용도 같은 경로를 사용한다. locked node는 UI disabled 상태와 무관하게
command 계층에서도 문서와 history를 바꾸지 않는다. stroke row drag 한 번은 한 번의
appearance command/history 단계로 저장된다.

## 11. 텍스트 효과 프리셋

모델:

```ts
interface StudioTextEffectPreset {
  id: string;
  source: "builtin" | "custom";
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
- 편집 중 만든 custom preset은 Thumbnail Studio client의 편집기 세션 상태
- 원격 공용 preset 저장은 Phase 6

적용:

1. 허용된 typography 키만 현재 style에 복사
2. appearance를 deep copy
3. 새 stroke ID 생성
4. `source`, `presetId`, `presetVersion`을 `presetRef`에 기록
5. 이후 preset 수정과 노드 분리
6. style과 node 변경을 한 `updateDocument` 안에서 처리해 undo 한 단계로 기록

`builtin`은 코드 registry ID와 registry가 명시한 version을 사용한다.
Phase 3의 `custom`은 편집기 세션에서 생성한 ID와 version을 사용한다. 두 출처의 ID가
우연히 같아도 `source`로 구분한다. Phase 6에서 원격 저장을 도입하면 새 custom preset은
DB row ID와 row version을 사용할 수 있지만, Phase 3의 세션 presetRef도 렌더링과 무관한
출처 기록으로 안전하게 남는다.

기본 registry와 custom preview는 모두 `StudioText`를 사용한다. preview 전용으로 효과를
다시 CSS로 구현하지 않는다. `typography`는 font family, size, weight, line height, letter
spacing, alignment와 wrap policy의 명시된 allowlist만 복사하며 geometry와 position은
포함하지 않는다.

### 11.1 Phase 3 custom preset 세션 계약

- custom preset은 Thumbnail Studio client의 편집기 세션 상태에만 둔다.
- route가 unmount되거나 페이지를 새로 열면 사라진다.
- 생성과 복제는 새 preset ID를 만들고 version 1에서 시작한다.
- 이름 변경은 표현을 바꾸지 않으므로 version을 올리지 않는다.
- 생성·복제·이름 변경·삭제는 문서 history 대상이 아니다.
- 노드에 적용하는 동작만 문서 history 한 단계로 기록한다.
- preset을 삭제하거나 이름을 바꿔도 이미 적용된 노드의 appearance는 바뀌지 않는다.
- 삭제된 preset을 가리키는 `presetRef`가 남아도 렌더링은 복사된 노드 값을 사용한다.

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

`StudioRenderer`가 graph node, binding과 style을 해석한 뒤 텍스트 세부 DOM을
`StudioText`에 위임한다.

```ts
<StudioText
  text={resolvedText}
  appearance={resolveStudioTextAppearance(node, style)}
  typography={typography}
  autoFit={autoFit}
/>
```

호출 경계:

- graph 기반 authoring, runtime과 export: `StudioRenderer` → `StudioText`
- 시간표 composition의 `flexibleText`: composition resolver → `StudioText`
- 렌더링 스파이크: 표본 adapter → `StudioText`

선택 wrapper, cursor와 진단 표시는 `StudioText` 밖의 authoring UI가 소유한다. 시각 결과와
layout 계산에 실제 mode 차이가 없으므로 단지 문서 예시를 맞추기 위한 `mode` prop을 새로
추가하지 않는다. export는 runtime과 같은 DOM을 캡처하고 animation, selection overlay와
임시 cursor는 캡처 root 밖에 둔다.

## 14. 파일 변경 계획

신규:

- `src/utils/template-studio/text-effect-outset.ts`
- `src/utils/thumbnail-studio/text-effect-presets.ts`
- Thumbnail Studio text inspector components

이미 구현되어 계속 사용하는 공용 파일:

- `src/components/studio/text/studio-text.tsx`
- `src/utils/template-studio/text-appearance.ts`
- `src/utils/template-studio/text-layout.ts`

수정:

- `src/types/template-studio.ts`
- `src/components/studio/canvas/studio-renderer.tsx`
- `src/components/AutoResizeTextCard/AutoResizeText.tsx`
- `src/utils/template-studio/validator.ts`
- Phase 2의 Thumbnail inspector
  (`src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector.tsx`)

향후 시간표 효과 도입 시 수정:

- `src/utils/template-studio/variant-style-propagation.ts`

Phase 1에서 만든 공통 경로와 이름이 다르면 해당 구조를 따른다. 위 목록은
Phase 1·2의 실제 경로로 맞춰 둔 것이다. 렌더러와 Auto Text는 route 폴더가 아니라
`src/components/studio/`에 있고, 두 편집기가 함께 쓴다. route 폴더에 같은 파일을 다시
만들면 `check:studio:thumbnail-shell`이 막는다.

이미 있는 것:

- `StudioTextFill`, `StudioTextStroke`, `StudioTextShadow`,
  `StudioTextAppearance`, `StudioTextPresetReference` 타입
- `StudioGraphNode.textAppearance` 필드
- stroke `outset` 변환 규칙과 띠 두께 계산의 검증된 구현
  (`src/utils/template-studio/text-appearance.ts`). 렌더링 스파이크도 이 공용 계산을 사용한다.

## 15. 구현 순서

1. Phase 0A에서 선택한 renderer와 PNG 결정 확인
2. appearance 타입, stroke 실효 두께와 resolver
3. 고정 크기 `StudioText`
4. 단일 stroke
5. 여러 stroke와 순서
6. shadow
7. 공용 text layout 측정과 §8.2 맞춤 여유
8. flexibleText 연결
9. effect outset 계산
10. Thumbnail inspector
11. source가 구분된 preset registry와 preview
12. 현재 텍스트에서 preset 생성
13. runtime/export가 사용할 renderer API 확정

§15 9~13 상세 순서:

1. 장면 13·14를 현재 `StudioText` 경로로 다시 측정하고 기준선을 기록한다.
2. stroke 저장 순서를 실제 렌더 순서로 확정하고 renderer/band 테스트를 맞춘다.
3. effect outset 순수 함수와 비정상 값, 방향별 shadow, stroke+shadow 테스트를 추가한다.
4. `logicalBounds`와 `visualBounds`를 분리해 선택 효과, group/canvas overflow와 PNG 진단에
   연결한다.
5. `legacy scalar text appearance` materialize, appearance 명령, 범위 제한과 validator를 만든다.
6. 단일 선택 Text inspector와 연속 조작 history를 연결한다.
7. builtin registry, `StudioText` preview와 원자적 preset 적용을 만든다.
8. 세션 custom preset 생성·복제·이름 변경·삭제·적용을 만든다.
9. `StudioText`/`StudioRenderer` 경계를 문서와 호출부에 확정하고 회귀 검증한다.
10. 장면 13·14를 최종 재검증한 뒤에만 스파이크 임시 코드를 제거한다.

### 현재 구현 상태 (2026-08-01)

§15 1~13번은 코드에 반영됐다. 고정 크기와 `flexibleText`는 `StudioText` 하나를
공유하고, 자동 크기 경로는 `AutoResizeText`가 한 번만 측정한 `<p>` 안에 효과
레이어를 겹쳐 그린다. 따라서 레이어마다 별도 측정을 하지 않아 모든 레이어가 같은
font size와 줄바꿈을 사용한다.

저장 stroke 목록과 renderer drawable stroke 목록은 분리되어 disabled stroke도 Inspector에서
복구·수정·복제·삭제·drag할 수 있다. canvas clipping과 group overflow는 logical bounds를
바꾸지 않는 진단으로만 계산하고, resize handle과 저장 좌표는 계속 logical bounds를 쓴다.
회전 visual bounds는 canvas sibling diagnostic box와 부모 회전 누적 geometry를 사용한다.

§7의 공용 측정은 기존 시간표 화면의 동작을 보존하기 위해 `AutoResizeText`를
호환 측정 어댑터로 유지하는 방식으로 구현했다. `fitMargin`의 기본값은 0이라
기존 호출부는 그대로이고, Studio 경로만 `STUDIO_TEXT_FIT_MARGIN_PX`를 넘긴다.
별도의 직렬화된 `StudioTextLayout` 객체는 현재 렌더러 계약에 필요하지 않아 만들지
않았다. 효과 레이어가 측정 결과를 직접 상속하는 현재 구조가 같은 목적을 달성한다.

§8은 공용 `StudioText`를 `StudioRenderer`와 시간표 미리보기에 연결했고, 최종 제거 전
스파이크에서 같은 제품 경로를 실측했다. `preserve`(기본값)와 `single` 줄바꿈 모드는
각각 유지한다.

## 16. 완료 조건

- 하나의 텍스트 노드에 여러 stroke를 추가할 수 있다.
- stroke별 색상, 바깥쪽 실효 두께, 투명도와 순서를 바꿀 수 있다.
- renderer CSS 값과 effect outset이 같은 실효 두께 계약을 사용한다.
- 그림자를 설정할 수 있다.
- 레이어 패널에는 텍스트가 하나만 표시된다.
- 효과 레이어가 선택과 pointer event를 방해하지 않는다.
- flexibleText의 모든 효과 레이어가 같은 font size와 줄바꿈을 사용한다.
- 자동 크기 결과가 맞춤 경계에 붙지 않는다. 여유가 폭과 높이에 모두 적용되고
  상수 한 곳에서 관리된다(§8.2).
- 두꺼운 효과가 불필요하게 잘리지 않는다.
- logical bounds가 canvas 안이어도 visual effect의 부분 canvas clipping을 진단한다.
- `overflow: hidden`/`clip` 그룹에서 자식 visual bounds가 잘리는 것을 별도로 진단한다.
- `legacy scalar text appearance`를 첫 구조화 변경과 preset 적용에서 실제 style 저장값에서
  제거하고, 지원하지 않는 scalar는 원본을 보존한 채 materialize를 차단한다.
- disabled stroke도 Inspector의 저장 배열 순서로 다시 활성화·수정·복제·삭제·drag할 수
  있고, renderer는 유효한 drawable stroke를 저장 순서대로 최대 8개만 그린다.
- locked node의 새 텍스트 효과와 preset command는 document와 history를 바꾸지 않는다.
- preset 적용 후 원본 preset 변경이 노드에 자동 전파되지 않는다.
- builtin/custom preset 출처와 version 의미가 구분된다.
- graph 기반 관리자, runtime과 export가 `StudioRenderer` → `StudioText` 경로를 공유하고,
  시간표 composition도 같은 `StudioText` 표현을 사용한다.
- 기존 appearance 없는 시간표 텍스트가 기존 style fallback으로 렌더링된다.
- 시간표 variant style 전파가 `textAppearance`를 아직 복사하지 않는다는 제약이
  명시돼 있다.

## 17. 이 단계에서 하지 않는 일

- gradient
- glow
- 여러 shadow
- SVG path text
- 사용자 이미지 입력
- PNG 다운로드 UI
- 원격 preset DB
- 상세 테스트 계획
