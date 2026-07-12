# Phase 05 — Verification and Rollout

## 1. Objective

V2 Preview UI 전환이 기존 runtime behavior, component-set layout, accessibility, responsive
layout을 손상시키지 않았는지 검증한다.

이 단계는 구현 완료 선언을 위한 필수 gate다. 단순히 화면이 오렌지색으로 보이는 것만으로
완료하지 않는다.

## 2. Scope

검증 대상:

- V2 runtime theme boundary
- V2 UI primitives
- Runtime Form composition
- Runtime Shell
- per-day component-set Preview rendering
- Online/Offline/Multi/Offline Memo runtime behavior

검증 제외:

- Template Studio editor 전체 디자인
- legacy TimeTable 화면 리디자인
- database migration/remote DB write
- published payload schema 변경

## 3. Static verification

Run from project root.

```bash
npx tsc --noEmit
npx eslint \
  'src/app/(root)/template-studio/_components/runtime/**/*.tsx' \
  'src/app/(root)/template-studio/_components/runtime/**/*.ts'
npm run check:template-studio:timetable-runtime
npm run check:template-studio:component-sets
npm run check:template-studio:timetable-layout
npm run check:template-studio:entry-groups-renderer
npm run check:template-studio:object-variants
```

Also run:

```bash
git diff --check
```

All commands must exit successfully. Existing unrelated warnings must be recorded separately and not
misreported as new failures.

## 4. Architecture verification

### 4.1 No legacy UI imports

```bash
rg 'components/TimeTable|v2-template/_components/runtime/form-ui' \
  'src/app/(root)/template-studio/_components/runtime'
```

Expected: no UI/style imports. A match in documentation/comment must be evaluated manually.

### 4.2 Primitive independence

```bash
rg 'StudioRuntimeValues|StudioTemplateDocument|TEntry|TDefaultCard|useContext' \
  'src/app/(root)/template-studio/_components/runtime/ui'
```

Expected: no matches.

### 4.3 No old primary colors in Form/Shell

```bash
rg 'blue-[0-9]|border-blue|text-blue|bg-blue' \
  'src/app/(root)/template-studio/_components/runtime'
```

Expected: no active Preview UI styling matches.

### 4.4 No duplicated runtime colors

Search for repeated color hex values under `runtime/ui`. Theme values may exist in the theme contract,
but component files should use semantic variables.

## 5. Behavior test matrix

### 5.1 Scope

- Global tab selects global inputs.
- Days tab selects day/entry inputs.
- Days is disabled when no timetable days exist.
- If days disappear, state falls back to Global.

### 5.2 Day selection

- All configured days render.
- Selecting a day resets selected entry to the first entry.
- Selected day has visual and aria state.
- Day labels do not clip at 420px.

### 5.3 Status

- Online activates the online state.
- Offline activates the offline state.
- Switching status selects entry zero.
- Empty days do not enable invalid status actions.

### 5.4 Multi

- One entry shows no index indicator or reserved index space.
- Adding a second entry enables Multi presentation.
- Two compact entry selectors appear.
- Selecting Entry 1/2 changes the edited values.
- Remove exists inside the Entry section only when two entries exist.
- Removing either entry returns to a valid one-entry state.
- Internal IDs such as `fri-entry-1` are never displayed.

### 5.5 Offline Memo

- Memo control appears only in Offline state.
- Toggle checked state matches `offlineMemo` status.
- Toggle respects capability disabled state.
- Memo textarea appears only when enabled.
- Memo content updates Preview immediately.

### 5.6 Inputs

- Main Title updates Preview.
- Sub Title updates Preview.
- Time updates Preview.
- Dynamic global/day/entry inputs preserve scope.
- Select input changes value.
- Image URL field changes image source.
- File upload still reads a local image.
- Reset restores initial values.

## 6. Component-set rendering regression

Use at least two component sets.

- Set A uses the default card size.
- Set B uses a different width and/or height.
- Monday uses Set A.
- Tuesday uses Set B.

Verify:

- each day resolves its assigned component set
- each status renders from the assigned set
- mixed widths/heights do not overlap adjacent rows/columns
- Form edits the correct day entry
- changing Form status does not change day-to-set assignment
- resetting runtime values does not change document component assignments

## 7. Visual comparison

Compare a legacy TimeTable input page and the new Preview Form side by side.

Target parity:

- orange hue and primary emphasis
- warm background hierarchy
- border temperature
- radius family
- field density
- toggle motion
- selected/hover/focus treatment

Permanent pixel parity is not required. Differences are acceptable when caused by:

- the Preview panel's 420px constraint
- clearer accessibility
- V2's Global/Days/Entry information architecture
- removal of legacy coupled behavior

Record any deliberate difference before completion.

## 8. Responsive matrix

Suggested viewport coverage:

| Category | Width target |
| --- | --- |
| desktop wide | 1440px or larger |
| desktop | 1024–1280px |
| tablet/narrow | 768–1023px |
| mobile | 390–430px |

At each size verify:

- no horizontal page scroll
- no right-side button clipping
- Form scrollbar is usable
- header metadata truncates correctly
- zoom toolbar stays reachable
- day selector remains legible
- input controls keep minimum hit area

## 9. Accessibility checks

- Tab through all controls without mouse.
- Focus indicator is visible.
- Scope/status/entry controls expose pressed state.
- Memo exposes switch role and checked state.
- Disabled controls are announced and not actionable.
- Inputs are associated with labels.
- Icon-only actions have accessible labels.
- Error/description IDs, if present, are connected by `aria-describedby`.
- Color is not the only state indicator.

## 10. Visual evidence

Capture at least:

1. Desktop Online with one entry.
2. Desktop Online Multi with Entry 2 selected.
3. Desktop Offline Memo.
4. Mobile/narrow Form.
5. Mixed-size component-set Preview.

Screenshots are verification artifacts; they do not need to be committed unless the project adopts a
snapshot fixture location.

## 11. Failure handling

When a failure is found:

1. Identify the owning phase document.
2. Record whether the issue is theme, primitive, Form, Shell, or runtime behavior.
3. Fix the smallest owning layer.
4. Re-run the failed check.
5. Re-run all downstream checks affected by that layer.

Do not fix a primitive API problem by adding runtime-specific conditional styling inside the Form.

## 12. Commit strategy

Documentation commit occurs before implementation.

Recommended implementation commits:

1. V2 theme contract and primitives
2. Runtime Form integration
3. Runtime Shell styling and verification fixes

If existing unrelated working-tree changes make clean separation unsafe, keep implementation
uncommitted and report the exact boundary rather than mixing unrelated changes.

## 13. Completion gate

- All static commands pass.
- Architecture searches pass.
- Behavior matrix passes.
- Mixed-size component-set rendering passes.
- Desktop and mobile visual checks pass.
- Accessibility checks pass.
- Existing legacy TimeTable code is unchanged.
- V2 theme can diverge without legacy changes.
- No required implementation work remains undocumented.
