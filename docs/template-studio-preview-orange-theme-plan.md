# Template Studio Preview Orange Theme Plan

## 1. Goal

Template Studio의 Preview 페이지가 기존 TimeTable 입력 폼과 같은 오렌지 중심의
시각 언어를 사용하도록 변경한다.

현재 시점에는 기존 TimeTable과 최대한 동일하게 보이도록 만들지만, 장기적으로는 V2가
독립적으로 발전할 수 있어야 한다. 따라서 기존 컴포넌트나 스타일 구현을 직접 공유하지
않고, Template Studio V2 전용 UI 컴포넌트와 테마 계약을 새로 작성한다.

이번 작업은 Preview의 입력 및 조작 UI 계층을 분리하고 스타일을 통일하는 작업이다.
템플릿 캔버스에 렌더링되는 사용자 콘텐츠, 런타임 데이터 구조, 상태 전환 로직은
변경하지 않는다.

### Document set and execution order

이 문서는 전체 목표, 경계, 완료 조건을 정의하는 master plan이다. 구현은 아래 세부
문서를 순서대로 완료한다.

1. [01-theme-contract.md](./template-studio-preview-v2-ui/01-theme-contract.md)
   - V2 전용 semantic token과 theme boundary
2. [02-ui-primitives.md](./template-studio-preview-v2-ui/02-ui-primitives.md)
   - Context와 런타임 모델에 독립적인 controlled UI component
3. [03-runtime-form-integration.md](./template-studio-preview-v2-ui/03-runtime-form-integration.md)
   - 기존 상태/데이터 로직을 유지한 Form composition 전환
4. [04-runtime-shell-integration.md](./template-studio-preview-v2-ui/04-runtime-shell-integration.md)
   - Header, zoom toolbar, panel boundary 적용
5. [05-verification-and-rollout.md](./template-studio-preview-v2-ui/05-verification-and-rollout.md)
   - 정적 검사, 상태 행렬, 반응형/시각 회귀 검증

각 단계는 이전 문서의 completion gate를 통과한 뒤 진행한다. 단계 중 발견한 설계 변경은
해당 세부 문서에 먼저 기록하고 구현한다.

## 2. Assumptions

- 기존 TimeTable의 현재 색상, 간격, radius, typography, interaction을 시각적 기준으로
  사용한다.
- V2는 전용 semantic theme token을 가진다. 초기값은 기존 TimeTable과 같게 설정하지만,
  향후 V1 변경과 무관하게 독립적으로 변경할 수 있다.
- Preview의 입력 패널, 상단 헤더, 확대/축소 컨트롤에 동일한 디자인 언어를 적용한다.
- 템플릿 가시성을 위한 캔버스의 어두운 체크무늬 배경은 유지한다.
- 삭제처럼 의미가 분명한 위험 동작은 오렌지로 덮지 않고 기존 danger 색상을 유지한다.
- 기존 TimeTable/V2 Runtime 컴포넌트의 소스 파일을 복사하지 않는다.
- 기존 TimeTable 컴포넌트의 데이터 모델과 Preview 런타임 모델을 통합하지 않는다.
- 새 UI 컴포넌트는 Context나 document를 직접 읽지 않는 controlled component로 작성한다.

## 3. Current State

Preview UI는 다음 파일에 집중되어 있다.

- `src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx`
  - 페이지 헤더
  - 캔버스 배경
  - 확대/축소 컨트롤
  - Preview와 입력 패널 배치
- `src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx`
  - Global/Days 탭
  - 요일 선택
  - Online/Offline 상태
  - Offline Memo 토글
  - Entry 선택, 추가, 삭제
  - 텍스트, textarea, select, image 입력
  - Reset 버튼

현재 위 컴포넌트는 `slate` 계열 배경과 `blue-500` 계열 강조색을 직접 사용한다.

기존 TimeTable 디자인 기반은 다음 위치에 있다.

- `src/app/globals.css`
  - `timetable-*` 전역 색상 토큰
- `src/components/TimeTable/FixedComponents/styles.ts`
  - `cardVariants`
  - `inputVariants`
  - `buttonVariants`
  - `labelVariants`
  - `toggleVariants`
