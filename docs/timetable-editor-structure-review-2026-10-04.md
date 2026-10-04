# 시간표 에디터 구조 검토

검토일: 2026-10-04. 첨부 화면과 현재 저장소의 타입, 프리셋 생성, 선택·편집 명령, 렌더링, 마이그레이션, 검사 스크립트를 기준으로 검토했다. 최초 검토에서는 특정 템플릿의 저장된 JSON이나 원격 DB를 조회하지 않았고, 이후 구현 단계의 브라우저 검증과 제한은 아래에 별도로 기록했다. 1~6절은 구현 전의 구조·UX 검토 기록이고, 7~9절은 이후 적용한 1·2·3a단계 구현 결과이고, 10절은 3b단계 저장 모델 통합 설계, 11~15절은 사용자 조건 변경 후 신규 모델과 실제 에디터 연결·프리셋 생성 정리 결과다.

## 판단

사용자가 느낀 불균일함은 코드에도 있다. 현재 시스템은 자유로운 그래픽 요소를 편집하는 기반과 시간표 전용 조합을 함께 사용하지만, **기본 요소, 시간표 역할, 데이터 연결, 상태별 디자인, 배치 규칙을 구분하는 기준이 UI 전체에서 일관되지 않다.**

객체마다 다른 기능을 갖는 것 자체는 자연스럽다. 날짜 텍스트에는 포맷이 필요하고, 선택적으로 사용하는 장식에는 On/Off가 필요하다. 개선 목표는 모든 객체에 같은 속성을 붙이는 것이 아니라, 같은 기능은 같은 기준·위치·용어로 편집하게 만드는 것이다.

자유 배치 기반과 시간표 보일러플레이트는 유지할 가치가 있다. 우선 편집 계약과 UI를 정리하고, 저장 모델 통합은 단계적으로 진행하는 편이 적절하다.

## 1. 현재 구조

### 두 객체 트리가 한 결과물을 만든다

| 구분 | Cards | Timetable |
| --- | --- | --- |
| 저장 위치 | `document.graph.nodes` | `domains.timetable.composition.objects` |
| 기본 요소 | Group, Text, Auto Text, Image, Shape | Group, Text, Auto Text, Image + 생성 카드와 레거시 전용 종류 |
| 스타일 | `styleId` → `document.styles` | 객체 내부 `style` |
| 상태별 구조 | Component Set의 `variants[statusId]` → 그래프 루트 | 객체의 `variantSet.rootByValue` → composition 자식 |
| 주요 역할 | 요일 카드 내부 디자인 | 주간 캔버스에서 카드 묶음·프로필·메모·장식 배치 |

시간표의 생성 카드 렌더러는 요일별 Component Set과 상태를 결정한 뒤 공통 `StudioRenderer`로 Cards 그래프를 그린다. 바깥 composition은 별도 렌더링 분기를 사용한다. 따라서 공통 렌더러가 전혀 없는 구조는 아니지만, 모든 요소가 하나의 공통 객체 모델로 동작하는 구조도 아니다.

근거: [타입 정의](/Users/kwakori/projects/promotion/temis/src/types/template-studio.ts:273), [composition 객체](/Users/kwakori/projects/promotion/temis/src/types/template-studio.ts:513), [카드 그래프 렌더링](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-preview.tsx:1015).

### 객체별 기능은 다음처럼 나뉜다

| 대상 | 현재 구조 | 데이터·상태 | 주요 편집 |
| --- | --- | --- | --- |
| Week Dates | Text, 반복 생성 가능 | `week.date_range` 바인딩 | 기간 포맷, 타이포그래피, 위치 |
| Artist | Group → On/Off Group → Auto Text + 배경 Image | 전역 텍스트 입력 + 전역 상태 입력 | 부모에서 상태, 자식에서 내용·이미지·스타일 |
| Weekly Memo | Artist와 같은 상태별 그룹 구조 | 전역 메모 입력 + 전역 상태 입력 | 상태, 텍스트, 배경 |
| Top Object | Group → On/Off Group → Image | 전역 상태 입력 | 상태, 이미지; 부모에서 Always On 선택 가능 |
| Profile Block | Group → Back Plate/User Image/Frame | 사용자 이미지 입력 | 자식별 이미지, 사용자 이미지 마스크 |
| Board | 캔버스에 맞추는 Image | 템플릿 이미지 | 이미지, 표시 여부, 투명도 |
| Day Card Containers | `generatedDayCards` | 별도 `dayCardsLayout`와 요일 데이터 | 격자, 빈 칸, 간격, 카드별 보정 |
| Mon/Tue… Card | `day-card:<dayId>` 가상 레이어 | 요일의 Component Set 참조 | Component Set, 위치·회전; 삭제 불가 |

근거: [프리셋 정의](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/preset-registry.ts:111), [입력과 객체 생성](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-preset-commands.ts:27), [선택 해석](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-selection.ts:32).

### 현재 잘 분리된 부분

- `StudioBinding`은 정적 값, 사용자 입력, 내장 시간표 필드를 구분한다. 날짜·시간 포맷을 바인딩에 저장할 수 있다. 다만 Timetable의 기존 Week Dates 기간 포맷은 별도로 `style`에 저장한다.
- 객체 On/Off와 일정의 Online/Offline 상태는 별도 모델이며, 런타임 상태 해석도 분리되어 있다.
- Cards에는 기본 요소 정의표가 있고, 선택 해석·명령·인스펙터도 일부 분리되어 있다.
- Component Set의 요일별 지정과 공통 프레임, 독립적인 일정 상태별 디자인을 유지하는 기반이 있다.
- 관련 회귀 검사들이 마련되어 있다. 구조를 교체하기 전에 기존 동작을 기준점으로 삼을 수 있다.

