# Phase 04 — Runtime Shell Integration

## 1. Objective

Template Studio Preview의 Shell을 V2 runtime theme으로 전환한다.

대상은 Header, source metadata, canvas overlay controls, Form boundary다. 실제 template
renderer, timetable artwork, pan/zoom 계산은 변경하지 않는다.

## 2. Target file

```text
src/app/(root)/template-studio/_components/runtime/
  template-studio-runtime-shell.tsx
```

## 3. Dependency gate

- Phase 01 theme boundary and token complete
- Phase 02 primitive complete
- Phase 03 Form integration complete
- Form root already reads V2 tokens

## 4. Root and layout

The Runtime Shell root must:

- include `template-studio-runtime-theme`
- use V2 form background outside the canvas
- preserve `h-screen`, full-width, and overflow behavior
- preserve desktop row and mobile column layout
- preserve the 420px desktop Form width contract

No additional provider or global runtime state is introduced.

## 5. Header

### Existing responsibilities

- calendar icon
- template display name
- draft/published source badge
- template ID
- updated timestamp

### V2 visual treatment

- Header surface: runtime card/form surface
- Header border: runtime border
- Icon container: runtime primary
- Primary text: runtime foreground
- Metadata: runtime muted/subtle foreground
- Source badge: warm neutral surface with clear border

### Constraints

- Long template names remain truncated.
- Template ID remains truncatable.
- Date formatting logic is unchanged.
- `source` content and semantics are unchanged.

## 6. Canvas boundary

The canvas remains dark because it is a neutral preview area and needs contrast against bright
template artwork.

Preserve:

- checkerboard background
- canvas centering
- preview shadow
- pan cursor
- pointer capture handlers
- wheel zoom
- double-click Fit

Allowed style changes:

- checkerboard base may use `--runtime-canvas-bg`
- overlay shadow may use `--runtime-shadow-overlay`

No rendered template node receives the V2 form theme class as a style input. Theme variables may be
in DOM scope, but renderer output must continue to use document-authored styles.

## 7. Zoom toolbar

Controls:

- Zoom out
- percentage display
- Zoom in
- separator
- Fit

V2 treatment:

- warm card surface
- runtime border
- runtime foreground/muted icons
- warm hover surface
- orange focus-visible state
- compact rounded shape

Behavior remains unchanged:

- step stays `0.1`
- clamping remains in `clampStudioPreviewScale`
- pointer anchor zoom calculation remains unchanged
- Fit calculation remains unchanged

If a V2 ActionButton fits without changing geometry, it may be used. Otherwise keep local buttons
using the same V2 token contract. Do not distort generic primitive APIs only for the overlay.

## 8. Form boundary

The shell wrapper around `TemplateStudioRuntimeForm` must preserve:

- mobile height `44vh`
- mobile minimum height
- desktop full height
- shrink behavior

Form border belongs either to the Form root or the Shell wrapper, not both. Choose one owner and
remove duplicate borders.

## 9. Responsive checks

### Desktop

- Header content and source badge do not clip.
- Canvas fills remaining width.
- Form width remains 420px.
- Zoom toolbar does not overlap Form.

### Narrow desktop/tablet

- Form stays usable within max available width.
- Canvas scale Fit reacts to resized viewport.
- Header metadata truncates before actions clip.

### Mobile

- Canvas is above Form.
- Form scrolls within the bottom region.
- Zoom toolbar remains reachable.
- Header does not create horizontal page scrolling.

## 10. Implementation sequence

1. Apply V2 root surface/text tokens.
2. Restyle Header and source badge.
3. Restyle zoom toolbar container.
4. Restyle zoom/Fit buttons.
5. Resolve Form border ownership.
6. Verify canvas checkerboard and renderer output.
7. Verify responsive behavior.

## 11. Regression-sensitive symbols

Avoid changing these functions unless a verified bug requires it.

- `fitToViewport`
- `updateScale`
- `handleViewportWheel`
- `handlePointerDown`
- `handlePointerMove`
- `stopPanning`
- preview-size calculation
- timetable/renderer selection

## 12. Verification

```bash
npx tsc --noEmit
npx eslint \
  'src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx'
npm run check:template-studio:timetable-layout
```

Browser smoke test:

1. Open saved Preview.
2. Use Zoom in/out.
3. Use Fit.
4. Pan the canvas.
5. Resize from desktop to mobile width.
6. Confirm Form still edits Preview values.

## 13. Completion gate

- Header and zoom toolbar use V2 runtime visual language.
- Canvas remains visually neutral/dark.
- Pan/zoom/Fit behavior is unchanged.
- Shell has no blue primary UI state.
- Desktop and mobile layouts have no new clipping.
- Renderer output is unchanged.
- Phase 05 can run full regression verification.
