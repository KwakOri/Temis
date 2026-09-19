# Task 9 Report

## Scope

Task 9 focused on the Figma import check and the existing asset-sync/apply boundary. The implementation plan and prior task artifacts were read:

- `docs/superpowers/plans/2026-09-10-grid-figma-component-import.md`
- `.superpowers/sdd/2026-09-10-grid-figma-component-import/task-9-brief.md`
- `.superpowers/sdd/2026-09-10-grid-figma-component-import/task-7-report.md`
- `.superpowers/sdd/2026-09-10-grid-figma-component-import/task-8-report.md`

## TDD evidence

### RED

Added focused checks in `scripts/check-template-studio-figma-import.ts` for:

- PNG, JPEG, SVG, and WebP data URLs being recognized by `planStudioAssetSync` and planned for upload.
- A candidate label containing a remote Figma URL being rejected without mutating the document.
- Temporary/remote Figma asset URLs being rejected without mutation.

Command:

```text
node --import tsx scripts/check-template-studio-figma-import.ts
```

Result before the production guard:

```text
AssertionError: A candidate containing a remote Figma URL is rejected before persistence.
true !== false
exit_code=1
```

### GREEN

Added candidate URL validation in `applyStudioFigmaGridCandidate` after the existing asset-source validation and before graph validation/draft mutation. The shared asset-sync parser already handled all four requested image types, so no asset-sync production change was needed.

Result after the guard:

```text
Figma import contract checks passed
exit_code=0
```

## Asset-sync verification

The existing parser and `planStudioAssetSync` already recognize and plan all
four supported imported data URL types, so
`src/utils/template-studio/asset-sync.ts` and
`src/hooks/studio/use-studio-template-persistence.ts` were left unchanged.

The package runner was attempted as requested:

```text
$ npm run check:studio:asset-sync
Error: listen EPERM: operation not permitted .../tsx-501/27812.pipe
exit_code=1
```

This is the sandbox TSX IPC limitation. The repository-approved fallback passed:

```text
$ node --import tsx scripts/check-studio-asset-sync.ts
Studio asset sync baseline checks passed.
exit_code=0
```

The Figma import check passed with the direct TSX invocation:

```text
$ node --import tsx scripts/check-template-studio-figma-import.ts
Figma import contract checks passed
exit_code=0
```

## Production change

Required: the candidate boundary accepted URL-bearing metadata and relied on later redaction. The guard now rejects `http(s)` and `mcp` URLs anywhere in the candidate before document mutation. Existing supported data URLs remain allowed.

The production guard is required by the RED check. The final commit title is
`fix: sync imported GRID assets through Template Studio`.