근거: [바인딩](/Users/kwakori/projects/promotion/temis/src/types/template-studio.ts:247), [기본 요소 정의표](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/node-definitions.ts:42), [Component Set 해석](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/component-sets.ts:43), [독립 상태 구성](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/status-variants.ts:230).

## 2. 불균일함을 만드는 지점

### A. 기본 요소와 프리셋 역할이 편집 기능을 함께 결정한다

인스펙터는 `kind`, `presetId`, `semanticKey`, `profileRole`, `structuredRole`을 조합해서 기능을 결정한다. `isWeekDates`, `isArtistProfileText`, `isLegacyProfileBlock` 같은 플래그가 누적되는 형태다.

기간 포맷은 데이터 원본을 보고 제공할 수 있는 기능인데, 현재 Timetable 인스펙터에서는 `isWeekDates`에 의존한다. On/Off 모델은 일반적인 형태지만 기본 생성·입력 연결은 Artist/Weekly Memo/Top Object 목록에 묶이고, Always On 컨트롤은 Top Object에만 노출된다.

결과적으로 새 객체를 넣을 때 “이 기능을 지원하는가”보다 “어떤 프리셋인가”를 여러 곳에서 판별하게 된다.

근거: [선택 플래그](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-selection.ts:46), [포맷 노출](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-inspector.tsx:324), [상태 컨트롤](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-object-inspector-controls.tsx:489).

### B. ‘상태’에 서로 다른 세 가지 의미가 있다

1. **일정 상태**: Online/Offline, 그리고 기능 활성화와 일정 수 등에 따른 Multi/Offline Memo 디자인.
2. **객체 상태**: Artist 등의 On/Off 디자인과 실제 사용자 입력값.
3. **편집 중 상태**: 제작자가 지금 수정하려고 고른 On/Off 또는 Cards 상태.

객체 런타임 렌더는 입력값·기본값을 사용하므로 편집 상태를 곧바로 사용자 값으로 착각하는 구현은 아니다. 다만 편집 상태인 `activeValue`가 문서의 `variantSet`에 저장되고, 인스펙터의 상태 버튼도 일반 문서 갱신 경로를 이용한다. 편집 대상 선택과 템플릿 설정 변경의 경계가 흐려진다.

또한 `hidden`과 Off 상태는 별개다. Off에도 별도 디자인이 있을 수 있고, 초기 Off 그룹은 숨겨진 구조로 만들어진다. 단순 표시 스위치와 대체 디자인을 같은 설명으로 묶으면 사용자가 동작을 예측하기 어렵다.

근거: [편집 상태와 런타임 상태 해석](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-composition.ts:270), [상태 버튼](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-object-inspector-controls.tsx:538), [문서 갱신 경로](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_hooks/use-timetable-object-commands.ts:344).

### C. 같은 Layers 목록에 서로 다른 편집 대상이 섞인다

첨부 화면의 Group, Text, Image는 실제 composition 객체다. 그 아래 Mon Card는 저장된 자식 객체가 아니라 요일 데이터에 대한 가상 레이어다. 그래서 부모에서 전체 카드의 격자·보정값을 편집하고, 요일을 선택하면 다른 모델인 Component Set과 위치를 편집한다.

또한 상태가 있는 그룹은 현재 편집 상태의 자식만 트리에 표시한다. 상태 기능이 있는 부모와 스타일을 가진 자식을 번갈아 선택해야 전체 설정을 파악할 수 있다. 생성 카드 내부 요소는 Timetable 화면에서 직접 편집되는 자식으로 노출되지 않고 Cards 화면에서 편집한다.

근거: [레이어 생성](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-layer-panel.tsx:147), [요일 가상 레이어](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-layer-panel.tsx:196).

### D. 값의 저장 위치가 중복된다

이미지·표시 여부 등은 `assetSlots`, `hidden`, `style`과 `meta.exception.editableSlots`에 중복 표현된다. 배경은 레거시 `backgroundAssetId/backgroundFit`도 남아 있다. setter가 여러 위치를 함께 수정해 일관성을 유지하는 방식이다.

즉시 고장이라고 단정할 수는 없지만, 직접 수정 경로가 늘어날수록 동기화 책임이 커진다. 메타데이터가 “어디를 편집할 수 있는가”와 “지금 값이 무엇인가”를 동시에 담는 점을 정리할 필요가 있다.

근거: [표시 setter](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/semantic-slots.ts:108), [이미지 setter](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/semantic-slots.ts:120), [배경 호환 setter](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/semantic-slots.ts:177).

### E. 읽기 과정에 구조 변환이 포함된다

`getStudioTimetableComposition()`은 단순 조회가 아니라 정규화를 수행한다. 레거시 Profile/Artist/Memo/Top Object를 그룹과 상태별 자식으로 변환하고, 기본 카드 컨테이너도 보충한다. 원본을 직접 바꾸는 getter는 아니지만, 읽은 결과가 저장된 원본과 다른 구조일 수 있다.

호환성에는 도움이 되지만, canonical 변환을 로드·가져오기 경계에 집중하면 선택·명령·검증·렌더링이 같은 구조를 기준으로 동작하게 만들기 쉽다. 현재 `migrations.ts`도 있으므로 그 경계를 강화할 수 있다.

근거: [composition 정규화](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-composition.ts:967), [마이그레이션](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/migrations.ts:242).

### F. 배치 모드에 따라 같은 값의 의미가 바뀐다

