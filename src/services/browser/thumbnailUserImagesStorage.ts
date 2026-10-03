import type { StudioRuntimeImageOverrides } from "@/utils/thumbnail-studio/runtime-image-transform";

export interface StoredThumbnailAddon {
  id: string;
  inputId: string;
  name?: string;
  blob: Blob;
  intrinsicSize: { width: number; height: number };
}
export interface StoredThumbnailUserImages {
  images: StoredThumbnailAddon[];
  overrides: StudioRuntimeImageOverrides;
}

let database: Promise<IDBDatabase> | undefined;
const open = () => {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("temis-thumbnail-user-images", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("collections");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
    });
  return database;
};
const key = (ownerId: string, templateId: string) =>
  JSON.stringify([ownerId, templateId]);

export const getThumbnailUserImages = async (
  ownerId: string,
  templateId: string,
): Promise<StoredThumbnailUserImages | undefined> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("collections")
      .objectStore("collections")
      .get(key(ownerId, templateId));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
export const putThumbnailUserImages = async (
  ownerId: string,
  templateId: string,
  value: StoredThumbnailUserImages,
): Promise<void> => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("collections", "readwrite");
    tx.objectStore("collections").put(value, key(ownerId, templateId));
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(tx.error ?? new Error("이미지 저장 공간이 부족합니다."));
  });
};
