# Phase 09 — Runtime Global Input Cards

## 목표

모든 global input을 한 카드에 넣는 현재 구조를 제거하고 기존 TimeTable과 같은 독립 설정
카드 구조로 변경한다.

## view model

예정 파일:

```text
src/utils/template-studio/runtime-global-input-groups.ts
```

```ts
interface StudioRuntimeGlobalInputGroup {
  id: string;
  label: string;
  toggleInput?: StudioSelectInputDefinition;
  contentInputs: StudioInputDefinition[];
  firstInputIndex: number;
}
```

## 관계 분석

### composition 관계

variant set의 input을 toggle 후보로 보고, 각 variant root의 descendant를 순회한다.

수집 대상:

- `binding.inputId`
- `assetSlots[*].inputId`
- nested variant set input

동일 input은 group에 한 번만 포함한다. 순환 child reference가 있어도 무한 순회하지 않도록
visited set을 사용한다.

### 안전한 label fallback

topology 관계가 없는 경우에만 다음 exact 규칙을 허용한다.

```text
"Weekly Memo Status" → base "Weekly Memo"
"Weekly Memo" input과 exact case-insensitive match → pair
```

부분 문자열/유사도 기반 pairing은 하지 않는다.

### standalone fallback

관계를 찾지 못한 input은 독립 group이 된다. 따라서 에디터에서 새 global input을 추가해도
UI code 변경 없이 표시된다.

## boolean-like select

다음 조건을 모두 만족하면 toggle로 표현한다.

- type이 `select`
- normalized option value set이 `on/off`

toggle 변경은 기존 `setStudioRuntimeInputValue`를 사용한다.

## 이미지 카드

- 카드 header에 input label
- 우측 또는 본문에 Upload action
- raw URL text field는 기본 화면에서 숨김
- 현재 data URL/file reader update path 유지

## content visibility

group toggle이 off이면 content control만 숨긴다. runtime value는 삭제하지 않는다. 다시 on으로
변경하면 이전 값이 복원된다.

## dynamic input 계약

- global input: group 분석 후 한 카드에 1회
- day input: 모든 Day Card에 1회
- entry input: 모든 Entry Card에 1회
- 입력 삭제: group에서도 제거
- scope 변경: 새 scope 위치로 이동

## 검증

- current sample Artist status/text topology grouping
- Profile Image standalone image card
- Top Object standalone toggle card
- Weekly Memo exact fallback grouping
- unknown input standalone group
- internal input ID 미노출
