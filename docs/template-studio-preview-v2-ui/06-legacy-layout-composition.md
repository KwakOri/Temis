# Phase 06 — Legacy Layout Composition with Dynamic Inputs

## 1. Objective

Template Studio Preview의 V2 전용 primitive를 유지하면서 기존 TimeTable과 유사한 폼
레이아웃을 새 조합 컴포넌트로 재현한다.

현재 Preview의 "요일을 선택한 뒤 한 요일만 편집"하는 정보 구조를 "공통 설정 다음에
7개 요일 카드를 세로로 배치하고 각 카드 안에서 직접 편집"하는 구조로 변경한다.

기존 `DayCard`, `EntryCard`, `TimeTableInputList`는 import하거나 복사하지 않는다. 현재
마련된 V2 primitive를 조합하고 Template Studio runtime 모델에 맞는 controlled composite
component를 새로 작성한다.

## 2. Conclusion on dynamic inputs

### 2.1 Already dynamic

에디터에서 추가한 사용자 Input은 현재도 다음 경로로 자동 반영된다.

```text
Template Studio editor
  → document.inputs[inputId]
  → runtime inputGroups by scope
  → generic renderInput(input, context)
  → runtimeValues.global / days / entries
  → bound Preview node
```

현재 Runtime Form은 `Object.values(document.inputs)`를 순회하며 Input을 다음 scope로
분류한다.

- `global`
- `day`
- `entry`

그리고 Input type을 공통 renderer로 처리한다.

- `text`
- multiline `text`
- `image`
- `select`

따라서 새 레이아웃도 동일한 scope loop를 유지하면 에디터에서 추가한 Input이 자동으로
표시된다.

### 2.2 Intentionally built-in

다음 항목은 사용자 Input이 아니라 timetable runtime의 built-in field이므로 별도 UI가
필요하다.

- Main Title
- Sub Title
- Time
- Online/Offline
- Multi
- Offline Memo
- Entry 추가/삭제

이 항목이 코드에 명시되는 것은 임의의 하드코딩이 아니라 timetable domain contract를
표현하는 것이다.

### 2.3 Missing metadata

현재 `StudioInputDefinition`에는 다음 metadata가 없다.

- 명시적인 표시 순서
- 기본 설정/추가 기능 section
- 같은 카드 안에서의 group
- half/full width 같은 layout hint
- collapsed/default-open 상태

따라서 scope에 따른 자동 배치는 가능하지만, 사용자가 추가한 Input을 "기본 설정"과
"추가 기능" 중 어디에 넣을지 또는 몇 번째에 표시할지는 자동으로 판단할 수 없다.

## 3. Current versus target information architecture

### Current

```text
Inputs
├── Global / Days switch
└── Days
    ├── weekday selector
    ├── Status card
    ├── Entries card
    └── selected Entry fields
```

State is centered on:

- `selectedDayId`
- `selectedEntryIndex`
- `activeScopeTab`

### Target

```text
Runtime Form
├── Form tabs
│   ├── Basic
│   └── Add-ons (only when available)
├── Global settings
│   └── dynamic global inputs
└── Weekly timetable
    ├── Day Card · Monday
    │   ├── Online/Offline
    │   ├── dynamic day inputs
    │   ├── Entry Card 1
    │   │   ├── built-in entry fields
    │   │   └── dynamic entry inputs
    │   ├── Entry Card 2
    │   └── Offline Memo
    ├── Day Card · Tuesday
    └── ...
```

All days and entries are rendered from document/runtime data. No day-name-specific JSX is allowed.

## 4. Proposed composite components

Target directory:

```text
src/app/(root)/template-studio/_components/runtime/composition/
├── studio-runtime-day-card.tsx
├── studio-runtime-entry-card.tsx
├── studio-runtime-form-tabs.tsx
├── studio-runtime-section-title.tsx
├── studio-runtime-setting-row.tsx
└── studio-runtime-week-summary.tsx
```

These components may import V2 runtime primitives but not legacy TimeTable components.

### 4.1 `StudioRuntimeDayCard`

Controlled Props:

```ts
interface StudioRuntimeDayCardProps {
  dayId: string;
  label: React.ReactNode;
  online: boolean;
  memoEnabled: boolean;
  memoAvailable: boolean;
  multi: boolean;
  children: React.ReactNode;
  offlineContent?: React.ReactNode;
  onOnlineChange: (online: boolean) => void;
  onMemoEnabledChange: (enabled: boolean) => void;
}
```

