# Template Studio Settings, Web Font, and Toolbar Plan

Last updated: 2026-07-11

## Recovery Note

If Codex context is compacted while this work is in progress, read this
document before continuing. This document is the implementation contract for
the Template Studio settings drawer, canvas settings, custom `@font-face`
support, and top-toolbar cleanup.

## Goal

Make infrequently used document settings available from a gear button while
keeping the top toolbar focused on editing actions. Let an admin paste normal
CSS containing one or more `@font-face` rules, save those rules with the
Template Studio document, and use the declared font families and weights in
Cards, Timetable, draft preview, and published preview.

## Current State

- Cards canvas size is stored in `document.canvas` and can currently be edited
  through the `Card Frame` inspector.
- Timetable canvas size is stored in `document.domains.timetable.canvas`.
  It is displayed in the toolbar but has no editor UI.
- The current `template sample 02` local draft has:
  - Cards canvas: `2110 x 210`
  - Timetable canvas: `4000 x 2250`
- Font selectors are hard-coded to Inter, Pretendard, SF Pro, and Roboto.
- Setting `style.fontFamily` changes CSS output, but Template Studio does not
  load a corresponding web font resource.
- Theme, JSON import/export, environment label, static draft label, object
  count, and input count consume permanent toolbar space.

## Settings Drawer

Add a gear button to the top toolbar. It opens an overlay drawer on the right
so the existing inspector layout does not permanently become wider.

The drawer contains these sections:

### Canvas

- Cards width, height, and background
- Timetable width, height, and background color
- active workspace shown first
- positive finite-number validation
- common size presets, including `1920 x 1080` and `4000 x 2250`
- changes participate in the existing document history and database draft save

The existing Cards `Card Frame` canvas-size controls move into this section so
there is one canonical place for document canvas settings. Object W/H remains
in the normal inspector because it is not a document setting.

### Fonts

- list saved custom font sources
- add, edit, enable/disable, and delete a source
- show parsed family names, weights, styles, and load state
- provide a live preview for each parsed family

### Data

- Import JSON
- Export JSON
- load/reload the selected database template

### Appearance

- editor light/dark theme

### Environment and Document Info

- Local DB or Remote DB target
- schema/document version
- object count and input count

## Web Font Input Contract

The input is CSS source text, not only an `@import` URL. A normal input can
contain multiple declarations for one family and multiple weights:

```css
@font-face {
  font-family: "Pretendard";
  src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Regular.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Pretendard";
  src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Bold.woff2") format("woff2");
  font-weight: 700;
  font-display: swap;
}
```

The supplied Pretendard example with weights 100 through 900 must be accepted
as one font source and expose a single `Pretendard` family with all nine
weights.

### Parsing and Validation Rules

- Accept one or more `@font-face` blocks.
- Ignore Markdown emphasis markers accidentally copied around CSS lines.
- Reject non-`@font-face` rules instead of injecting arbitrary CSS.
- Require `font-family` and `src` in every block.
- Allow descriptors needed for real web fonts:
  - `font-family`
  - `src`
  - `font-weight`
  - `font-style`
  - `font-display`
  - `font-stretch`
  - `unicode-range`
- Allow `https:` font URLs. Allow `data:font/...` only when an explicit size
  limit is enforced. Reject `http:`, `javascript:`, local file URLs, and CSS
  functions outside the supported `src` format.
- Normalize a missing `font-display` to `swap`.
- Preserve distinct weight/style faces while de-duplicating exact duplicates.
- Return actionable block-level errors without losing the user's input.

Do not insert the raw textarea value directly into a `<style>` element. Parse
it, validate it, and generate CSS only from the normalized descriptors.

## Document Model

Add an optional, backward-compatible resource section:

```ts
interface StudioWebFontSource {
  id: string;
  label: string;
  cssText: string;
  enabled: boolean;
}

interface StudioTemplateResources {
  webFonts?: StudioWebFontSource[];
}

interface StudioTemplateDocument {
  // existing fields
  resources?: StudioTemplateResources;
}
```

The document stores validated, normalized `@font-face` CSS. Parsed family and
face metadata is derived rather than duplicated in persisted JSON. Existing
version-1 documents without `resources` continue to load as an empty font
list, so no database migration or document-version bump is required.

## Runtime Loading

Create shared font utilities and a `StudioWebFontLoader` component.

The loader must be mounted anywhere a Template Studio document is rendered:

- editor canvas
- editor runtime preview
- saved draft preview
- published preview/runtime

It generates a dedicated `<style data-template-studio-web-fonts>` element from
validated normalized faces. It removes stale rules when sources are disabled,
edited, or deleted. Loading status is checked through the CSS Font Loading API
when available.

Before capture/export code is added or invoked, it must wait for
`document.fonts.ready` and explicitly load the family/weight combinations used
by the document. A failed remote font must fall back cleanly without blocking
the editor.

## Font Selection UI

- Replace duplicated hard-coded font `<select>` elements with a shared font
  options helper/component.
- Keep built-in fallback stacks.
- Append family names derived from enabled custom font sources.
- Use the same options for Cards text and Timetable text.
- Preserve a saved family value even if its source is disabled or temporarily
  fails, and label it as unavailable instead of silently rewriting styles.
- Keep numeric font-weight editing so imported 100-900 faces can be selected.

## Toolbar Cleanup

Keep permanently visible:

- template selector
- explicit database load action while selection does not auto-load
- Save draft
- Publish
- Cards/Timetable switch
- canvas size, as a clickable shortcut to Canvas settings
- zoom and Fit
- Preview and published Share/open action
- Settings gear

Move into Settings:

- Local DB / Remote DB text badge
- theme toggle
- JSON import/export
- object and input counts

Remove or make contextual:

- static `Studio Draft` label
- show dirty/saving/saved/error status only when it conveys current state

Do not combine Save, Publish, Preview, and Share because they have distinct
persistence semantics. Their labels/tooltips should state those semantics.

## Implementation Order

1. Add web-font types, parser, normalizer, and validation tests/checks.
2. Add shared font loader and shared font options.
3. Mount the loader in editor and saved preview/runtime surfaces.
4. Add the Settings drawer shell.
5. Move Cards canvas controls and add Timetable canvas controls.
6. Add the Fonts manager using the parser.
7. Move Data, Appearance, Environment, and document-info controls.
8. Clean up the toolbar and add contextual save status.
9. Verify database save/reload and preview parity.

## Acceptance Criteria

- A user can paste the supplied Pretendard CSS containing nine `@font-face`
  blocks without manually converting it.
- The parser reports `Pretendard` with weights 100-900.
- Pretendard can be selected for Cards and Timetable text.
- Each selected weight renders in the editor and saved preview.
- Font configuration survives `Cmd+S`, page reload, and local DB reload.
- Existing documents without font resources still render unchanged.
- Arbitrary CSS selectors cannot be injected through the font input.
- Timetable canvas size and background can be changed without editing JSON or
  the database directly.
- Cards canvas size remains editable after its controls move to Settings.
- Toolbar status text and low-frequency utilities are moved as specified.
- Undo/redo still tracks canvas and font-document changes.
- TypeScript and production build pass.
- Template Studio persistence/API checks pass against local Supabase.

## Verification Commands

```bash
npx tsc --noEmit --pretty false --incremental false
npm run build
npm run check:template-studio:persistence
npm run check:template-studio:api
```

Also perform browser checks against local Supabase for editor save/reload,
Cards and Timetable rendering, draft preview, published preview, invalid CSS,
and a remote-font load failure.