`dayOffsets.left/top`은 Grid에서는 자동 위치에 대한 보정이고 Custom에서는 캔버스 절대 좌표다. UI 라벨은 이를 구분하지만 저장 필드는 동일하다. Grid에서 Custom으로 진입하면 현재 구현은 `dayOffsets`를 초기화한다.

현재 검사로 보장된 동작이므로 단순 버그로 취급할 수는 없다. 다만 장기적으로 배치 모드를 명시적인 타입으로 구분하고, 모드 전환 시 화면상의 위치를 보존할지 초기화할지 정책을 정하면 편집 경험이 더 예측 가능해진다.

근거: [배치 타입](/Users/kwakori/projects/promotion/temis/src/types/template-studio.ts:475), [Custom 전환](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-day-cards-layout-controls.tsx:87).

## 3. 권장 모델

객체를 다음 다섯 축으로 설명하는 공통 편집 계약을 권장한다. 기존 JSON을 즉시 이 형태로 바꾸자는 뜻은 아니다.

| 축 | 답해야 하는 질문 | 예 |
| --- | --- | --- |
| 기본 요소 | 무엇을 그리는가? | Text, Auto Text, Image, Shape, Group |
| 역할·구조 계약 | 시간표에서 무슨 역할이며 무엇을 보호하는가? | 주간 날짜, 프로필 이미지, 카드 반복 영역 |
| 데이터 원본·표시 형식 | 무슨 값을 어떤 형식으로 보여주는가? | 주간 날짜 → 기간 포맷, 입력값 → 텍스트 |
| 표시·상태 기능 | 항상 보이는가, 사용자가 끄는가, 상태별 디자인이 있는가? | Always, 사용자 토글, On/Off 디자인 |
| 배치 | 어디에 어떻게 배치하는가? | 자유 좌표, 부모에 맞춤, Grid, 요일별 보정 |

**프리셋은 이 축들의 초기 조합을 만드는 레시피**로 두고, 인스펙터는 기본 요소와 지원 기능·바인딩을 보고 구성한다. 프리셋 이름 자체가 편집 기능을 결정하는 분기는 줄인다. 도메인의 필수 구조와 입력 scope 제한은 별도 계약으로 계속 검증한다.

예를 들어 Week Dates는 “기간 데이터를 표시하는 Text”, Artist는 “입력 텍스트와 배경을 가진 Group + 선택적 상태 기능”, Day Card Containers는 “요일 데이터를 카드 디자인에 연결해서 반복 배치하는 도메인 요소”로 설명할 수 있다.

### 상태 모델의 경계

- 일정 상태 계산은 시간표 도메인에 유지한다. Multi와 Offline Memo까지 모든 객체의 일반 상태로 바꾸지 않는다.
- 단순 표시 토글과 상태별 디자인은 구분한다. 기존에 Off 디자인을 만든 문서는 계속 보존한다.
- `editingVariantByObjectId`, 선택된 Cards 상태 등은 editor view state에 둔다.
- 기본값, 사용자에게 토글을 허용하는 정책, 상태별 디자인 참조는 문서에 둔다.
- 실제 사용자 선택값은 runtime values에 둔다.
- 공통화할 수 있는 것은 상태 선택 컨트롤·순회·검증·편집 대상 표현이다. 전체 도메인 로직을 하나의 범용 상태 엔진으로 합칠 필요는 없다.

### 값과 정의의 경계

- 이미지 값은 정식 `assetSlots`에서, 텍스트 원본과 포맷은 바인딩에서, 제작 시 숨김은 `hidden`에서 읽는다.
- 역할 메타에는 편집 슬롯의 대상 참조와 구조 규칙을 둔다. 현재 값의 사본은 점진적으로 없앤다.
- 날짜/시간/요일 포맷 노출은 `fieldId`와 formatter 지원 여부를 기준으로 한다.
- 현재의 기본 요소 정의표를 활용하고, 시간표 역할 정의에는 반복·삭제·입력 연결 같은 도메인 정책을 둔다. 기능 정의표가 하나의 거대한 조건문으로 변하지 않게 책임을 나눈다.

## 4. 권장 UI

공통 인스펙터의 순서와 용어를 고정한다.

1. **배치**: 위치·크기·회전·부모 맞춤. 반복 영역은 Grid/간격을 추가한다.
2. **데이터**: 정적 값/사용자 입력/시간표 필드, 해당 필드의 표시 형식.
3. **스타일**: 텍스트 스타일, 이미지 맞춤, 마스크, 투명도 등 기본 요소에 맞는 항목.
4. **표시·상태**: 제작 시 숨김, 사용자 표시 제어, 상태별 디자인과 편집 중 상태를 구분한다.

지원하지 않는 항목은 나타내지 않는다. 다른 객체라도 같은 기능은 같은 섹션에 나타나게 한다.

첨부 화면에는 다음이 특히 효과적이다.

- `Day Card Containers`를 사용자에게 이해하기 쉬운 ‘요일 카드 영역’으로 설명하고 반복 영역 배지를 붙인다.
- 전체 영역에서는 격자·빈 칸·간격을 편집하고, 개별 요일에서는 위치 보정·회전·사용할 카드 디자인을 편집하게 한다. 전체 영역의 7일별 숫자 목록은 고급/일괄 편집으로 이동한다.
- Mon Card에 ‘생성 인스턴스’임을 표시하고, ‘카드 디자인 편집’으로 연결한다. 그 동작은 해당 요일의 Component Set과 상태를 Cards 화면에서 열어야 한다.
- Artist 같은 그룹의 헤더에 ‘편집 중: On’을 표시한다. 자식을 선택했을 때도 상위 상태 컨텍스트를 보여준다. 원시 On/Off 그룹을 모두 일반 Group처럼 이해해야 하는 부담을 줄인다.
- 상태 버튼에 ‘디자인 편집 상태’, Preview 입력에 ‘사용자 선택값’처럼 목적을 명시한다.