Responsibilities:

- day card surface
- header and day label
- Online/Offline toggle
- Multi/Memo status controls
- online body versus offline memo body presentation

It must not read the document, runtime Context, entries, or capabilities directly.

### 4.2 `StudioRuntimeEntryCard`

Controlled Props:

```ts
interface StudioRuntimeEntryCardProps {
  index: number;
  showIndex: boolean;
  removable: boolean;
  children: React.ReactNode;
  onRemove?: () => void;
}
```

Rules:

- A single entry has no number and reserves no number space.
- Two entries show a compact number in each Entry Card.
- Remove action stays inside the Entry Card.
- Internal entry IDs are never displayed.

### 4.3 `StudioRuntimeSettingRow`

Use for compact global controls such as image upload or semantic toggles.

It only composes label, description, and right-side control. It does not know what setting it edits.

### 4.4 `StudioRuntimeFormTabs`

The visual structure may match the existing Basic/Add-ons tabs, but tab visibility must be driven by
available content.

Initial rule:

- Basic always exists.
- Add-ons exists only when a supported semantic capability or explicitly grouped Input exists.
- If Input grouping metadata is not implemented, all user Inputs remain in Basic.

### 4.5 `StudioRuntimeWeekSummary`

The current week start/end dates live in the document timetable definition and are read-only runtime
data. Therefore the first version displays the week summary without previous/next mutation.

Editable week navigation requires a separate runtime state/domain decision and is out of this layout
phase.

## 5. Dynamic rendering contract

### 5.1 Global inputs

Render once above the weekly timetable.

```tsx
{inputGroups.global.map((input) =>
  renderInput(input, {})
)}
```

### 5.2 Day inputs

Render inside every Day Card with that card's `dayId`.

```tsx
{inputGroups.day.map((input) =>
  renderInput(input, { dayId: day.id })
)}
```

### 5.3 Entry inputs

Render inside every Entry Card with `dayId` and `entryIndex`.

```tsx
{inputGroups.entry.map((input) =>
  renderInput(input, {
    dayId: day.id,
    entryIndex,
  })
)}
```

### 5.4 Required automatic behavior

| Editor action | Runtime Form result |
| --- | --- |
| Add Global text input | Appears once in Global settings |
| Add Day image input | Appears in every Day Card |
| Add Entry select input | Appears in every Entry Card |
| Change input scope | Moves to the corresponding composition level |
| Rename input | Label updates automatically |
| Change select options | Select options update automatically |
| Remove input | Disappears from the Runtime Form |

The saved Preview route reads the saved draft/published document. Editor changes appear there after
the document is saved. In-editor runtime controls may update immediately from local document state.

## 6. Handler refactor

Current handlers close over `selectedDayId` and `selectedEntryIndex`. Change them to explicit
parameters.

```ts
addEntry(dayId)
removeEntry(dayId, entryIndex)
updateDayBaseStatus(dayId, baseStatus)
toggleOfflineMemo(dayId)
updateEntryField(dayId, entryIndex, field, value)
updateOfflineMemo(dayId, value)
```

The existing timetable runtime utility functions already accept `dayId` and `entryIndex`; their data
model does not need to change.

After this refactor:

- remove `selectedDayId` as a data-editing dependency
- remove global `selectedEntryIndex` as a data-editing dependency
- keep only optional UI state such as expanded/collapsed day cards or active top tab

## 7. Input ordering and grouping strategy

### 7.1 First implementation

Preserve `Object.values(document.inputs)` insertion order within each scope.

Advantages:

- no document migration
- existing templates keep their current order
- newly added Inputs appear automatically

Limitations:

- no editor-controlled reorder
- no explicit Basic/Add-ons placement

### 7.2 Future metadata extension

If editor-controlled placement becomes necessary, add optional UI metadata instead of adding
Input-ID-specific conditions to the Form.

```ts
interface StudioInputUIMeta {
  section?: "basic" | "addons";
  group?: string;
  order?: number;
  width?: "full" | "half";
}

interface StudioInputBase {
  // existing fields
  ui?: StudioInputUIMeta;
}
```

Rules:

- metadata is optional
- absent metadata falls back to `basic`, current scope, and insertion order
- runtime value storage remains unchanged
- migration only normalizes defaults when necessary
- the editor owns metadata editing

Do not introduce this extension solely to reproduce the first layout version.

## 8. Built-in versus dynamic field order

Recommended Entry Card order:

