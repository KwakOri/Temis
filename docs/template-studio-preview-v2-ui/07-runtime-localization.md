# Phase 07 — Runtime Localization Foundation

## 목표

Template Studio Preview V2의 플랫폼 UI를 한국어, 영어, 일본어로 전환할 수 있는 작은
locale layer를 만든다.

## 타입

```ts
type StudioRuntimeLocale = "ko" | "en" | "ja";
```

번역 dictionary와 locale 판단 함수는 React에서 분리된 순수 utility로 둔다.

예정 파일:

```text
src/utils/template-studio/runtime-i18n.ts
```

포함 기능:

- supported locale guard
- browser language normalization
- `Intl.DateTimeFormat` locale mapping
- UI copy dictionary
- week/date label formatter

## UI 상태

`TemplateStudioRuntimeShell`이 locale state를 소유한다.

```text
Shell locale
├── header language selector
├── updatedAt formatter
├── zoom accessible copy
└── RuntimeForm locale prop
```

Form 내부에서 별도의 locale state를 만들지 않는다.

## persistence

mount 후 저장 locale 또는 browser locale을 읽고, 사용자 변경 시 localStorage에 저장한다.
storage 접근 실패는 UI를 중단시키지 않는다.

## 번역 계약

UI dictionary key는 semantic key를 사용한다.

```ts
copy.form.title
copy.form.reset
copy.week.previous
copy.entry.add
copy.status.online
```

한국어 문장을 영어 key로 직접 lookup하지 않는다.

## 제외

- user-authored input label 자동 번역
- template canvas static text 자동 번역
- route locale middleware
- 외부 i18n dependency 추가

현재 범위에는 작은 typed dictionary가 충분하므로 새 package를 추가하지 않는다.

## 검증

- 모든 locale dictionary key 존재
- unsupported locale fallback은 `en`
- `ko-KR`, `en-US`, `ja-JP` 날짜 출력
- Shell/Form static markup에서 선택 locale copy 확인
