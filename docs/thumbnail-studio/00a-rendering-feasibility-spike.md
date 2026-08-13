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
검증 당시 스파이크 페이지: `/admin/thumbnail-studio/spike-rendering` (최종 실측 후 제거)

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

이 위험을 처음 확인할 당시 `template-studio-runtime-shell.tsx`가 `html-to-image`를
직접 사용했고, 시간표 카드의 `main_title`과 `sub_title`은 `AutoResizeText` 기반 자동
크기 텍스트였다. 아래 통일 결과에서 runtime shell은 `modern-screenshot`으로 바뀌었다.

Thumbnail Studio와 별개로 현재 제품에서 재현되는지 확인이 필요하다. 재현되면
Phase 5의 export controller 통합을 기다리지 않고 먼저 고칠 후보다.

**추가 확인(2026-08-01): 제품 경로는 이 스파이크의 프로토타입과 조건이 다르다.**

처음에는 "이번에 확인한 조건과 같다"고 적었는데, 코드를 확인해 보니 두 경로가
크기를 정하는 방법과 줄이 나뉘는 조건이 서로 다르다.

|           | 프로토타입(`SpikeText`)               | 제품(`StudioText` → `AutoResizeText`) |
| --------- | ------------------------------------- | ------------------------------------- |
| 크기 탐색 | 0.5px 단위 이분 탐색                  | 최대값에서 0.5px씩 줄이는 선형 탐색   |
| 줄바꿈    | `white-space: pre-wrap` (자동 줄바꿈) | `white-space: pre` (개행에서만)       |
| 렌더 크기 | 탐색 결과 그대로                      | `Math.floor()` 적용                   |

현재 `StudioText`의 autoFit 경로는 `maxLines`를 넘기지 않는다. `AutoResizeText`의
이분 탐색은 `maxLines`가 있을 때만 동작하므로 제품 경로는 선형 탐색을 탄다.

따라서 프로토타입에서 본 "마지막 단어가 다음 줄로 밀린다"는 현상은 제품 경로에
그대로 적용되지 않는다. 자동 줄바꿈을 하지 않으므로 sub-pixel 차이가 줄 수를
바꿀 수 없다. 남는 위험은 폭 맞춤 판정이 경계에서 뒤집혀 최종 크기가 한 단계
달라지는 쪽이고, 렌더의 `Math.floor()`가 그 일부를 흡수한다.

여기까지는 코드를 읽고 세운 예측이다. 실제로 재 본 결과는 이 예측과도 달랐다. 가장 많이
축소하는 장면이 오히려 두 라이브러리에서 같았다. 아래 "제품 경로 확인 결과"를 함께 본다.

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

Phase 3의 공용 텍스트 렌더러를 만든 뒤 같은 표본으로 재검증했다. §15 13번의 renderer
경계와 runtime/export/accessibility 회귀 검증, 장면 13·14 최종 재검증이 모두 끝났으므로
`spike-rendering` 임시 폴더를 제거했다.

승격 대상:

- stroke `outset` 변환 상수
- 띠 두께와 effect outset 계산
- 표본 시나리오

### 제품 경로 확인 결과 (2026-08-01, Chrome / macOS)

장면 12~15를 두 라스터라이저로 만들고 차이 겹침으로 판정했다. 기능은 두 라이브러리 모두
정상이었다. 웹 폰트 fallback이나 캡처 실패는 없었다.

| 장면                   | 조건                                | 결과                                    |
| ---------------------- | ----------------------------------- | --------------------------------------- |
| 12. 긴 제목(개행 없음) | 한 줄. 폭에 맞추려고 크게 축소      | 두 라이브러리 같음                      |
| 13. 개행이 있는 제목   | 두 줄. 상자 높이를 거의 채움        | `modern-screenshot`이 화면과 더 잘 맞음 |
| 14. 부제목(작은 상자)  | 한 줄. 상자 높이가 줄 높이에 가까움 | `modern-screenshot`이 화면과 더 잘 맞음 |
| 15. 짧은 제목          | 축소 없음                           | 두 라이브러리 같음                      |

**폭 맞춤 경계로는 설명되지 않는다.** 가장 많이 축소하는 장면(12)이 오히려 같았고, 어긋난
두 장면은 세로가 빡빡한 쪽이다. 13은 두 줄이 상자 높이를 거의 채우고, 14는 상자 높이가 줄
높이에 가깝다. 그래서 의심되는 곳은 글자 전진폭이 아니라 줄 높이와 세로 정렬 계산이다.

원인은 확정하지 않았다. 이번 판정은 겹쳐 보기로 한 눈 판정이고, 어느 계산이 갈리는지까지
분해하지 않았다. 확정하려면 두 결과의 줄 상자 높이와 baseline을 각각 재야 한다.

