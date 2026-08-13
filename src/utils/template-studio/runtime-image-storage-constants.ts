// Applies independently to the source file a user picks and to the final
// cropped PNG Blob that gets written to IndexedDB — see
// docs/template-system-integration/12-user-runtime-browser-image-storage.md.
export const MAX_RUNTIME_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_RUNTIME_IMAGE_BLOB_BYTES = 20 * 1024 * 1024;

export const ALLOWED_RUNTIME_IMAGE_SOURCE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
