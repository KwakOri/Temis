# Phase 01 — Template Studio Runtime V2 Theme Contract

## 1. Objective

Template Studio Preview가 사용할 V2 전용 semantic theme contract를 만든다.

초기 색상과 시각 결과는 기존 TimeTable의 오렌지 테마에 최대한 맞추지만, V2는 legacy
token이나 component import 없이 독립적으로 변경할 수 있어야 한다.

이 단계에서는 Form 구조나 동작을 변경하지 않는다. theme boundary와 token만 추가한다.

## 2. Dependencies

- Master plan:
  `docs/template-studio-preview-orange-theme-plan.md`
- Existing runtime shell:
  `src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx`
- Existing global style entry:
  `src/app/globals.css`

## 3. Ownership boundary

V2 theme은 Template Studio runtime이 소유한다.

다음 token을 직접 참조하지 않는다.

- `--color-timetable-*`
- `bg-timetable-*`
- `text-timetable-*`
- `src/components/TimeTable/FixedComponents/styles.ts`
- `src/app/(root)/v2-template/_components/runtime/form-ui/ui/styles.ts`

초기 값이 같다는 것은 구현 의존성이 아니라 시각적 baseline을 의미한다.

## 4. Theme location

Theme class는 `src/app/globals.css`에 추가한다.

Class name:

```css
.template-studio-runtime-theme
```

적용 위치는 `TemplateStudioRuntimeShell`의 최상위 `<main>`이다. 따라서 Header, Canvas
toolbar, Runtime Form이 모두 동일한 token scope에 들어간다.

Editor 본체와 다른 페이지에는 적용하지 않는다.

## 5. Token schema

### 5.1 Accent

| Token | Initial value | Purpose |
| --- | --- | --- |
| `--runtime-primary` | `#fd9319` | primary, selected, checked |
| `--runtime-primary-hover` | `#e58615` | primary hover/pressed |
| `--runtime-primary-soft` | warm translucent orange | badge, subtle selected surface |
| `--runtime-focus` | orange derived value | keyboard focus ring |

### 5.2 Surfaces

| Token | Initial value | Purpose |
| --- | --- | --- |
| `--runtime-form-bg` | `#f5f0ed` | page/form surface |
| `--runtime-card-bg` | `#ece3e1` | card/header surface |
| `--runtime-input-bg` | `#dcd0c6` | field/control surface |
| `--runtime-input-hover` | `#e0d8d0` | inactive control hover |
| `--runtime-canvas-bg` | current dark canvas | canvas/checkerboard base |

### 5.3 Borders and text

| Token | Initial value | Purpose |
| --- | --- | --- |
| `--runtime-border` | `#e2d4c4` | card/control border |
| `--runtime-border-strong` | darker warm border | emphasized control boundary |
| `--runtime-fg` | `#1b1612` | primary text |
| `--runtime-fg-muted` | warm gray | secondary text |
| `--runtime-fg-subtle` | lighter warm gray | metadata and hints |

### 5.4 Semantic states

| Token | Purpose |
| --- | --- |
| `--runtime-danger` | destructive action |
| `--runtime-danger-hover` | destructive action hover |
| `--runtime-disabled-opacity` | disabled visual state |
| `--runtime-shadow-card` | card elevation |
| `--runtime-shadow-overlay` | zoom toolbar/overlay elevation |

Danger는 orange primary로 표현하지 않는다.

## 6. CSS usage rules

- Component class에서 raw legacy colors를 새로 추가하지 않는다.
- Runtime UI에서 반복되는 hex 값은 semantic token으로 올린다.
- Tailwind arbitrary property는 다음 형식을 사용한다.

```tsx
className="bg-[var(--runtime-card-bg)] text-[var(--runtime-fg)]"
```

- focus는 `focus-visible`을 우선한다.
- disabled 상태는 pointer/keyboard behavior와 opacity를 함께 처리한다.
- Canvas checkerboard의 grid color는 tokenization 대상이지만 밝은 form surface로 변경하지
  않는다.

## 7. Initial visual baseline

다음 항목은 기존 TimeTable과 동일하게 보여야 한다.

- orange active button
- warm beige form background
- warm card and input background
- rounded card/input geometry
- subtle warm border
- dark brown primary text
- orange focus/selected feedback

다음 항목은 현재 Template Studio Preview 특성을 유지한다.

- dark checkerboard canvas
- canvas pan cursor
- runtime source badge content
- responsive side/bottom panel layout

## 8. Implementation steps

1. Add `.template-studio-runtime-theme` to `globals.css`.
2. Define all tokens from sections 5.1–5.4.
3. Add the theme class to the Runtime Shell root.
4. Do not replace component classes yet.
5. Verify that adding the class alone causes no visual or behavior regression.

## 9. Verification

### Static

```bash
npx tsc --noEmit
npx eslint \
  'src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx'
```

### Structural

- Theme class exists exactly once at the runtime root.
- Editor routes do not receive the theme class.
- No legacy TimeTable style import is added.
- Existing runtime shell handlers are untouched.

## 10. Completion gate

- V2 token schema exists in one theme boundary.
- Runtime Shell root owns the boundary.
- Existing Preview rendering and controls still work.
- No Form component has been restyled in this phase.
- No legacy component/style file was modified.
- Phase 02 can consume the V2 tokens without importing legacy styles.