- `src/components/TimeTable/FixedComponents/Toggle.tsx`
  - TimeTable 토글의 동작 및 스타일

저장소에는 이미 V2 전용 UI 복제 사례가 있다.

- `src/app/(root)/v2-template/_components/runtime/form-ui/ui/styles.ts`
  - 현재 legacy `FixedComponents/styles.ts`와 동일한 내용을 별도 보관한다.
- `src/app/(root)/v2-template/_components/runtime/form-ui/runtime-input-list.tsx`
  - V2 경로에 있지만 기존 `TDefaultCard`, `TEntry` 중심 구조가 남아 있다.

이번 Template Studio V2 UI는 위 구조를 다시 복제하지 않는다. 기존 화면은 시각적
reference로만 사용하고, Template Studio 런타임 모델에 맞는 작은 컴포넌트를 새로
구성한다.

## 4. Independence Policy

### 4.1 Visual parity, not implementation sharing

현재 V2 UI는 기존 TimeTable과 다음 항목을 최대한 동일하게 맞춘다.

- orange primary/hover color
- warm form, card, input surfaces
- border, radius, shadow
- label과 본문 typography
- hover, focus, selected, disabled state
- toggle motion과 크기

동일성은 screenshot과 state matrix로 검증한다. legacy 컴포넌트/CVA import로 동일성을
강제하지 않는다.

### 4.2 V2-owned semantic tokens

V2 runtime theme root에 아래 의미 기반 토큰을 정의한다.

```css
.template-studio-runtime-theme {
  --runtime-primary: #fd9319;
  --runtime-primary-hover: #e58615;
  --runtime-form-bg: #f5f0ed;
  --runtime-card-bg: #ece3e1;
  --runtime-card-border: #e2d4c4;
  --runtime-input-bg: #dcd0c6;
  --runtime-input-hover: #e0d8d0;
  --runtime-fg: #1b1612;
}
```

초기값은 기존 TimeTable 토큰과 같지만 소유권은 V2에 있다. 향후 V2 디자인이 변경될
때 legacy TimeTable을 수정하거나 legacy token 변경을 따라갈 필요가 없다.

### 4.3 V2-owned component API

새 UI 컴포넌트는 다음 원칙을 따른다.

- `value`, `checked`, `active`, `disabled`와 callback을 받는 controlled component
- `StudioRuntimeValues`, `StudioTemplateDocument`, React Context 직접 참조 금지
- 데이터 변환 및 capability 판단 금지
- 접근성 attribute와 visual state만 책임
- `cva`는 V2 컴포넌트 내부 variant 관리에 사용
- 한 컴포넌트는 하나의 UI 책임만 가짐

예시:

```tsx
<StudioRuntimeToggle
  checked={isOfflineMemoEnabled}
  disabled={!canUseOfflineMemo}
  label="Memo"
  onCheckedChange={toggleOfflineMemo}
/>
```

### 4.4 Do not reuse or copy

다음 legacy/V2 컴포넌트와 스타일 구현은 import하거나 파일 단위로 복사하지 않는다.

- `src/components/TimeTable/FixedComponents/*`
- `src/app/(root)/v2-template/_components/runtime/form-ui/*`
- `DayCard`
- `EntryCard`
- `OfflineMemoCard`
- `TimeTableInputList`
- legacy `styles.ts`

기존 구현의 시각 결과만 reference로 사용한다.

### 4.5 Problems not to repeat

- legacy `styles.ts` 전체 복제
- `TEntry`, `TDefaultCard`를 UI 컴포넌트 Props로 전달
- 하나의 InputList가 모든 상태와 필드를 처리하는 대형 컴포넌트
- UI 컴포넌트 내부에서 runtime/context mutation
- active 의미가 컴포넌트마다 반대로 해석되는 toggle API
- 색상 hex가 여러 컴포넌트에 반복되는 구조
- label이 보이는 상태와 `aria-label`이 서로 다른 구조

## 5. Style Mapping