결론은 `modern-screenshot`으로 통일이다. 표준이 이미 그것이었고, 제품 경로에서 더 잘 맞거나
같았다. 더 나쁜 장면은 없었다.

**Phase 3에서 다시 볼 것.** §11이 요구한 안전 여유를 폭에만 두면 부족하다. 어긋난 장면이
모두 세로가 빡빡한 쪽이었으므로 여유는 높이에도 적용한다. 공용 텍스트 렌더러를 만든 뒤
같은 장면(13, 14)으로 재확인한다.

### Phase 3 장면 13·14 재검증 절차

2026-08-01 현재 장면 13·14의 제품 표본은 이미 `StudioText` → `AutoResizeText` 경로를
사용한다. 스파이크 컴포넌트 이름과 화면 설명의 과거 표기를 실제 구현명인 `StudioText`로
정리한 뒤 결과를 기록한다.

재검증은 §15 9~13 구현 전 기준선과 구현 완료 후 최종 결과를 같은 환경에서 각각 남긴다.

기록 항목:

- 실행일, Chrome 버전, macOS 버전과 사용 font family/weight
- live DOM의 computed font size, line height, 줄 수와 content width/height
- `document.fonts.ready` 완료 여부와 fallback 발생 여부
- `modern-screenshot` PNG와 live DOM의 줄 수·줄바꿈 지점 일치 여부
- live DOM 대비 PNG glyph alpha bounding box의 상·우·하·좌 차이
- `mix-blend-mode: difference` 겹침 판정과 필요 시 PNG 첨부 경로

PNG에는 CSS font size 메타데이터가 없으므로 “PNG font size를 측정했다”고 기록하지
않는다. font size는 live DOM의 computed value로 기록하고, PNG와의 크기·위치 일치는 glyph
alpha bounding box와 줄 경계를 근거로 판정한다. 원시 픽셀 diff는 안티앨리어싱 차이 때문에
계속 참고값으로만 사용한다.

합격 조건:

- live DOM computed font size가 예상값과 일치
- 줄 수와 명시적 개행 위치가 완전 일치
- PNG glyph bounding box가 live DOM 기준 1px 이내
- 웹 폰트 fallback 없음

기준선과 최종 결과는 이 문서의 아래 표에 실제 숫자로 남긴다. 두 행 모두 DOM font size와
줄 수, live/PNG glyph bbox, fallback 판정을 기록한 뒤에만 스파이크를 제거한다.

| 시점             | 장면 | DOM font size / line height | 줄 수 | 콘텐츠 크기 | live / PNG glyph bbox                                  | fallback | 판정 |
| ---------------- | ---- | --------------------------: | ----: | ----------: | ------------------------------------------------------ | -------- | ---- |
| §15 9~13 구현 전 | 13   |               10px / 10.8px |     2 |    380 × 22 | `x=40..131,y=165..185` / `x=40..131,y=165..185` (Δ0px) | 없음     | 통과 |
| §15 9~13 구현 전 | 14   |               10px / 10.8px |     1 |    360 × 11 | `x=41..185,y=175..185` / `x=41..185,y=175..184` (Δ1px) | 없음     | 통과 |
| §15 13 완료 후   | 13   |               10px / 10.8px |     2 |    380 × 22 | `x=40..131,y=165..185` / `x=40..131,y=165..185` (Δ0px) | 없음     | 통과 |
| §15 13 완료 후   | 14   |               10px / 10.8px |     1 |    360 × 11 | `x=41..185,y=175..185` / `x=41..185,y=175..184` (Δ1px) | 없음     | 통과 |

실측은 2026-08-01, macOS 15.6.1, Codex in-app Chrome에서 수행했다. `StudioText` →
`AutoResizeText` 표본의 `data-load-state="loaded"`, `document.fonts.status="loaded"`와
두 weight의 `document.fonts.check()`를 확인했다. live DOM 캡처와 PNG 모두 캔버스 내부
좌표의 glyph alpha/ink bbox를 threshold 200으로 비교했다. 장면 13은 live/PNG가
`x=40..131, y=165..185`로 일치했고, 장면 14는 live `x=41..185, y=175..185`와 PNG
`x=41..185, y=175..184`로 세로 끝점만 1px 차이였다. 장면 13의 명시적 개행은 두
렌더링 모두 두 줄 경계로 일치했다. live DOM 캡처는 in-app 브라우저의 JPEG viewport를
캔버스 CSS 크기로 환산해 기록했으며, JPEG 압축으로 생긴 한계 픽셀은 합격 오차에 포함했다.
§15 9~13 구현 전 행은 이 두 장면에서 효과가 없어 렌더 동작이 바뀌지 않는 기준선임을 diff로
확인한 뒤 같은 표본을 실측한 값이다. 네 행 모두 실측값과 판정을 갖췄으므로
`spike-rendering` 임시 폴더를 제거했다.

