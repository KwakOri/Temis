# Phase 03 — Runtime Form Integration

## 1. Objective

기존 `TemplateStudioRuntimeForm`의 데이터 흐름과 상태 계산을 유지하면서 Phase 02의 V2
primitive로 UI를 재구성한다.

이 단계의 핵심은 스타일 교체가 아니라 orchestration과 presentation의 경계를 명확히
만드는 것이다.

## 2. Target file

Primary file:

```text
src/app/(root)/template-studio/_components/runtime/
  template-studio-runtime-form.tsx
```

Consumed UI:

```text
src/app/(root)/template-studio/_components/runtime/ui/*
```

## 3. Logic that remains in the Form

다음 로직은 primitive로 이동하지 않는다.

- timetable/day/entry 목록 계산
- selected day와 selected entry state
- active scope tab state
- active base status 계산
- offline memo capability 계산
- add-entry disabled reason 계산
- runtime input grouping
- runtime input value read/write
- entry 추가/삭제
- online/offline 전환
- offline memo status 전환
- entry field mutation
- image FileReader 처리
- reset callback 호출

## 4. Local presentation helpers to remove

기존 Form 내부의 다음 표현 컴포넌트는 V2 primitive로 교체한다.

- `RuntimeTextField`
- `RuntimeTextareaField`
- 반복되는 raw `<select>` style
- 반복되는 segmented button class
- 반복되는 empty-state class
- 반복되는 icon action button class
- inline Offline Memo switch markup

제거 후에도 business-specific mapping 함수는 Form에 남을 수 있다.

## 5. Composition map

### 5.1 Panel header

Current:

- Inputs title
- day count
- Reset button

Target:

- title/metadata remain simple semantic text
- Reset uses `StudioRuntimeActionButton` secondary/compact
- header surface comes from V2 runtime tokens

### 5.2 Scope tabs

Use `StudioRuntimeSegmentedControl<"global" | "days">`.

- Days option disabled when no days exist.
- Existing fallback to Global remains in the Form effect.
- `onValueChange` only sets `activeScopeTab`.

### 5.3 Day selector

The day selector is domain-aware composition, not a generic primitive.

It remains in the Form or a small sibling component receiving:

```ts
interface StudioRuntimeDaySelectorProps {
  days: Array<{ id: string; label: string }>;
  value: string;
  onValueChange: (dayId: string) => void;
}
```

It must not receive the full document or runtime values.

Seven-day layout remains responsive inside the 420px panel.

### 5.4 Status

Use `StudioRuntimeSegmentedControl<"online" | "offline">`.

- `activeDayBaseStatus` is the controlled value.
- Existing `updateDayBaseStatus` remains the callback.
- Disable both options when no active entry exists.
- Multi remains derived from online + two entries.
- Multi badge uses V2 soft-primary styling.

### 5.5 Offline Memo

Use `StudioRuntimeToggle`.

```tsx
checked={isOfflineMemoEnabled}
disabled={!canUseOfflineMemo || !activeEntry}
onCheckedChange={() => toggleOfflineMemo()}
```

The toggle callback does not decide the target runtime status. The Form retains that behavior.

### 5.6 Entry controls

- Add uses `StudioRuntimeActionButton` icon variant.
- Entry number selector appears only when exactly two entries exist.
- Entry number selector uses `StudioRuntimeSegmentedControl` with two compact items.
- Remove uses danger/icon variant and stays inside the Entry section.
- Remove remains visible only when exactly two entries exist.
- No entry ID such as `fri-entry-1` is rendered.

### 5.7 Built-in entry fields

Use `StudioRuntimeField` for:

- Main Title
- Sub Title
- Time
- Offline Memo textarea

Preserve current placeholder and value behavior.

### 5.8 Dynamic inputs

Map input types as follows.

| Studio input type | V2 component |
| --- | --- |
| text | Field input |
| multiline text | Field textarea |
| select | Field select |
| image URL | Field input + Upload ActionButton |

All `setStudioRuntimeInputValue` calls remain in the Form.

## 6. Section hierarchy

Recommended hierarchy:

```text
Runtime Form
├── Header
├── Scope Segmented Control
└── Scroll Area
    ├── Day Selector
    ├── Status Card
    ├── Entries Card
    ├── Global/Day Input Section
    └── Entry Input Section
```

Avoid wrapping every field in a card. Cards express major information hierarchy; fields use spacing
inside a section.

## 7. Styling constraints

- No `blue-*` selected/focus classes remain in the Form.
- No `slate-*` panel/input classes remain except where an explicitly dark canvas-related element is
  rendered; Form should have none.
- Use V2 runtime tokens only.
- Danger remove control retains semantic danger style.
- Maintain current 420px desktop panel width.
- Maintain mobile bottom panel height and scroll behavior.

## 8. Accessibility constraints

- Inputs have explicit labels.
- Scope and status controls have group labels.
- Day buttons have accessible names including the full day label where possible.
- Add button title explains disabled reason.
- Remove button has `aria-label="Remove entry"` or localized equivalent.
- Memo switch keeps `role="switch"` and `aria-checked`.
- Selected state is represented by both fill/border and aria state.

## 9. Refactoring limits

Allowed:

- extracting presentation-only components
- replacing local JSX helpers with primitives
- naming local render functions more clearly
- small memoization needed by new Props

Not allowed:

- changing timetable runtime utilities
- changing entry count rules
- changing input storage shape
- changing status IDs
- changing capability behavior
- changing reset semantics
- introducing a new form state library

## 10. Implementation sequence

1. Replace panel root/header surfaces.
2. Replace Reset action.
3. Replace Global/Days control.
4. Replace weekday selector styles/component.
5. Replace Online/Offline and Multi badge.
6. Replace Offline Memo toggle.
7. Replace Entries add/select/remove controls.
8. Replace built-in fields.
9. Replace dynamic input renderers.
10. Replace empty states.
11. Remove unused local helper markup/classes.

After each group, run TypeScript or the targeted runtime check before continuing.

## 11. Behavior matrix

| Scenario | Expected behavior |
| --- | --- |
| No days | Global active, Days disabled |
| One online entry | Add enabled when capability allows, no index badge |
| Two online entries | Multi badge, two index buttons, remove visible |
| Offline | Add disabled, memo option visible |
| Offline Memo off | switch unchecked, no memo textarea |
| Offline Memo on | switch checked, memo textarea visible |
| Capability disabled | switch disabled with explanatory title |
| Reset | values return to initial runtime values |
| Dynamic image | URL update and local upload still work |

## 12. Verification

```bash
npx tsc --noEmit
npx eslint \
  'src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx' \
  'src/app/(root)/template-studio/_components/runtime/ui/*.tsx' \
  'src/app/(root)/template-studio/_components/runtime/ui/*.ts'
npm run check:template-studio:timetable-runtime
npm run check:template-studio:component-sets
```

Search requirements:

```bash
rg 'blue-|slate-' \
  'src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx'
```

Any remaining match must have a documented reason.

## 13. Completion gate

- Form uses V2 primitives for all repeated controls.
- Runtime behavior matrix passes.
- Form contains no legacy TimeTable/V2 form imports.
- Entry count and memo behavior are unchanged.
- One entry has no unnecessary index space.
- Two entries expose compact selection and removal UI.
- No button or input is clipped at desktop/mobile panel widths.
- Phase 04 can restyle the shell without changing Form APIs.
