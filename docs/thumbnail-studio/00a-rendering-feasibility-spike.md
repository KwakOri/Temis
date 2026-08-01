# Phase 0A. 텍스트 효과와 PNG 렌더링 선행 스파이크

상태: 실행 완료. §9 완료 조건 충족 (→ [§11 결정 기록](#11-결정-기록))  
선행 단계: [Phase 0 — 제품 계약과 문서 모델](./00-product-contract.md)  
후속 단계: [Phase 1 — Studio Core와 Adapter 분리](./01-studio-core-extraction.md)

## 1. 목표

Thumbnail Studio의 핵심 약속인 “관리자 캔버스, 사용자 미리보기와 PNG 결과가
같다”를 본 구현 전에 확인한다.

같은 React renderer와 DOM을 사용하더라도 DOM-to-image 라이브러리가 CSS를 SVG
`foreignObject`로 직렬화하고 다시 rasterize하는 과정에서 텍스트 stroke, shadow,
웹 폰트가 달라질 수 있다.

이 스파이크에서 PNG 표준 라이브러리와 텍스트 효과 렌더링 방식을 먼저 결정한다.
결정이 끝나기 전에는 Phase 3의 공용 텍스트 렌더러를 확정하지 않는다.

## 2. 현재 상황

저장소에는 두 PNG 생성 라이브러리가 공존한다.

```text
html-to-image
└── Template Studio runtime PNG

modern-screenshot
└── 기존 TimeTable PNG
```

현재 위치:

- `src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx`
- `src/hooks/useTimeTableState.ts`
- `src/components/TimeTable/TweetPreviewModal.tsx`

라이브러리 이름이나 계보만으로 품질을 판단하지 않는다. 실제 Thumbnail Studio
효과 표본을 기준으로 비교한다.

## 3. 표본 장면

일회용 스파이크 페이지 또는 독립 컴포넌트에 다음 장면을 만든다.

- 고정 크기 텍스트
- 자동 크기 텍스트
- 여러 줄 텍스트
- 웹 폰트
- 단색 fill
- 바깥 실효 두께가 다른 stroke 3개
- 반투명 stroke
- offset과 blur가 있는 shadow
- 투명 캔버스 배경
- 불투명 캔버스 배경
- 캔버스 경계와 가까운 텍스트

실제 관리자 인스펙터나 문서 모델 전체를 먼저 만들 필요는 없다. 렌더링 결정을
내리는 데 필요한 최소 DOM만 사용한다.

## 4. 비교 대상

필수 비교:

1. DOM effect layer + `html-to-image`
2. DOM effect layer + `modern-screenshot`

필요 시 비교:

3. SVG `<text>` effect layer + 더 안정적인 PNG 라이브러리
4. Canvas text drawing

SVG와 Canvas 대안은 두 DOM 경로가 핵심 효과를 보존하지 못할 때만 진행한다.
처음부터 별도 렌더링 백엔드를 만들지 않는다.

## 5. 확인 항목

화면과 PNG 사이에서 확인할 내용:

- glyph 위치
- 줄바꿈
- 최종 font size
- stroke 실효 두께
- stroke 간 보이는 띠의 두께
- stroke 순서
- shadow offset과 blur
- opacity
- 웹 폰트
- 투명 배경
- 캔버스 경계 clipping

지원 대상 브라우저에서 결과가 다르면 브라우저별 차이를 기록한다. 최소 기준은
프로젝트의 주 사용 브라우저이며, Safari를 공식 지원한다면 Safari 결과도 표준
결정 전에 확인한다.

## 6. Stroke 의미

사용자에게 표시하는 두께는 glyph 바깥으로 보이는 실효 두께다.

```ts
type StudioTextStroke = {
  outset: number;
};
```

중앙 정렬 CSS stroke를 사용할 때:

```ts
cssStrokeWidth = outset * 2;
```

스파이크는 이 변환이 화면과 PNG에서 동일하게 보이는지 확인한다. 다른 렌더링
방식을 선택하더라도 저장 모델의 `outset` 의미는 유지한다.

## 7. 결정 결과

스파이크 종료 시 다음을 기록한다.

- 표준 PNG 라이브러리 하나
- 표준 텍스트 효과 렌더링 방식
- 지원 브라우저 범위
- stroke 실효 두께 변환 규칙
- shadow와 blur 지원 범위
- 알려진 차이와 제한
- Phase 3에서 사용할 renderer 계약
- Phase 5 export controller에서 사용할 라이브러리

비교 결과가 불충분하면 “같은 렌더러를 쓰므로 동일하다”는 가정으로 진행하지
않는다. 표현 범위를 줄이거나 SVG/Canvas 대안을 선택한 뒤 Phase 3으로 넘어간다.

## 8. 임시 코드 처리

스파이크 페이지는 제품 route에 남기지 않는다.

재사용 가치가 있는 결과:

- 표본 데이터
- stroke 변환 상수
- export 옵션
- 결과 이미지
- 결정 기록

일회용 UI와 임시 버튼은 결정 후 제거한다.

## 9. 완료 조건

- 두 기존 PNG 라이브러리의 실제 효과 결과를 비교했다.
- 다중 stroke, shadow, 자동 크기와 웹 폰트의 차이를 확인했다.
- Thumbnail Studio가 사용할 PNG 라이브러리 하나를 선택했다.
- DOM, SVG 또는 Canvas 중 텍스트 효과 렌더링 방식을 선택했다.
- stroke의 저장 값과 renderer 변환 의미가 확정됐다.
- Phase 3과 Phase 5가 같은 결정 기록을 참조한다.

## 10. 이 단계에서 하지 않는 일

- 전체 Thumbnail Studio UI
- 최종 인스펙터
- 문서 저장과 발행
- 사용자 runtime
- 새 그래픽 라이브러리의 선제적 도입
- 세부 회귀 테스트 체계 구축

## 11. 결정 기록

실행일: 2026-07-30  
실행 환경: macOS, Chrome  
스파이크 페이지: `/admin/thumbnail-studio/spike-rendering`

Phase 3과 Phase 5는 이 절을 기준으로 구현한다.

### 결정

| 항목                    | 결정                                                           |
| ----------------------- | -------------------------------------------------------------- |
| 표준 PNG 라이브러리     | `modern-screenshot` (`domToPng`)                               |
| 텍스트 효과 렌더링 방식 | DOM effect layer 유지. SVG와 Canvas 대안 불필요                |
| stroke 저장 의미        | glyph 바깥 실효 두께 `outset`                                  |
| CSS 변환                | `cssStrokeWidth = outset × 2` (화면과 PNG 모두 일치 확인)      |
| 지원 브라우저           | Chrome                                                         |
| 폰트 메트릭             | 임포트 시 `ascent/descent/line-gap/size-adjust` 자동 주입 확인 |

### 확인된 항목

- 다중 stroke의 실효 두께, 보이는 띠 두께와 앞뒤 순서가 화면과 PNG에서 일치
- shadow offset과 blur 유지
- 자동 크기 텍스트에서 모든 효과 레이어가 같은 font size와 줄바꿈 사용
- jsdelivr CDN 웹 폰트가 PNG에 embed되고 fallback 없음
- 투명 캔버스 배경의 alpha 보존
- 캔버스 경계 clipping이 화면과 PNG에서 동일
- Studio 폰트 파서가 오버라이드 없는 눈누 CSS에 메트릭 기본값을 주입

### 알려진 차이와 제한

**자동 크기 텍스트가 줄바꿈 경계에서 취약하다.**

`html-to-image`는 자동 크기 텍스트에서만 유의미한 오차를 보였다. 원인은 폰트
embed 실패가 아니다. 고정 크기와 웹 폰트 장면은 두 라이브러리 모두 일치했다.

이분 탐색은 박스에 맞는 최대 크기를 찾으므로 결과가 항상 줄바꿈 경계 직전이다.
이 상태에서 glyph 전진폭이 sub-pixel만 달라져도 마지막 단어가 다음 줄로 밀려
결과가 줄 단위로 어긋난다.

`modern-screenshot`은 이번 표본에서 일치했지만 취약성 자체는 남는다. 브라우저
버전이나 폰트가 바뀌면 다시 경계를 넘을 수 있다.

Phase 3의 공용 측정에 안전 여유를 둔다.

- 탐색이 찾은 크기를 그대로 쓰지 않고 한 단계 내리거나 비율로 축소한다
- 또는 맞춤 판정에 여유 픽셀을 적용해 경계에 붙지 않게 한다
- 여유값은 상수로 관리하고 이 스파이크 표본으로 재확인한다

**Windows 래스터화는 확인하지 않았다.**

메트릭 오버라이드는 폰트가 보고하는 메트릭만 정규화하므로 레이아웃은 플랫폼
간 동일해진다. glyph 래스터화는 정규화하지 않는다. 관리자가 macOS에서
디자인하고 사용자가 Windows에서 PNG를 생성하는 경우의 픽셀 차이는 이 스파이크
범위 밖이다.

제품 약속의 수준을 다음과 같이 구분한다.

- 레이아웃 동일: 보장. 줄바꿈, 글자 위치, 최종 크기
- 픽셀 동일: 비보장. 안티에일리어싱과 힌팅은 플랫폼에 따라 다르다

**기존 시간표 PNG 내보내기에 동일한 위험이 있다.**

`template-studio-runtime-shell.tsx`가 `html-to-image`를 직접 사용하고, 시간표
카드의 `main_title`과 `sub_title`은 `AutoResizeText` 기반 자동 크기 텍스트다.

Thumbnail Studio와 별개로 현재 제품에서 재현되는지 확인이 필요하다. 재현되면
Phase 5의 export controller 통합을 기다리지 않고 먼저 고칠 후보다.

**추가 확인(2026-08-01): 제품 경로는 이 스파이크의 프로토타입과 조건이 다르다.**

처음에는 "이번에 확인한 조건과 같다"고 적었는데, 코드를 확인해 보니 두 경로가
크기를 정하는 방법과 줄이 나뉘는 조건이 서로 다르다.

| | 프로토타입(`SpikeText`) | 제품(`StudioAutoText` → `AutoResizeText`) |
| --- | --- | --- |
| 크기 탐색 | 0.5px 단위 이분 탐색 | 최대값에서 0.5px씩 줄이는 선형 탐색 |
| 줄바꿈 | `white-space: pre-wrap` (자동 줄바꿈) | `white-space: pre` (개행에서만) |
| 렌더 크기 | 탐색 결과 그대로 | `Math.floor()` 적용 |

`StudioAutoText`는 `maxLines`를 넘기지 않는다. `AutoResizeText`의 이분 탐색은
`maxLines`가 있을 때만 동작하므로 제품 경로는 선형 탐색을 탄다.

따라서 프로토타입에서 본 "마지막 단어가 다음 줄로 밀린다"는 현상은 제품 경로에
그대로 적용되지 않는다. 자동 줄바꿈을 하지 않으므로 sub-pixel 차이가 줄 수를
바꿀 수 없다. 남는 위험은 폭 맞춤 판정이 경계에서 뒤집혀 최종 크기가 한 단계
달라지는 쪽이고, 렌더의 `Math.floor()`가 그 일부를 흡수한다.

프로토타입 결과를 제품 결과로 읽지 않도록 스파이크 페이지에 제품 경로 장면을
추가했다(12~15). 시간표 카드의 실제 박스와 글자 크기를 옮겨 왔다.

- `style_main_title`: 380 × 74 / 42px / 800
- `style_sub_title`: 360 × 42 / 18px / 600

두 라스터라이저를 나란히 만들고 차이 겹침으로 판정한다. 확인할 것은 줄 수보다
**최종 font size와 glyph 위치가 두 라스터라이저에서 같은지**다.

### 판정 기준

원시 픽셀 차이는 합격 조건에서 제외했다. 메트릭 오버라이드가 레이아웃은
맞추지만 안티에일리어싱은 맞추지 않으므로, 픽셀 diff는 참고 지표로만 본다.

합격 조건은 구조적 지표로 판정했다.

- glyph 바운딩 박스 위치: 화면 대비 1px 이내
- 줄 수와 줄바꿈 지점: 완전 일치
- 측정 font size: 화면과 완전 일치
- stroke 실효 두께: 지정값의 ±10% 이내
- 웹 폰트 fallback: 발생 시 실패
- 투명 배경 alpha: 이진 판정

비교는 생성된 PNG를 화면 위에 `mix-blend-mode: difference`로 겹쳐서 판정했다.

### 스파이크 코드 처리

Phase 3의 공용 텍스트 렌더러를 만든 뒤 같은 표본으로 재검증할 때까지 스파이크
페이지를 유지한다. 재검증이 끝나면 `spike-rendering` 폴더를 제거한다.

승격 대상:

- stroke `outset` 변환 상수
- 띠 두께와 effect outset 계산
- 표본 시나리오

### 다음에 할 일

스파이크 페이지 `/admin/thumbnail-studio/spike-rendering`에서 장면 12~15를
확인한다. Chrome에서 열고 "PNG 생성"을 누른 뒤 두 라스터라이저에 차이 겹침을
적용한다.

- 최종 font size가 두 라스터라이저에서 같은가
- glyph 위치가 화면 대비 1px 이내인가
- 웹 폰트가 fallback으로 바뀌지 않았는가

`html-to-image`에서만 어긋나면 `template-studio-runtime-shell.tsx`를
`modern-screenshot`으로 바꾼다. 어긋나지 않아도 표준을 하나로 두기 위해 바꾸는
편이 낫다. 지금은 한 제품에 두 라스터라이저가 공존한다.

```text
html-to-image      runtime/template-studio-runtime-shell.tsx   사용자 PNG
                   components/TimeTable/TweetPreviewModal.tsx  레거시 시간표
modern-screenshot  hooks/useTimeTableState.ts                  레거시 시간표
```

확인은 `/admin/template-studio/[templateId]/preview`에서도 할 수 있다. 그 화면은
사용자 화면과 같은 셸을 쓰고 PNG 다운로드도 조건부가 아니다. 다만 저장된 draft나
published 문서가 있어야 열린다.