## 5. 구현 순서

### 1단계: 저장 형식을 유지하면서 편집 규칙 정리

- 현재 두 모델을 공통 `EditorObjectDescriptor` 같은 읽기 모델로 해석하는 adapter를 둔다.
- 기본 요소·역할·지원 편집 기능·바인딩 정보를 계산하고, 인스펙터와 레이어 표시에 사용한다.
- 선택 대상을 object/day instance/card node로 구분하는 타입을 도입한다. 여러 위치에서 `day-card:` 문자열을 해석하는 책임을 adapter에 모은다.
- 기간 포맷과 상태 컨트롤을 프리셋 이름 분기에서 기능·필드 기준으로 이동한다. 기능의 실제 사용 가능 범위는 기존 정책을 보존하면서 정의표에 명시한다.
- 위 UI 정리를 적용한다.

완료 기준: 프리셋별 디자인과 저장/재로드 결과는 유지되면서, 같은 기능의 편집 위치와 동작이 일관되고 가상 요일 카드의 정체가 명확하다.

### 2단계: 편집 상태·중복 값·마이그레이션 정리

- 편집 중 상태를 view state로 옮긴다. 기존 `activeValue`는 읽기 호환 경로로 흡수한다.
- 정식 값과 metadata 사본의 우선순위를 먼저 명문화한 뒤 중복 기록을 제거한다.
- 로드·가져오기에서 canonical 변환을 마친다. 렌더 단계의 정규화는 구조를 바꾸지 않는 기본값 처리로 축소한다.
- Grid 보정과 Custom 절대 위치를 타입으로 구분하고, 전환 정책을 구현한다.

완료 기준: 편집 대상 상태를 고르는 행위가 템플릿 내용 변경으로 취급되지 않고, 재로드·내보내기·런타임이 같은 원본을 해석한다.

### 3단계: 필요성이 확인되면 저장 모델 통합

- 일반 Text/Image/Group의 공통 명령·렌더링을 먼저 합친다.
- 이후 composition 일반 요소를 공통 그래프로 옮길지 결정한다. 스타일 저장 방식과 레거시 문서 변환 비용을 포함해 판단한다.
- 생성 카드 영역은 시간표 도메인이 소유하는 반복·인스턴스 모델로 유지한다. 7개의 독립 카드 복사본으로 저장하면 Component Set 재사용과 상태별 디자인 계약이 약해진다.
- Shape나 공통 텍스트 효과의 Timetable 지원은 이 단계의 별도 제품 범위로 잡는다.

첫 작업으로 권하는 범위는 **1단계의 선택/기능 해석 adapter와 인스펙터 정리**다. 전체 스키마 교체보다 작은 변경으로 지금의 불균일함을 줄이고, 후속 통합의 기준을 만들 수 있다.

## 6. 검증과 한계

다음 10개 기존 검사를 `node --import tsx scripts/<파일>`로 실행했고 모두 통과했다.

- `check-studio-timetable-selection.ts`
- `check-studio-timetable-inspector.tsx`
- `check-template-studio-object-variants.ts`
- `check-template-studio-object-layout.ts`
- `check-template-studio-timetable-runtime.ts`
- `check-template-studio-component-sets.ts`
- `check-studio-timetable-commands.ts`
- `check-studio-timetable-presets.ts`
- `check-template-studio-timetable-layout.ts`
- `check-studio-day-cards-layout.tsx`

이는 현재 계약에 대한 회귀 검사 결과다. 편집 UX가 일관됨을 증명하거나 모든 저장 문서의 상태를 보장하지는 않는다. production build는 프로젝트 지침에 따라 실행하지 않았다.

구현 시에는 다음 사용자 행동을 회귀 기준으로 삼아야 한다.

1. On 디자인 편집 → Off 디자인 편집 → 사용자 Preview 값 전환: 편집 상태와 실제 결과가 각각 올바르게 해석되는가.
2. 날짜 텍스트의 원본·포맷 수정 → 저장 → 재로드: 표시 형식과 값이 유지되는가.
3. 전체 카드 영역과 개별 요일의 이동·회전, Grid/Custom 전환: 정의한 위치 보존 정책을 따르는가.
4. 요일별 Component Set 지정과 Online/Offline/Multi/Offline Memo 변경: 디자인·공통 프레임·입력 scope가 유지되는가.
5. 레거시 가져오기 → 저장 → 다시 가져오기: 구조가 추가 생성되지 않고, 원본 값·Off 디자인·이미지 연결이 보존되는가.

검토 단계에서는 원격 DB 변경과 애플리케이션 코드 변경을 수행하지 않았다.


## 7. 1단계 구현 결과

저장 스키마와 문서 버전을 유지하면서 다음을 적용했다.