| Preview current style | V2 target |
| --- | --- |
| `bg-slate-900` panel/header | `--runtime-form-bg` or `--runtime-card-bg` |
| `bg-slate-950` input/control | `--runtime-input-bg` |
| `border-slate-700/800` | `--runtime-card-border` |
| `bg-blue-500` selected/primary | `--runtime-primary` |
| `hover:border-blue-400` | `--runtime-primary` hover/focus border |
| `focus:border-blue-400` | `--runtime-primary` focus ring |
| `text-slate-100` primary text | `--runtime-fg` |
| `text-slate-400/500` secondary text | `text-gray-600/500` |
| blue Multi badge | orange tint badge |
| slate segmented control | V2 warm input surface + orange selected state |

## 6. Component Plan

### Target structure

```text
src/app/(root)/template-studio/_components/runtime/
├── ui/
│   ├── studio-runtime-action-button.tsx
│   ├── studio-runtime-card.tsx
│   ├── studio-runtime-empty-state.tsx
│   ├── studio-runtime-field.tsx
│   ├── studio-runtime-segmented-control.tsx
│   ├── studio-runtime-toggle.tsx
│   └── studio-runtime-ui.ts
├── template-studio-runtime-form.tsx
└── template-studio-runtime-shell.tsx
```

`studio-runtime-ui.ts`는 V2 CVA variant와 class 조합만 제공한다. legacy `styles.ts`를
재-export하지 않는다.

### Phase 1. V2 theme contract

- Add `.template-studio-runtime-theme` at the runtime theme boundary.
- Define V2 semantic tokens with values visually matching the current TimeTable.
- Use semantic names rather than `orange`, `slate`, or legacy component names.
- Keep danger, disabled, focus-ring, and muted text tokens explicit.
- Do not change `src/components/TimeTable/FixedComponents/styles.ts`.

Expected result: V2 starts visually identical but can diverge without changing V1.

### Phase 2. V2 primitive components

Create the `runtime/ui` controlled components.

- `StudioRuntimeField`
  - text, textarea, select presentation
  - label, description, error/disabled state
- `StudioRuntimeActionButton`
  - primary, secondary, ghost, danger variants
  - regular and compact sizes
- `StudioRuntimeSegmentedControl`
  - Global/Days, Online/Offline, Entry selection
  - generic item IDs and labels
- `StudioRuntimeToggle`
  - one consistent `checked=true` meaning
  - compact size for Offline Memo
- `StudioRuntimeCard`
  - section/header/content structure only
- `StudioRuntimeEmptyState`
  - empty day and empty global input states

Expected result: styles and accessibility are testable without Template Studio runtime data.

### Phase 3. Runtime form composition

Update `template-studio-runtime-form.tsx` to compose the new primitives.

- Keep all current state calculation and mutation functions in the form.
- Replace local field JSX with `StudioRuntimeField`.
- Replace Global/Days and Online/Offline controls with `StudioRuntimeSegmentedControl`.
- Replace weekday selection with a small V2-owned day selector composed from the primitive styles.
- Replace Offline Memo switch with `StudioRuntimeToggle`.
- Use the segmented control for entry numbers only when two entries exist.
- Use `StudioRuntimeActionButton` for Upload, Reset, add, and remove actions.
- Keep remove-entry danger semantics.

Expected result: `template-studio-runtime-form.tsx` owns orchestration, while visual components own
only rendering and interaction events.

### Phase 4. Panel/card hierarchy

- Apply the V2 runtime theme root to the Preview shell/form boundary.
- Use `StudioRuntimeCard` for major sections where card hierarchy is needed.
- Use V2 runtime input and surface tokens for fields and empty states.
- Preserve the current scroll container, 420px desktop width, and mobile height behavior.
- Avoid rebuilding a single `RuntimeInputList`; keep scope/entry mapping close to the current form
  orchestration.

Expected result: the right panel reads as the current TimeTable style without inheriting its data
model or component hierarchy.

### Phase 5. Runtime shell

Update `template-studio-runtime-shell.tsx`.

