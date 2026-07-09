# Template Studio R2 Asset Sync Plan

Last updated: 2026-07-09

## Recovery Note

If Codex context is compacted while this work is in progress, read this document again before continuing. This document is the source of truth for the Template Studio asset sync implementation.

## Goal

Template Studio document assets must use Cloudflare R2 as the canonical storage. Supabase should store only asset metadata. Preview should not create duplicate template assets. Before opening Preview, Save Draft, or Publish, the editor should sync local document assets against remote metadata and only upload assets that are missing or stale.

Runtime input images used only for preview form data are separate from canonical template document assets. They may continue to use preview-temporary upload behavior unless explicitly promoted to template assets.

## Current State

- `StudioAsset` already has `src`, `storagePath`, `mimeType`, and `byteSize`.
- `template_studio_assets` stores metadata keyed by `template_id + asset_id`.
- The current Template Studio permanent asset upload route uses Supabase Storage (`template-studio-assets` bucket).
- The current upload route creates a new random storage path for every upload.
- Template detail API currently returns template document/draft/revision state, but not the asset metadata list.
- Preview currently uploads `data:image/...` document assets into preview-temporary R2 storage using a new `previewId` per open.

## Target Architecture

R2 is the canonical object store:

- R2 object key: `{assetBasePrefix}/{templateId}/assets/{assetId}/{contentHash}.{extension}`
  - local/dev default: `template-studio/dev`
  - production default: `template-studio`
  - override: `TEMPLATE_STUDIO_ASSET_R2_BASE_PREFIX`
- Public URL: derived from the R2 public base URL and object key.
- Supabase table `template_studio_assets`: metadata registry only.
- Client document asset state stores the latest remote URL and metadata.

Supabase metadata should include:

- `storage_provider`: fixed to `r2` for new Template Studio assets
- `storage_path`: R2 object key
- `public_url`: resolved public R2 URL
- `content_hash`: SHA-256 hex hash of the uploaded asset bytes
- `mime_type`
- `byte_size`
- `width`, `height` when available
- `last_synced_at`

## Sync Rules

For each `document.assets[assetId]`:

1. If `src` is a `data:` URL, parse bytes and compute SHA-256.
2. Compare local metadata with remote metadata by:
   - `assetId`
   - `contentHash`
   - `mimeType`
   - `byteSize`
3. If all match and remote has a usable `publicUrl`, skip upload and update local `src` to that URL if needed.
4. If metadata is missing or stale, upload to R2 with deterministic object key.
5. Upsert Supabase metadata by `template_id + asset_id`.
6. Update editor document state with the returned URL and metadata.

The server must recompute the SHA-256 hash from received bytes and not trust client-provided hash as authoritative.

## API Plan

### 1. Metadata Migration

Add nullable columns to `template_studio_assets`:

- `storage_provider TEXT`
- `public_url TEXT`
- `content_hash TEXT`
- `last_synced_at TIMESTAMPTZ`

Add indexes for:

- `(template_id, content_hash)`
- `(storage_provider)`

Keep columns nullable for compatibility with existing local/remote rows.

### 2. Persistence Service

Update `TemplateStudioAssetRecord` and row mappings.

Add:

- `listTemplateStudioAssetMetadata(templateId)`
- `upsertTemplateStudioAssetMetadata(...)` support for provider, public URL, content hash, and last synced timestamp.

### 3. Template Detail API

Extend `GET /api/admin/template-studio/templates/[id]` to return:

- `assets: TemplateStudioAssetRecord[]`

Update client response types accordingly.

### 4. R2 Helper

Add an R2 helper that uploads to a provided deterministic key:

- `uploadFileToR2Key(buffer, fileKey, mimeType)`

Do not use random file keys for canonical Template Studio assets.

### 5. Asset Sync API

Add or replace with:

- `POST /api/admin/template-studio/templates/[id]/assets/sync`

Payload:

```ts
{
  assets: Array<{
    assetId: string;
    label: string;
    src: string;
    localContentHash?: string;
    mimeType?: string;
    byteSize?: number;
  }>;
}
```

Response:

```ts
{
  success: true;
  templateId: string;
  assets: Array<{
    id: string;
    label: string;
    src: string;
    storagePath: string;
    storageProvider: "r2";
    publicUrl: string;
    contentHash: string;
    mimeType: string;
    byteSize: number;
    uploaded: boolean;
  }>;
}
```

Server behavior:

- Authenticate as Template Studio admin.
- Validate template existence.
- Parse supported image data URLs.
- Compute hash server-side.
- Check existing metadata for `templateId + assetId`.
- If metadata matches and object URL exists, return existing metadata without upload.
- Otherwise upload to R2 deterministic key and upsert metadata.

## Client Plan

### 1. Types and Service

Update `TemplateStudioService`:

- `TemplateStudioTemplateDetailResponse.assets`
- `syncAssets(templateId, assets)`

Add React Query mutation:

- `useSyncTemplateStudioAssets`

Invalidate:

- `queryKeys.admin.templateStudioTemplate(templateId)`

### 2. Studio Asset Type

Extend `StudioAsset`:

- `storageProvider?: "r2" | string`
- `publicUrl?: string`
- `contentHash?: string`
- `lastSyncedAt?: string`

### 3. Shared Sync Function

Replace `prepareRemoteDocumentForPersistence` with an R2-based sync function:

- `ensureTemplateStudioAssetsSynced(templateId): Promise<StudioTemplateDocument>`

It should:

- find document assets that are `data:` URLs or missing/stale metadata
- call the sync API only when needed
- update `documentRef.current`
- call `setDocument`
- return the synced document

### 4. Save Draft, Publish, Preview

All three flows should call the shared sync function:

- Save Draft
- Publish
- Open Runtime Draft Preview

Preview flow should:

1. ensure remote template ID exists
2. sync canonical document assets
3. clone synced document/runtime values
4. use preview-temporary asset upload only for runtime input images that are still `data:` URLs
5. write preview payload and open Preview

## Cleanup Strategy

Immediate deletion of old R2 objects is not part of the first implementation because old revisions may still reference previous asset URLs.

Production cleanup can safely delete R2 objects under `{assetBasePrefix}/{templateId}/assets/` only if no current document, draft, revision, or asset metadata row references the object key.

For local testing where Supabase metadata may be reset from remote dumps, cleanup should be prefix-based and ignore the DB registry. Use:

- `npm run cleanup:template-studio:r2-assets` for dry-run
- `npm run cleanup:template-studio:r2-assets -- --apply` to delete local/dev test prefixes

Default cleanup prefixes:

- preview assets: `uploads/dev/template-studio-preview/`
- canonical synced assets: `template-studio/dev/`

## Verification Checklist

- `supabase migration up --local`
- `npm run check:template-studio:persistence`
- `npm run check:template-studio:api`
- `npx tsc --noEmit --pretty false`
- Open Template Studio editor locally.
- Add an image asset and click Preview once.
- Confirm `document.assets[assetId].src` becomes an R2 URL.
- Click Preview again without changing the asset.
- Confirm no duplicate R2 object is created for the same asset hash.
- Replace the image asset and click Preview.
- Confirm only that asset receives a new content hash and R2 key.
- Confirm preview payload no longer contains `data:image` for canonical document assets.

## Implementation Order

1. Migration and persistence types.
2. R2 deterministic upload helper.
3. Asset metadata listing and template detail response.
4. Asset sync API.
5. Client service/hook/types.
6. Editor sync function.
7. Save/Publish/Preview integration.
8. Local migration and verification.
