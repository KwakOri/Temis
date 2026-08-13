# Phase 02 — Template Studio Runtime V2 UI Primitives

## 1. Objective

Template Studio Preview용 V2 UI primitive를 새로 작성한다.

컴포넌트는 기존 TimeTable과 최대한 동일한 시각 결과를 내지만 legacy implementation을
공유하거나 복사하지 않는다. 모든 primitive는 controlled component이며 Template Studio
runtime state와 분리한다.

## 2. Dependency gate

Phase 01이 완료되어 다음 token이 Runtime Shell scope에서 제공되어야 한다.

- accent tokens
- surface tokens
- border/text tokens
- semantic state tokens

Theme token이 준비되지 않았다면 이 단계를 시작하지 않는다.

## 3. Target directory

```text
src/app/(root)/template-studio/_components/runtime/ui/
├── studio-runtime-action-button.tsx
├── studio-runtime-card.tsx
├── studio-runtime-empty-state.tsx
├── studio-runtime-field.tsx
├── studio-runtime-segmented-control.tsx
├── studio-runtime-toggle.tsx
└── studio-runtime-ui.ts
```

필요한 type은 각 파일 가까이에 둔다. 여러 컴포넌트가 실제로 공유하는 type만
`studio-runtime-ui.ts`로 올린다.

## 4. Global rules

### 4.1 Allowed dependencies

- React
- `class-variance-authority`
- `@/lib/utils`의 `cn`
- `lucide-react` icon을 `ReactNode`로 전달받는 방식
- V2 runtime semantic CSS variables

### 4.2 Forbidden dependencies

- `StudioRuntimeValues`
- `StudioTemplateDocument`
- timetable domain utility
- React Query/service
- runtime/editor Context
- legacy `TEntry`, `TDefaultCard`
- legacy TimeTable component/style import
- `/v2-template/form-ui` import

### 4.3 Behavior boundary

Primitive가 할 수 있는 일:

- controlled value render
- callback 전달
- keyboard-native interaction
- aria attribute 제공
- visual variant 선택

Primitive가 하면 안 되는 일:

- entry 추가/삭제 판단
- capability 판정
- status 변환
- document/runtime mutation
- selected day/entry state 보관
- business label 생성

## 5. `StudioRuntimeActionButton`

### Props

```ts
interface StudioRuntimeActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "compact" | "default" | "icon";
  fullWidth?: boolean;
}
```

### Visual rules

- primary: runtime orange fill and white text
- secondary: warm input/card surface and dark text
- ghost: transparent/warm hover
- danger: semantic danger color
- icon: square hit area, minimum 32px
- disabled: no hover emphasis and consistent opacity
- focus-visible: runtime focus ring

### Acceptance

- Works with text-only, icon-only, and icon+text content.
- Icon-only usage requires `aria-label`.
- Native `disabled` behavior is preserved.

## 6. `StudioRuntimeCard`

### Props

```ts
interface StudioRuntimeCardProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div";
  density?: "compact" | "default";
  elevation?: "flat" | "raised";
}
```

### Responsibility

- warm surface
- border/radius/shadow
- spacing density
- semantic wrapper element

It does not implement expand/collapse, status, or toggle behavior.

## 7. `StudioRuntimeEmptyState`

### Props

```ts
interface StudioRuntimeEmptyStateProps {
  children: React.ReactNode;
  compact?: boolean;
}
```

### Visual rules

- dashed runtime border
- warm muted surface
- centered muted text
- no business-specific copy inside the primitive

## 8. `StudioRuntimeField`

### Supported controls

- text input
- textarea
- select

Image upload button is composed separately with `StudioRuntimeActionButton`.

### Props contract

```ts
interface StudioRuntimeFieldBaseProps {
  id?: string;
  label: string;
  description?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}
```

Control-specific props are discriminated by `control`.

```ts
type StudioRuntimeFieldProps =
  | ({ control: "input" } & InputProps)
  | ({ control: "textarea" } & TextareaProps)
  | ({ control: "select"; options: Option[] } & SelectProps);
```

### Rules

- Use `useId` when id is not supplied.
- Label `htmlFor` always matches control id.
- Description and error use `aria-describedby`.
- Error state has visible text and border; color alone is insufficient.
- `onChange` emits a string value, not a DOM event.
- Number/date/time conversion remains outside this component.

## 9. `StudioRuntimeSegmentedControl`

### Generic Props

```ts
interface StudioRuntimeSegmentOption<T extends string> {
  id: T;
  label: React.ReactNode;
  disabled?: boolean;
}

interface StudioRuntimeSegmentedControlProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: StudioRuntimeSegmentOption<T>[];
  columns?: number;
  size?: "compact" | "default";
  onValueChange: (value: T) => void;
}
```

### Usage targets

- Global/Days
- Online/Offline
- Entry 1/2

### Accessibility

- Container gets a meaningful group label.
- Buttons retain `aria-pressed`.
- Disabled option cannot emit a change.
- Focus ring is visible per segment.

This component does not use roving tabindex in the first version; native buttons remain independently
focusable and predictable.

## 10. `StudioRuntimeToggle`

### Props

```ts
interface StudioRuntimeToggleProps {
  checked: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  ariaLabel: string;
  onCheckedChange: (checked: boolean) => void;
}
```

### Semantics

- `checked=true` always means enabled/on.
- No `active` prop is exposed.
- Component renders `role="switch"` and `aria-checked`.
- Clicking emits `!checked` only when enabled.
- Compact geometry is owned by this component.

This rule prevents the existing online/offline toggle inversion problem from being repeated.

## 11. `studio-runtime-ui.ts`

This file owns V2-only CVA definitions when more than one primitive uses them.

Allowed examples:

- focus ring class
- control surface variants
- density variants
- disabled class

It must not become a copy of legacy `styles.ts`. Each exported style must have a concrete V2 consumer.

## 12. Implementation order

1. Create shared V2 CVA helpers.
2. Create ActionButton.
3. Create Card and EmptyState.
4. Create Field.
5. Create SegmentedControl.
6. Create Toggle.
7. Export nothing through a broad project-wide barrel; import locally from `runtime/ui`.

## 13. Verification

### Static

```bash
npx tsc --noEmit
npx eslint \
  'src/app/(root)/template-studio/_components/runtime/ui/*.tsx' \
  'src/app/(root)/template-studio/_components/runtime/ui/*.ts'
```

### Structural searches

The following searches must return no matches in `runtime/ui`.

```bash
rg 'StudioRuntimeValues|StudioTemplateDocument|TEntry|TDefaultCard' \
  'src/app/(root)/template-studio/_components/runtime/ui'
rg 'components/TimeTable|v2-template/_components/runtime/form-ui' \
  'src/app/(root)/template-studio/_components/runtime/ui'
```

### Visual harness

Before Form integration, render or temporarily compose all states in a local development-only
harness if needed. Do not commit a production route solely for the harness.

Required states:

- primary/secondary/ghost/danger buttons
- disabled button
- empty/populated/focused/disabled field
- textarea and select
- selected/unselected/disabled segment
- checked/unchecked/disabled switch
- flat/raised card

## 14. Completion gate

- All primitives compile independently.
- No primitive imports runtime/domain models or Context.
- No legacy/V2 form UI import exists.
- All colors come from V2 runtime tokens.
- All interactive components expose accessible state.
- Phase 03 can integrate primitives without changing their API.