1. Time
2. Sub Title
3. Main Title
4. dynamic Entry inputs
5. Remove action when two entries exist

This ordering visually follows the existing TimeTable layout. The built-in fields remain explicit;
dynamic fields are always appended through the scope loop.

Recommended Day Card order:

1. day header/status
2. dynamic Day inputs
3. Entry Cards
4. Entry add action
5. Offline Memo body when active

## 9. Features not to copy blindly

- Guerrilla toggle: no equivalent Template Studio status/domain contract
- Image Save footer: separate export concern, not Runtime Form editing
- Editable previous/next week: current week definition is document-owned
- Artist/Profile controls: expose only when matching semantic capability/input exists
- Legacy autosave assumptions: retain current Template Studio reset/save behavior

The layout may look similar without pretending unsupported domain features exist.

## 10. Performance

The maximum normal workload is small:

- seven day cards
- one or two entries per day
- user-defined fields per scope

This is acceptable for controlled React rendering. Optimize only after measurement.

Recommended boundaries:

- Day Card receives only one day's runtime slice.
- Entry Card receives only one entry's slice.
- Stable callbacks may use `useCallback` if profiling shows unnecessary renders.
- Do not add local form mirrors that can drift from `runtimeValues`.

## 11. Implementation phases

### Phase A — Composite UI

1. Create SectionTitle, SettingRow, FormTabs.
2. Create controlled DayCard.
3. Create controlled EntryCard.
4. Create read-only WeekSummary if the week definition exists.

Gate: components compile without runtime/domain imports.

### Phase B — Parameterized handlers

1. Refactor all selected-day handlers to receive `dayId`.
2. Refactor entry handlers to receive `dayId` and `entryIndex`.
3. Preserve runtime utility calls and behavior.
4. Extend runtime regression tests for multiple days.

Gate: Online/Offline/Multi/Memo tests pass for at least two days.

### Phase C — Form composition

1. Render Global settings once.
2. Remove the weekday selector as the primary editor.
3. Render all Day Cards in timetable order.
4. Render dynamic Day inputs per Day Card.
5. Render all Entry Cards per day.
6. Render dynamic Entry inputs per Entry Card.
7. Keep Reset in the Form header.

Gate: newly added Inputs appear at the correct scope automatically.

### Phase D — Visual and responsive parity

1. Match vertical card spacing and hierarchy.
2. Match header/toggle/field density.
3. Verify sticky scroll behavior without copying the Save Image footer.
4. Verify 420px desktop and mobile bottom panel layouts.

Gate: no clipping and the full weekly list remains usable.

## 12. Automated verification

Extend `scripts/check-template-studio-runtime-v2-ui.tsx`.

Required fixtures:

- one custom Global text Input
- one custom Day image Input
- one custom Entry select Input
- two days with different values
- one day with one entry
- one day with two entries
- one Offline Memo day

Assertions:

- Global label appears once
- Day label appears once per day card
- Entry label appears once per rendered entry
- scope change relocates the field
- input removal removes the field
- one entry has no index UI
- two entries show two indexes and remove actions
- internal IDs are absent
- no legacy component import exists

Run:

```bash
npx tsc --noEmit
npx eslint \
  'src/app/(root)/template-studio/_components/runtime/**/*.tsx' \
  'src/app/(root)/template-studio/_components/runtime/**/*.ts'
npm run check:template-studio:runtime-v2-ui
npm run check:template-studio:timetable-runtime
npm run check:template-studio:component-sets
```

## 13. Browser verification

- Global settings render above the weekly list.
- All seven days are reachable by scrolling without a weekday selector.
- Editing Monday does not modify Tuesday.
- Editing Entry 2 does not modify Entry 1.
- Add/remove Entry updates only the target day.
- Online/Offline transition updates only the target day.
- Offline Memo expands in the correct Day Card.
- Dynamic image/select/text Inputs work at every scope.
- Desktop and mobile panel scrolling remain usable.

## 14. Completion criteria

- Existing V2 primitive components remain independent.
- Legacy layout is recreated through new controlled composite components.
- All days render from `timetable.dayIds`; no weekday-specific JSX exists.
- All entries render from runtime data; no fixed entry count JSX exists.
- User-added Global, Day, and Entry Inputs appear automatically.
- Built-in fields remain explicitly separated from user Inputs.
- Missing Input grouping metadata does not cause ID-based hardcoding.
- Existing runtime storage and component-set resolution remain unchanged.
- Unsupported legacy features are not imitated as fake controls.