- 선택 해석에 명시적인 대상 타입, 지원 편집 기능, 상위 상태 컨텍스트를 추가했다. 인스펙터에 전달하던 프리셋별 boolean 플래그는 제거했다.
- 인스펙터 순서를 Position/Layout → Data & Format → Typography/Style → Visibility & State → 사용자 미리보기 값/컨텍스트로 정리했다.
- 날짜 포맷은 프리셋 이름 대신 연결된 날짜 필드에 따라 기간 또는 단일 날짜 컨트롤을 제공한다. 기존 Week Dates 기간의 style 저장 방식은 유지하고, 일반 날짜 요소는 기존 binding 포맷 필드를 사용한다.
- 명시적인 `week.start_date`/`week.end_date` 바인딩을 정규화가 기간으로 덮어쓰지 않게 보완했다. 기간 전용 렌더링은 단일 날짜 바인딩에 적용하지 않는다.
- 상태가 있는 그룹의 자식을 선택해도 상위 상태 소유자와 편집 중 디자인을 보여준다. 자식에서 상태를 전환하면 상태 소유자를 선택해 숨겨진 자식에 선택이 남지 않게 한다.
- 레이어 목록에 반복 영역 `REPEAT`, 요일 인스턴스 `INSTANCE`, 상태 그룹의 편집 중 상태 배지를 표시한다.
- 전체 영역의 7일별 변환과 전체 초기화는 기본적으로 접힌 Advanced 영역으로 옮겼다. 개별 요일의 Position/Rotate 편집은 유지한다.
- 개별 요일의 Edit card design은 해당 요일의 Component Set과 실제 렌더 상태를 해석해서 Cards 화면과 해당 루트를 선택한다. 기본 Component Set 및 상태 fallback도 렌더러와 같은 기준을 사용한다.

주요 구현: [선택·기능 해석](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-selection.ts), [인스펙터](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-inspector.tsx), [에디터 연결](/Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/template-studio-client.tsx).

검증 결과:

- 관련 기존/확장 검사 16개 통과: 선택, 인스펙터, 객체 컨트롤, 카드 배치, 레이어 패널·드래그, 컴포넌트, 명령, 프리셋, 이미지 슬롯, 객체 상태·레이아웃, 시간표 런타임·렌더링, Component Set, Auto Text.
- `npx tsc --noEmit --pretty false --incremental false` 통과.
- 변경한 코드·검사 파일의 `npx eslint` 통과. 저장소의 기존 `.eslintignore` 형식 경고는 남아 있다.
- 브라우저에서 실제 컴포넌트를 사용하는 임시 fixture로 Advanced 펼침, 요일 디자인 연결 대상, 자식 선택 시 상태 컨텍스트, Off 전환 후 소유자 선택, 날짜 포맷과 템플릿 동기화를 확인했다.
- 실제 관리자 페이지는 검증 브라우저에 로그인 세션이 없어 직접 조작하지 못했다. fixture는 샘플 문서만 사용하며 기존 저장 템플릿을 수정하지 않는다. Cards 전환의 앱 전체 동작은 아직 인증된 관리자 브라우저에서 검증하지 않았다.
- production build와 원격 DB 작업은 수행하지 않았다.

1단계 시점에는 편집 상태 저장 위치와 중복 값, 마이그레이션 경계를 유지했다. 이후 변경은 8절에 기록한다.

[브라우저 컴포넌트 검증 화면](/private/tmp/temis-timetable-stage1-qa/day-instance.png)


## 8. 2단계 구현 결과

편집기 뷰, 문서의 실제 렌더 값, 읽기와 변환 경계를 분리했다. 기존 문서 버전과 호환되는 선택적 필드를 정리하는 방식이며 원격 데이터 변경은 하지 않았다.

- **편집 상태:** `timetableEditingVariants`를 에디터의 Zustand view에 둔다. On/Off 디자인 선택은 문서·Undo 스냅샷·런타임 사용자 값에 들어가지 않는다. 레이어, 객체 선택 컨텍스트, 캔버스, 객체 선택기가 같은 뷰 값을 읽는다. 새 문서를 열면 초기화하고 삭제된 객체의 선택값은 정리한다. `mode: always`는 On 디자인을 보여주며 사용자 표시 정책은 여전히 문서에 저장한다. 다시 열면 기본 디자인 상태에서 시작한다.
- **실제 값의 저장 위치:** 이미지 연결과 fit은 `assetSlots`, 표시 여부는 `hidden`, 마스크 반지름은 `style.borderRadius`가 소유한다. `meta.exception.editableSlots`에 복제하던 이미지·표시·마스크 스냅샷은 생성·수정·마이그레이션·JSON 내보내기에서 제거한다. 입력 텍스트 설명과 알 수 없는 확장 메타데이터는 보존한다.
- **레거시 배경:** `backgroundAssetId/backgroundFit`은 `assetSlots.background`로 옮긴다. 유효한 기존 슬롯 값을 우선하고, 비어 있던 슬롯은 레거시 이미지로 복구한다. 입력 이미지와 템플릿 배경 fallback이 동시에 있던 문서는 두 값이 서로 다른 소스이므로 fallback 이미지를 남긴다. 이 예외는 기존 렌더 동작 보존을 위한 호환 처리다.
- **변환 경계:** `normalizeStudioTimetableComposition`을 명시적인 변환 함수로 노출하고, 기존 문서 로드/가져오기 및 서버 저장 마이그레이션에서 호출한다. `getStudioTimetableComposition`은 저장된 composition을 그대로 읽고 없는 문서는 기본 구성을 제공한다. 객체를 편집할 때마다 전체 구조를 재변환하지 않는다. JSON 내보내기는 사본에서 저장값만 정리한다.
- **배치 좌표:** `getStudioTimetablePlacementMode`와 `applyStudioTimetableGridPreset`으로 절대 좌표와 Grid 보정값을 구분한다. Grid→Custom은 실제 카드 위치를 절대 좌표로 옮기고, Custom→Grid는 새 격자의 기준 위치를 빼서 보정값으로 바꾼다. 두 전환 모두 위치·회전·요일별 카드 크기를 유지한다. Grid 프리셋끼리는 기존처럼 재배치하며, 위치를 새 격자에 맞추려면 Advanced의 Reset을 사용한다.

