# Template Studio Preview — Localization, Week Navigation, and Global Cards

## 1. 목적

Template Studio Preview V2를 다음 요구사항에 맞게 확장한다.

1. 한국어, 영어, 일본어 플랫폼 UI 지원 기반을 마련한다.
2. 기존 TimeTable처럼 화살표로 이전/다음 주를 이동할 수 있게 한다.
3. 하나의 큰 Global 섹션에 모여 있는 입력을 기존 TimeTable 스타일의 의미 단위 카드로 재구성한다.

이번 작업은 기존 TimeTable 컴포넌트를 다시 import하지 않는다. V2 runtime primitive와
controlled composition component를 유지하면서 동작과 스타일만 재현한다.

## 2. 범위 결정

### 2.1 이번 구현 범위

- Template Studio Preview V2의 플랫폼 UI 문자열
- Preview 헤더의 언어 선택
- 선택 언어의 브라우저 저장과 복원
- 주간 이전/다음 이동 UI와 runtime 날짜 계산
- runtime 날짜가 Canvas built-in field에 반영되는 경로
- Global input의 자동 그룹 분석 및 카드 렌더링
- 동적 input 추가/삭제/scope 변경 회귀 검증

### 2.2 후속 범위

- 기존 관리자/주문/팀 페이지 전체 번역
- URL locale segment(`/ko`, `/en`, `/ja`)
- 서버 계정별 locale 저장
- 템플릿 저작 콘텐츠 자체의 다국어 번역
- week 이동 결과의 draft 저장 또는 publish 반영

플랫폼 UI locale과 템플릿 콘텐츠 locale은 다른 개념이다. 플랫폼 언어를 한국어로
변경해도 영문 템플릿의 저작 텍스트가 자동 번역되면 안 된다.

## 3. 전체 구조

```text
TemplateStudioRuntimeShell
├── locale state (ko | en | ja)
├── locale persistence
├── runtimeValues
│   └── timetable.weekStartDate
├── Preview Canvas
│   └── builtin resolver reads runtime weekStartDate
└── TemplateStudioRuntimeForm
    ├── localized platform copy
    ├── StudioRuntimeWeekSelector
    ├── StudioRuntimeGlobalInputCard[]
    └── StudioRuntimeDayCard[]
```

세부 구현 문서:

1. [07-runtime-localization.md](./template-studio-preview-v2-ui/07-runtime-localization.md)
2. [08-runtime-week-navigation.md](./template-studio-preview-v2-ui/08-runtime-week-navigation.md)
3. [09-runtime-global-input-cards.md](./template-studio-preview-v2-ui/09-runtime-global-input-cards.md)
4. [10-localization-week-global-verification.md](./template-studio-preview-v2-ui/10-localization-week-global-verification.md)

## 4. 다국어 설계

### 4.1 locale ID

새 runtime UI는 BCP 47에 가까운 짧은 ID를 사용한다.

- `ko`: 한국어
- `en`: English
- `ja`: 日本語

기존 V2 render config의 `kr/en/jp`는 템플릿 렌더 설정이므로 그대로 유지하고, 필요한
경계에서만 adapter를 사용한다. 플랫폼 UI 타입이 legacy 타입에 종속되지 않게 한다.

### 4.2 번역 대상

다음은 플랫폼 copy이므로 번역한다.

- Timetable, Reset, Basic
- Global settings, Weekly timetable
- Week, previous week, next week
- Time, Main Title, Sub Title, Offline Memo
- Add entry, Remove entry
- Online, Offline, Memo, Multi
- Upload, empty-state, disabled reason
- Zoom/Fit accessible label과 title

다음은 document가 소유하므로 자동 번역하지 않는다.

- `StudioInputDefinition.label`
- select option label
- template metadata name
- static text binding
- artist name, memo, entry title

### 4.3 저장

초기 구현은 URL, `localStorage`, same-site cookie를 함께 사용한다.

```text
query: ?lang=ko|en|ja
storage key: temis.platform.locale
cookie key: temis_platform_locale
```

우선순위:

1. URL query의 지원 locale
2. localStorage의 지원 locale
3. same-site cookie의 지원 locale
4. `navigator.languages`/`navigator.language`
5. `en`

SSR hydration mismatch를 피하기 위해 최초 render는 안정적인 기본값을 사용하고 mount 후
브라우저 preference를 적용한다.

## 5. 주간 이동 설계

### 5.1 상태 위치

