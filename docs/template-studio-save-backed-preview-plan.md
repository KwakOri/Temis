# Template Studio Save-Backed Preview Plan

Last updated: 2026-07-10

## Recovery Note

If Codex context is compacted while this work is in progress, read this document before continuing. This document defines the intended preview flow and supersedes any earlier idea that draft preview should be transported by a random `previewKey` query string.

## Goal

Unify Template Studio preview around a resource-scoped route:

```text
/admin/template-studio/{templateId}/preview
```

Preview should be backed by remote draft/template state, not by browser storage keyed through `previewKey`. When the editor opens Preview, it should first persist the current editor state and synchronize assets as needed, then navigate to the preview route without query parameters.

## Current Problem

The current draft/runtime preview flow writes a full preview payload to browser storage and opens:

```text
/admin/template-studio/preview?previewKey=...
```

This creates a second preview route and makes preview depend on an opaque client-side key. It also does not match the intended save/sync-based asset architecture.

## Intended Flow

When the user clicks Preview from the editor:

1. Ensure a remote template exists.
2. Compare local document assets with remote asset metadata.
3. For unchanged assets, do not upload image bytes. Persist only document/runtime metadata as needed.
4. For changed or new assets, upload the changed image bytes to R2, then upsert Supabase asset metadata.
5. For removed assets, remove references from the draft document. R2 deletion should stay cleanup-based, not immediate, because old revisions may still reference old files.
6. Save the current document/runtime values to the remote draft.
7. Open:

```text
/admin/template-studio/{templateId}/preview
```

The preview page should load by `templateId` and render the saved draft when present. If no draft exists, it can fall back to the published document.

## Route Plan

Keep:

```text
/admin/template-studio/{templateId}/edit
/admin/template-studio/{templateId}/preview
```

Remove:

```text
/admin/template-studio/preview
/template-studio/preview
/template-studio/preview/{templateId}
```

Do not introduce a compatibility redirect for these legacy routes during the test phase.

## Data Model Assessment

The core flow should work with the existing tables:

- `template_studio_document_drafts`
  - stores editor draft document/runtime values
  - sufficient for previewing unsent/pending editor state after Preview triggers a draft save
- `template_studio_documents`
  - stores published current document
- `template_studio_document_revisions`
  - stores published revision history
- `template_studio_assets`
  - stores R2 asset metadata
  - already includes provider/path/public URL/content hash/MIME/byte size/last synced metadata

No additional table is required for the first implementation.

Potential future DB changes only if needed:

- asset version/history table for safe old-object deletion
- explicit draft snapshot table if Preview must be isolated from normal draft state
- edit-session or lock table if concurrent admin editing becomes important

## Asset Sync Rules

Separate metadata persistence from image-byte upload:

### Metadata-only path

Use this when asset bytes are unchanged:

- local asset has matching `assetId`, `contentHash`, `mimeType`, and `byteSize`
- remote `template_studio_assets` row has the same values
- document/runtime values may still be saved to draft
- no R2 upload occurs

### R2 upload path

Use this when:

- local asset is a `data:` image
- local hash differs from remote metadata
- remote metadata is missing
- remote object is missing and needs repair

Then:

- upload bytes to R2 under the configured Template Studio asset prefix
- upsert `template_studio_assets`
- update `document.assets[assetId]` to the returned R2 URL and metadata
- save the updated document/runtime values to the draft

### Delete path

When an asset is removed from the editor:

- remove it from `document.assets`
- save the draft
- do not immediately delete R2 objects
- rely on R2 prefix cleanup during local testing
- add production-safe orphan cleanup later if needed

## Implementation Plan

1. Revert any draft-preview transport that still depends on `previewKey`.
2. Update the editor Preview button:
   - `ensureRemoteTemplateId()`
   - `ensureTemplateStudioAssetsSynced(templateId)`
   - `saveTemplateStudioDraftMutation.mutateAsync(...)`
   - open `/admin/template-studio/${templateId}/preview`
3. Update `/admin/template-studio/{templateId}/preview`:
   - fetch template detail/admin data by `templateId`
   - render draft document/runtime if draft exists
   - otherwise render published document/runtime
   - show a clear empty state if neither exists
4. Remove draft preview storage usage from route rendering.
5. Remove obsolete route files listed above.
6. Keep preview-temp R2 asset upload only if runtime input images still need transient upload; otherwise prefer saved draft/runtime values with R2-backed URLs.
7. Verify:
   - typecheck
   - Template Studio persistence check
   - Template Studio API check
   - editor Preview opens `/admin/template-studio/{templateId}/preview` without query params
   - repeated Preview with unchanged assets does not upload duplicate R2 objects

## Open Decisions

- Runtime input images may need the same hash-based sync treatment if they are intended to be part of saved preview state.
- Published user-facing route can remain admin-scoped for now; a public non-admin route can be designed later.