주요 구현: [상태 해석](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-selection.ts), [저장값 정리](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/semantic-slots.ts), [로드·가져오기 변환](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/migrations.ts), [배치 모드 전환](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-placement.ts).

검증 결과:

- 관련 검사 21개 통과. 1단계의 16개 검사와 Crop/Resize, Entry Group 렌더러, persistence pipeline, editor store, 새 저장·배치 회귀 검사를 포함한다.
- 새 검사 `npm run check:studio:timetable-storage`: 마이그레이션 전체 결과의 반복 안정성, 원본 불변성, 중복 저장 제거, 확장 메타데이터와 레거시 fallback 보존, JSON 내보내기→가져오기, 뷰 선택과 Undo 스냅샷 분리, 실제 authoring/runtime 렌더 분리, 크기가 다른 카드의 Grid↔Custom 위치·회전 보존.
- `npx tsc --noEmit --pretty false --incremental false`, 변경한 코드·검사 파일의 ESLint, `git diff --check` 통과.
- 실제 컴포넌트의 브라우저 fixture에서 자식 선택→Off 전환 후 저장 문서가 unchanged임을 확인했다. Grid→Custom→3×3 후 Monday `(434, 760)`, Tuesday `(1246, 760)` 좌표가 유지되고, 인스펙터 좌표가 절대값→보정값으로 전환됨을 확인했다.
- 로그인된 관리자 페이지의 전체 저장·재로드 흐름은 미검증이다. 로컬 DB persistence 통합 검사도 `SUPABASE_URL` 미설정으로 실행하지 못했다. 구조와 JSON 왕복은 독립 회귀 검사로 검증했다.
- production build, 원격 DB 쓰기, 커밋·푸시는 수행하지 않았다. 임시 브라우저와 QA 서버는 정리했다.

[상태 분리 브라우저 검증](/private/tmp/temis-timetable-stage1-qa/stage2-state.png), [배치 좌표 브라우저 검증](/private/tmp/temis-timetable-stage1-qa/stage2-placement.png).

2단계 시점에는 Cards/Timetable의 공통 편집·렌더 명령과 Week Dates 포맷 정리를 남겼다. 3a단계 결과는 9절에 기록한다.


## 9. 3a단계 구현 결과

두 저장 트리를 유지하면서 공통 편집·렌더 동작을 공유하도록 정리했다. 그래프의 `styleId`와 composition의 inline `style`, 카드 프레임 동기화, 반복 배치와 상태 해석은 각 도메인에서 담당한다.

- **공통 스타일 연산:** 이동·부모 채우기·스타일 값 변경·텍스트 정렬·표시 여부 쓰기를 `object-style.ts`로 모았다. 기존 그래프 명령과 시간표 명령은 저장 위치와 잠금/프레임 정책을 처리하는 어댑터로 남긴다.
- **공통 렌더 해석:** 두 렌더러가 CSS 변환, 이미지 슬롯 소스와 fit 해석을 공유한다. 기존 시간표의 백분율 opacity와 회전 transform 정책은 명시적인 호환 옵션으로 보존한다. 배경 슬롯 이름과 사용자 이미지 fallback 정책은 기존 도메인 규칙을 유지한다.
- **공통 컨트롤:** Cards와 Timetable은 같은 날짜·시간 형식 및 타이포그래피 컨트롤을 사용한다. Thumbnail의 날짜 컨트롤도 시간표 모듈 대신 공통 인스펙터 모듈을 가져온다. Auto Text의 기존 기본 줄 높이는 각 편집기에서 유지한다.
- **날짜 포맷 저장:** Week Dates의 `style.dateRangeFormat/dateRangeTemplate`을 `binding`으로 이동한다. 읽기 어댑터는 기존 스타일 쌍의 우선순위를 보존하며, 로드/내보내기/형식 편집 시 정리한다. 명시적으로 연결한 단일 날짜 필드는 기간으로 바꾸지 않는다.
- **형식 수정 계약:** 연결된 built-in field의 지원 기능에 따라 날짜·시간·요일 형식을 수정한다. 요일 표시를 Default로 초기화할 때 다른 binding 설정을 삭제하던 Cards 동작을 보완했다. 단일 날짜 형식의 기본 선택값도 실제 resolver 기본값과 맞췄다.

주요 구현: [공통 스타일](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/object-style.ts), [형식 수정](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/binding-format.ts), [레거시 날짜 어댑터](/Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-bindings.ts), [공통 날짜·시간 UI](/Users/kwakori/projects/promotion/temis/src/components/studio/inspector/studio-binding-format-controls.tsx), [공통 타이포그래피 UI](/Users/kwakori/projects/promotion/temis/src/components/studio/inspector/studio-text-typography-controls.tsx).

검증 결과:

- 관련 회귀 검사 22개 통과. Cards/Timetable 명령·인스펙터, 레거시 저장, 날짜·시간 런타임, 객체 상태·레이아웃, 실제 렌더러, persistence pipeline, Thumbnail 날짜·이미지·편집기 검사를 포함한다.
- 새 `npm run check:studio:object-core`: 기존 스타일 포맷과 stale binding의 우선순위, 실제 날짜 객체의 마이그레이션/JSON 왕복 출력 보존, 원본 불변성과 반복 안정성, 단일 날짜 바인딩 보존, 날짜·시간·요일 형식 수정, 두 저장 어댑터의 이동/부모 채우기 결과, 두 실제 렌더러의 이미지 배경 fit·좌표·회전.
- 브라우저의 실제 컴포넌트 fixture에서 short→long→custom 형식 수정, 레거시 스타일 필드 제거, binding 저장, 캔버스 `28 to 04` 표시, 크기 120 및 가운데 정렬을 확인했다.
- `npx tsc --noEmit`, 변경 파일의 ESLint(`--max-warnings 0`), `git diff --check` 통과. 저장소의 기존 `.eslintignore` 형식 경고는 남아 있다.
- 로그인된 관리자 페이지에서 실제 저장 템플릿의 저장·재로드는 여전히 미검증이다. production build와 원격 DB 쓰기는 수행하지 않았다. 임시 QA 서버와 브라우저 탭은 정리했다.

[공통 컨트롤 브라우저 검증](/private/tmp/temis-timetable-stage1-qa/stage3-shared-controls.png).

다음 3b단계는 `graph.nodes`와 `composition.objects`의 저장 모델 통합 설계다. 필드 이름을 단순히 합치기보다 공통 객체 코어와 시간표의 반복·상태·역할 확장을 분리하고, 실제 기존 템플릿의 왕복 검증을 확보한 후 마이그레이션 범위를 정하는 것이 좋다.


## 10. 3b단계 저장 모델 통합 설계

이 절은 최초 설계 기록이다. 레거시와 실제 기존 템플릿 보존에 관한 조건은 이후 사용자 확인에 따라 11절로 대체한다.

[별도 설계 문서](./timetable-object-storage-unification-design-2026-10-04.md)에 목표 저장 계약, 매핑, 참조 불변식, 구현 단위와 버전 출시 조건을 정리했다. 이번 단계는 설계이며 런타임 코드·문서 버전·DB를 변경하지 않았다.

- 기존 `graph.nodes + styles`를 공통 저장소로 확장한다. 별도의 새 objects/inline-style 저장소로 전체 시스템을 교체하지 않는다.
- 시간표는 주간 roots와 역할·생성기 인덱스, 일정·요일·Component Set·배치를 소유한다. 객체 스타일과 binding, hidden 값은 공통 노드에 한 번만 저장한다.
- 전체 저장 루트와 화면 렌더 루트를 구분한다. 카드 상태 디자인, 전체 시간표, Thumbnail은 명시적인 화면 문맥으로 canvas와 입력 scope를 해석한다.
- On/Off 객체 variant는 공통 코어로 옮기되 일정의 Online/Offline 상태는 시간표에 남긴다. 요일 카드는 가상 인스턴스를 유지한다.
- 이미지 전경/배경/inline 장식을 명시적으로 매핑하고 입력 배경 fallback을 보존한다. 기존 시간표의 렌더 기본값을 Cards 기본값으로 자동 대체하지 않는다.
- 구현은 A(격리된 순수 변환기·fixture) → B(읽기·렌더 어댑터) → C(쓰기 명령) → D(v8 읽기 지원 선행 후 저장 활성화) → E(호환 경로 정리) 순서다. 다음 구현 범위는 A다.
- 실제 대표 저장 템플릿의 왕복·화면 검증을 v8 writer 활성화 조건으로 둔다. 합성 sample만으로 저장 구조를 전환하지 않는다. 원격 일괄 변환은 별도 작업이다.

코드에서 확인한 샘플은 graph 16개/스타일 16개/루트 2개, composition 1개/루트 1개다. 실제 저장 템플릿의 분포를 대표하는 수치가 아니다. 설계 검증과 기존 회귀 검사 결과는 별도 문서에 기록한다.


## 11. 레거시 제외 조건과 신규 모델 A단계

사용자는 현재 DB의 Studio 템플릿 두 개가 모두 테스트 데이터이고 레거시 호환성을 고려하지 않아도 된다고 확인했다. 이 조건을 [통합 설계 문서](./timetable-object-storage-unification-design-2026-10-04.md)에 반영했다. 기존 데이터 변환기와 원격 템플릿 왕복 조건을 제외하고 새 모델 생성·검증으로 진행한다. 데이터 삭제나 원격 쓰기 권한으로 해석하지 않는다.

신규 v8 문서는 composition 없이 graph.nodes/styles와 timetable root/역할 인덱스로 생성한다. 6종 프리셋, 상태 참조, 이미지 입력, JSON 읽기·무결성 검증과 실제 미리보기 컴포넌트를 구현했다. 생성 레시피와 조회용 projection만 기존 컴포넌트를 재사용하며 저장값을 중복 작성하지 않는다.

새 검사 포함 4개 검사, 타입·신규 파일 ESLint·diff 검사 및 브라우저 fixture 검증을 통과했다. 현재 관리자와 서버의 기본 저장 경로는 아직 v7이며 다음 작업은 관리자 에디터의 선택·쓰기 연결이다. 원격 DB의 두 테스트 데이터는 조회하거나 수정하지 않았다.


## 12. 기존 UI를 유지한 v8 에디터 연결

사용자가 기존 UI를 유지하며 다음 단계를 진행하도록 요청했다. `TemplateStudioClient`의 초기 문서·store/history·편집 commit·JSON·서버 준비 경계를 v8에 연결했다. composition은 기존 패널과 렌더러를 위한 임시 조회 뷰로 계산하며 store나 payload에는 저장하지 않는다. 위치·스타일·binding·상태 참조와 프리셋 역할은 graph/styles/extension에 반영한다.