- Change header icon/accent to the V2 runtime primary token.
- Change header surface and borders to the V2 runtime card/form tokens.
- Change source badge to a warm neutral badge.
- Change zoom toolbar surface to the V2 runtime card/input tokens and orange hover/focus states.
- Keep the checkerboard canvas dark.
- Keep pan, zoom, fit, responsive layout, and renderer selection unchanged.

Expected result: Preview header and controls belong to the same theme while the canvas remains a
neutral editing surface.

## 7. State Matrix to Verify

All styles must be checked in the following states.

| Area | States |
| --- | --- |
| Scope | Global, Days, disabled Days |
| Day | selected, inactive, hover |
| Status | Online, Offline |
| Memo | enabled, disabled, capability unavailable |
| Entry | one entry, two entries, selected first, selected second |
| Add Entry | enabled, disabled by status, disabled by maximum |
| Remove Entry | visible only for two entries, hover, focus |
| Input | empty, populated, placeholder, focus, disabled where applicable |
| Image | URL field, Upload hover, file selection |
| Reset | normal, hover, keyboard focus |
| Layout | desktop side panel, narrow/mobile bottom panel |

## 8. Accessibility

- Preserve all current `aria-label`, `aria-pressed`, `aria-checked`, and `role="switch"` values.
- Do not express selected state through color alone; retain fill, border, and pressed state.
- Ensure orange on warm backgrounds has sufficient contrast.
- Keep visible keyboard focus rings on buttons, inputs, selects, and toggles.
- Danger actions retain red/rose semantics.
- Validate that labels and controls are not clipped at the 420px panel width.

## 9. Regression Boundaries

The following behavior must not change.

- runtime value updates
- Online/Offline state model
- Multi entry creation and deletion
- Offline Memo capability rules
- day and entry input scoping
- Reset behavior
- image upload behavior
- preview canvas rendering
- pan, zoom, fit, and responsive layout
- component-set resolution and per-day card layout

## 10. Verification

### Static checks

```bash
npx tsc --noEmit
npx eslint \
  'src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx' \
  'src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx' \
  'src/app/(root)/template-studio/_components/runtime/ui/*.tsx' \
  'src/app/(root)/template-studio/_components/runtime/ui/*.ts'
npm run check:template-studio:timetable-runtime
npm run check:template-studio:component-sets
npm run check:template-studio:timetable-layout
```

### Browser checks

- Open a saved Template Studio Preview.
- Compare the form with an existing TimeTable input page side by side.
- Exercise every state in the state matrix.
- Check desktop and mobile/narrow widths.
- Confirm the right panel scrollbar and controls do not clip.
- Confirm the rendered timetable itself is unchanged.

## 11. Proposed Change Order

1. Capture current TimeTable visual reference and interaction states.
2. Define the V2 runtime semantic theme tokens.
3. Create controlled V2 primitive components with their own CVA variants.
4. Replace runtime fields and actions with the V2 primitives.
5. Replace scope, weekday, status, memo, and entry controls.
6. Apply the V2 panel/card hierarchy and shell styling.
7. Run component-level, static, and runtime checks.
8. Perform side-by-side visual comparison and responsive browser QA.
9. Commit the V2 theme/component work separately from component-set implementation.

## 12. Out of Scope

- changing the actual timetable artwork or component-set design
- changing Template Studio editor colors
- adding a Preview theme selector
- redesigning the runtime data model
- refactoring existing TimeTable domain components
- sharing or modifying legacy TimeTable CVA/component implementations
- importing the existing `/v2-template` runtime form components
- guaranteeing permanent pixel parity between V1 and V2
- adding new dependencies
- changing published template payloads or database schema

## 13. Completion Criteria

- Preview controls use the existing TimeTable orange palette and warm surfaces.
- No Preview control retains a blue primary/selected/focus state.
- V2 runtime UI does not import legacy TimeTable or `/v2-template/form-ui` components.
- V2 runtime primitives do not reference runtime context, document, `TEntry`, or `TDefaultCard`.
- Existing TimeTable screens and styles are unchanged.
- Preview runtime behavior is unchanged.
- Desktop and mobile layouts have no clipping or overflow regression.
- Static checks and Template Studio runtime/layout checks pass.
- Future V2 visual changes can be made through V2 tokens/components without changing V1.