주간 이동은 Preview 입력 상태이므로 document가 아닌 `StudioRuntimeValues`에 둔다.

```ts
interface StudioTimetableRuntimeValues {
  weekStartDate?: string;
  entriesByDay: ...;
  offlineMemoByDay?: ...;
}
```

기존 runtime JSON에는 필드가 없어도 유효하도록 optional로 추가한다.

### 5.2 이동 규칙

- 이전 화살표: `weekStartDate - 7 days`
- 다음 화살표: `weekStartDate + 7 days`
- end date: `start + max(0, dayIds.length - 1)`
- 모든 계산은 UTC date parts로 수행하여 timezone 날짜 밀림을 방지한다.
- Reset은 initial runtime의 weekStartDate로 복원한다.

### 5.3 Canvas 반영

다음 built-in field가 runtime week를 우선 사용해야 한다.

- `day.date`
- `week.start_date`
- `week.end_date`
- `week.date_range`

runtime override가 없을 때만 기존 document week/day date를 fallback으로 사용한다.

## 6. Global input 카드 설계

### 6.1 문제

현재 `renderInputGroup("Global", inputs)`가 모든 global input을 하나의 카드에 넣는다.
그래서 Profile Image, Artist, Weekly Memo, Top Object가 하나의 큰 섹션처럼 보인다.

### 6.2 목표

```text
Global settings
├── Week selector card
├── Profile Block Image card
│   └── Upload
├── Artist card
│   ├── on/off toggle
│   └── Artist / Profile Text
├── Weekly Memo card
│   ├── on/off toggle
│   └── memo textarea
└── Top Object card
    └── on/off toggle
```

### 6.3 하드코딩 방지

입력 ID를 코드에 직접 적지 않는다. group은 다음 우선순위로 결정한다.

1. composition object의 `variantSet.inputId`
2. 해당 variant root descendant가 참조하는 text/image/select input
3. 안전한 fallback: `X Status` select와 label이 정확히 `X`인 input
4. 관계가 없으면 input 하나당 독립 카드

이 규칙이면 현재 Artist Status와 Artist/Profile Text는 composition topology로 묶이고,
Profile Image와 Top Object는 독립 카드가 된다. 새 사용자 input도 최소한 독립 카드로 자동
표시된다. 기존 TimeTable의 순서를 따라 image content가 포함된 카드를 먼저 배치하고, 그
외에는 document input 순서를 유지한다.

### 6.4 control 표현

- options가 `on/off`인 select는 toggle로 표시한다.
- image input은 카드 제목에 label을 표시하고 raw URL input 대신 Upload action을 기본으로
  표시한다.
- text/select input은 기존 generic input renderer를 재사용한다.
- toggle이 off인 group의 content는 숨기되 값은 보존한다.

## 7. 데이터 호환성

- document schema version은 변경하지 않는다.
- DB migration은 필요 없다.
- runtime value의 optional field만 확장한다.
- 저장된 기존 runtime value는 migration 없이 읽힌다.
- global input grouping은 render-time derived view model이다.

## 8. 구현 순서

1. runtime locale dictionary와 formatter
2. Shell locale state/selector/persistence
3. runtime week date utility와 value field
4. builtin field resolver runtime override
5. controlled Week Selector component
6. global input group analyzer
7. controlled Global Input Card component
8. Runtime Form 통합
9. 정적/interaction/visual 회귀 검증

## 9. 완료 조건

- 세 언어에서 Preview 플랫폼 UI가 즉시 변경된다.
- reload 후 선택 언어가 유지된다.
- 이전/다음 주 이동 시 selector와 Canvas 날짜가 동시에 7일 이동한다.
- Reset 시 최초 주로 돌아간다.
- Global input이 하나의 큰 카드가 아닌 의미 단위 카드로 표시된다.
- editor에서 추가한 global/day/entry input의 자동 반영이 유지된다.
- 단일/멀티/오프라인 메모 동작이 회귀하지 않는다.
- 패널에 가로 overflow가 없다.

## 10. 리스크

- authored input label은 번역 데이터가 아니므로 선택 언어와 혼합될 수 있다.
- label 기반 fallback grouping은 정확히 일치하는 `X`/`X Status`에만 제한한다.
- Preview의 week 이동을 저장 기능으로 오해할 수 있으므로 runtime-only임을 UI/문서에서
  명확히 한다.
- Canvas의 custom static date text는 built-in binding이 아니므로 이동하지 않는다.
