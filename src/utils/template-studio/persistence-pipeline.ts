import type { TemplateStudioUploadedAsset } from "@/services/templateStudioService";
import type { StudioTemplateDocument } from "@/types/template-studio";
import { applyStudioSyncedAssets } from "@/utils/template-studio/asset-sync";

export const cloneStudioTemplateDocument = (
  document: StudioTemplateDocument,
): StudioTemplateDocument =>
  JSON.parse(JSON.stringify(document)) as StudioTemplateDocument;

/**
 * 비동기 asset 작업이 끝난 뒤에도 현재 편집 중인 문서 위에 결과를 얹는다.
 *
 * 저장을 시작할 때 잡은 문서를 그대로 되돌려 쓰면 asset 작업 중 발생한
 * 이름 변경·레이아웃 변경까지 함께 사라질 수 있다. 항상 최신 문서를 복제한
 * 뒤 asset patch만 적용해야 한다.
 */
export const mergeStudioSyncedAssetsIntoLatestDocument = (input: {
  latestDocument: StudioTemplateDocument;
  patches: TemplateStudioUploadedAsset[];
}): { document: StudioTemplateDocument; changed: boolean } => {
  const document = cloneStudioTemplateDocument(input.latestDocument);
  const changed = applyStudioSyncedAssets(document, input.patches);
  return { document, changed };
};

export interface StudioPersistenceGate {
  isBusy: () => boolean;
  runExclusive: <T>(operation: () => Promise<T>) => Promise<T | undefined>;
}

/** 저장·발행·미리보기의 중복 실행을 막는 작은 single-flight 게이트. */
export const createStudioPersistenceGate = (): StudioPersistenceGate => {
  let busy = false;

  return {
    isBusy: () => busy,
    runExclusive: async <T>(operation: () => Promise<T>) => {
      if (busy) return undefined;
      busy = true;
      try {
        return await operation();
      } finally {
        busy = false;
      }
    },
  };
};