### Studio Auto Text 측정 오염 회귀 수정 (2026-08-03)

앞의 장면 13·14 표에 있는 `10px`은 당시 실제로 관찰한 값이지만, 정상적인 Studio Auto
Text 결과로 해석하면 안 된다. 그 시점의 `StudioText` auto-fit은 범용 `AutoResizeText`의
`<p>` 안에서 논리 텍스트와 absolute stroke/fill/shadow 레이어를 함께 렌더링했다.
`scrollWidth`와 `scrollHeight`가 효과 레이어의 overflow까지 측정했고, 텍스트가 박스를
초과한다고 잘못 판단해 최소값까지 줄어든 측정 오염이었다.

수정 후에는 `StudioAutoFitText`가 효과가 있을 때만 `<p>` 안의 논리 텍스트 `<span>`을
측정하고, 효과 레이어는 그 span의 형제로 렌더링한다. 최종 `font-size`는 root `<p>`가
소유하며 stroke/fill/shadow는 그 값을 상속한다. 효과가 없는 문서는 root `<p>` 자체를
측정하는 기존 경로를 유지한다. 범용 `AutoResizeText`의 레거시 호출부는 변경하지 않았다.

실측 결과:

| 조건                                  | computed font-size | 결과                            |
| ------------------------------------- | -----------------: | ------------------------------- |
| 짧은 텍스트, stroke 있음, max size 42 |               42px | 박스 안에 들어가며 최대값 유지  |
| 같은 텍스트·박스, 효과 없음           |               42px | 효과 있음과 일치                |
| 같은 짧은 텍스트, max size 42 → 64    |        42px → 64px | Size 변경이 최대값에 반영       |
| 박스보다 긴 텍스트, 효과 있음/없음    |        14px / 14px | 두 경로가 같은 크기로 정상 축소 |
| preserve / single                     |   `pre` / `nowrap` | 기존 줄바꿈 계약 유지           |

관리자 캔버스의 Draft preview는 수정된 `StudioRenderer` 경로에서 효과 있는 Auto Text를
그대로 렌더링했고, root/measurement/stroke/fill 레이어의 computed font-size가 모두
일치했다. PNG export는 `ThumbnailRuntimeShell`의 `StudioExportRoot`가 같은
`StudioRenderer`를 사용하고 `modern-screenshot`으로 캡처하는 기존 경로를 유지하며,
`check-thumbnail-studio-runtime` 계약 검사로 이를 확인했다. 실측 중 만든 효과 표본은
저장하지 않은 draft라 원격 runtime preview/PNG에는 전송하지 않았다.

확인 환경: 2026-08-03, macOS 15.6.1, Codex 연결 Chrome. `document.fonts.status`는
`loaded`였다.

### 통일 결과

`template-studio-runtime-shell.tsx`를 `modern-screenshot`으로 바꿨다. 이 셸은
사용자 화면(`/template-studio/[templateId]`)과 관리자 미리보기
(`/admin/template-studio/[templateId]/preview`)가 함께 쓰므로 두 화면이 같이 바뀐다.

옵션 대응:

| html-to-image              | modern-screenshot                 |
| -------------------------- | --------------------------------- |
| `pixelRatio: 1`            | `scale: 1`                        |
| `cacheBust: true`          | `fetch: { bypassingCache: true }` |
| `style`, `width`, `height` | 같음                              |

캡처 전에 `document.fonts.ready`를 기다리는 단계를 함께 넣었다. 런타임 셸에는 이 단계가
없었다. 준비 전에 캡처하면 fallback 폰트가 결과 이미지에 굳는데, 화면에는 제대로 보이므로
사용자는 파일을 열어 보고서야 알게 된다. 스파이크의 캡처 절차에는 원래 이 단계가 있었다.

되돌아가지 않도록 `npm run check:studio:rasterizer`를 붙였다. 런타임 셸이
`modern-screenshot`을 쓰는지, 폰트 대기가 캡처보다 먼저 오는지, `html-to-image`를 새로
쓰는 파일이 생기지 않았는지를 본다.

### 남은 래스터라이저 분기

```text
html-to-image      components/TimeTable/TweetPreviewModal.tsx   레거시 시간표 공유
modern-screenshot  template-studio/.../runtime/...-shell.tsx    Studio 사용자 PNG
                   hooks/useTimeTableState.ts                   레거시 시간표
```

레거시 시간표 공유 화면은 Studio 문서를 쓰지 않고 이번에 결과를 확인하지 않았으므로
바꾸지 않았다. 확인 없이 사용자에게 나가는 이미지 경로를 바꾸지 않는다. 가드는 이 한
곳을 허용 목록으로 두고 새로 늘어나는 것만 막는다.