실제 관리자 에디터 전체 컴포넌트에서 프리셋 추가, 날짜·타이포그래피, 3×3 배치, Artist On/Off, Undo/Redo 및 선택 복원, v8 JSON 내보내기를 검증했다. A단계의 테스트 전용 화면으로 UI를 교체한 것이 아니다. 새 빈 템플릿의 기본 디자인으로 검증했으며 사용자 스크린샷의 기존 테스트 템플릿 디자인을 재사용하지 않았다.

실제 명령 훅·runtime shell·서버 mock 경계 검사와 관련 검사 총 17개, 타입·변경 파일 ESLint·diff 검사를 통과했다. 인증된 관리자에서 DB 저장·재로드는 확인하지 않았으며 원격 DB에 접근하거나 데이터를 바꾸지 않았다. 자세한 구현과 남은 직접 graph 명령/렌더 정리는 [통합 설계 문서 11절](./timetable-object-storage-unification-design-2026-10-04.md)에 기록했다.


## 13. C단계 — 임시 쓰기 어댑터 제거

실제 에디터의 편집 초안을 v8 저장 그래프로 바꾸고, 문서 전체를 구형 composition으로 변환했다가 되돌리는 함수를 제거했다. 객체/스타일/도메인 확장을 직접 수정하도록 인스펙터와 명령 훅을 연결했으며, 프리셋 생성·이미지/입력 연결·위치/회전·삭제·상태 전체 복제·Figma 프레임 적용도 직접 그래프 경로를 사용한다.

실제 컴포넌트의 로컬 UI에서 드래그/undo, 날짜 포맷·글꼴·위치, 복제/삭제/undo/redo, Off 상태 유지, 3×3 배치와 JSON v8 출력까지 확인했다. 관련 검사 17개, TypeScript, 변경 파일 ESLint, diff 검사를 통과했다. 기존 화면 표시용 계산 뷰는 남아 있으며 다음 단계에서 조회·렌더 경로를 정리한다. 상세 경계와 검증 제한은 [저장 모델 통합 설계 12절](timetable-object-storage-unification-design-2026-10-04.md#12-c단계--편집-명령을-공통-그래프에-직접-연결)에 기록했다.


## 14. D단계 — 조회·선택·렌더 어댑터 제거

시간표를 v7/composition 문서로 바꾸던 읽기 뷰까지 제거했다. 실제 에디터의 레이어·선택·속성 패널과 사용자 미리보기·검증이 저장된 graph/styles/nodeExtensions를 직접 읽는다. 상태 소유자·이미지 역할·형식은 별도 도메인/바인딩 정보로 해석하고, 위치·서체·투명도는 참조 스타일에서 읽는다. Cards 화면은 모든 상태 분기를 포함한 시간표 노드 집합을 제외한다.

기존 에디터 컴포넌트의 로컬 UI에서 날짜 수정·복제·삭제·Undo/Redo, Artist Off, Cards/Timetable 전환, 3×3 빈 셀·간격과 실제 JSON 내보내기를 확인했다. 검증 화면은 기본 테스트 데이터를 넣은 실제 컴포넌트이며 사용자 첨부 템플릿의 디자인은 재사용하지 않았다. 관련 검사 23개, TypeScript, 변경 src 및 신규 검사/fixture의 ESLint와 diff 검사를 통과했다. 인증된 관리자 DB 저장·재로드는 여전히 미검증이고 원격 DB는 변경하지 않았다.

남은 생성 레시피 정리는 프리셋을 직접 graph/style/extension으로 만들고 사용하지 않는 제작 helper를 제거하는 것이다. 상세 경계와 검증 결과는 [통합 설계 문서 13절](./timetable-object-storage-unification-design-2026-10-04.md#13-d단계--조회와-렌더를-저장-그래프에-직접-연결)에 기록했다.


## 15. 프리셋 생성 정리 — 두 단계 완료

6종 시간표 프리셋을 처음부터 v8 graph/styles/nodeExtensions로 생성하도록 바꿨다. 변경 전에 저장한 기본 결과와 비교해 배치·스타일·계층·입력·On/Off 기본값을 유지했으며, singleton 재선택·끊어진 입력 복구·반복 날짜 라벨도 그대로 동작한다.

앱의 구형 composition 제작 모듈과 프리셋 삽입/재연결 helper, 신규 프리셋을 materialize하던 변환, Figma의 구형 시간표 분기와 시간표 migration을 제거했다. registry/패널은 그래프 프리셋 이름을 사용한다. 기존 공통 렌더 테스트의 synthetic object 생성기는 테스트 폴더로 격리했고 저장 문서의 레거시 구조 변환 코드는 삭제했다. Thumbnail의 기존 migration은 유지한다.

관련 check 36개, 타입 검사, 변경 영역 린트와 diff 검사를 통과했다. 실제 에디터 컴포넌트에서 6종 추가·재선택·Off·날짜 반복 추가를 확인했고 JSON 내보내기는 `v8 / composition NO / nodes 43 / inline style NO`였다. 검증 화면은 기존 에디터 컴포넌트에 기본 테스트 데이터를 사용한 것이며 첨부 템플릿 디자인은 아니다. 원격 DB는 변경하지 않았다. DB 연동 runtime 검사는 환경 미설정으로 실행하지 못했으며 서버 저장·발행은 mock으로 확인했다.

상세 구현·검증 경계는 [저장 모델 설계 14절](./timetable-object-storage-unification-design-2026-10-04.md)에 기록했다. 승인한 생성 정리 범위는 완료했고, 다중 선택·클립보드·자유 그룹/새 객체 기능은 별도다.
