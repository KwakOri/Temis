/**
 * 에셋 동기화 규칙의 기준선 가드.
 *
 * 문서에 사진 내용이 그대로 담긴 채로 저장되면 문서가 커져 저장이 실패하거나,
 * 열어 보는 쪽에서 사진이 나오지 않는다. 그래서 저장·발행·미리보기는 모두 사진을
 * 먼저 올려 문서에서 내용을 걷어낸다.
 *
 * 다시 올릴지는 내용 지문, 종류, 크기를 모두 견줘서 정한다. 하나라도 빠뜨리면
 * 바뀐 사진이 옛 주소에 묶인 채로 남아, 사용자는 고친 사진이 저장되지 않았다고
 * 읽는다. 반대로 늘 올리면 저장이 눈에 띄게 느려진다.
 */
import assert from "node:assert/strict";
import type {
  StudioAsset,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  applyStudioSyncedAssets,
  getStudioDataImageMetadata,
  isStudioDataImageSrc,
  parseStudioDataImageUrl,
  planStudioAssetSync,
  type StudioRemoteAssetSnapshot,
} from "../src/utils/template-studio/asset-sync";
/** 1x1 png. base64로 담긴 사진을 그대로 흉내낸다. */
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const createAsset = (overrides: Partial<StudioAsset> = {}): StudioAsset =>
  ({
    id: "asset_a",
    label: "Asset A",
    src: PNG_DATA_URL,
    ...overrides,
  }) as StudioAsset;
const createRemote = (
  overrides: Partial<StudioRemoteAssetSnapshot> = {},
): StudioRemoteAssetSnapshot => ({
  assetId: "asset_a",
  storageProvider: "r2",
  storagePath: "templates/t1/asset_a.png",
  publicUrl: "https://cdn.example.com/asset_a.png",
  contentHash: "hash_a",
  mimeType: "image/png",
  byteSize: 100,
  lastSyncedAt: "2026-07-31T00:00:00.000Z",
  ...overrides,
});
const localMetadata = {
  contentHash: "hash_a",
  mimeType: "image/png",
  byteSize: 100,
};
// --- 담긴 사진 알아보기 ---
assert.equal(
  isStudioDataImageSrc(PNG_DATA_URL),
  true,
  "문서에 내용이 담긴 사진을 알아본다.",
);
assert.equal(
  isStudioDataImageSrc("https://cdn.example.com/asset_a.png"),
  false,
  "이미 주소만 있는 사진은 올릴 것이 없다.",
);
assert.equal(
  isStudioDataImageSrc("data:text/plain;base64,aGVsbG8="),
  false,
  "사진이 아닌 것은 사진 자리에 올리지 않는다.",
);
// --- 담긴 사진 읽기 ---
const parsed = parseStudioDataImageUrl(PNG_DATA_URL);
assert.ok(parsed, "담긴 사진을 바이트로 읽는다.");
assert.equal(parsed.mimeType, "image/png", "종류를 그대로 읽는다.");
assert.equal(
  parsed.extension,
  "png",
  "저장할 때 쓸 확장자를 종류에서 정한다. 확장자가 없으면 저장한 뒤 무엇으로 읽어야 하는지 알 수 없다.",
);
assert.ok(parsed.buffer.byteLength > 0, "빈 내용은 사진이 아니다.");
assert.equal(
  parseStudioDataImageUrl("data:image/tiff;base64,AAAA"),
  null,
  "우리가 저장할 수 없는 종류는 받지 않는다.",
);
assert.equal(
  parseStudioDataImageUrl(`data:image/png;base64,`),
  null,
  "내용이 없으면 올릴 것이 없다.",
);
assert.equal(
  parseStudioDataImageUrl("https://cdn.example.com/a.png"),
  null,
  "주소만 있는 것은 읽을 내용이 없다.",
);
const checkDataImageMetadata = async () => {
  const metadata = await getStudioDataImageMetadata(PNG_DATA_URL);
  assert.ok(metadata, "담긴 사진의 지문을 읽는다.");
  assert.equal(metadata.mimeType, "image/png");
  assert.ok(metadata.byteSize > 0, "크기를 함께 읽는다.");
  assert.equal(
    metadata.contentHash?.length,
    64,
    "지문은 SHA-256 16진수다. 이 값으로 이미 올린 사진과 같은지 견준다.",
  );
  const otherMetadata = await getStudioDataImageMetadata(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
  );
  assert.notEqual(
    otherMetadata?.contentHash,
    metadata.contentHash,
    "내용이 다르면 지문도 달라야 한다.",
  );
};
// --- 다시 올릴지 정하기 ---
const planOf = (
  asset: StudioAsset,
  remoteAssets: StudioRemoteAssetSnapshot[],
  metadataByAssetId: Record<string, typeof localMetadata | null> = {},
) =>
  planStudioAssetSync({
    assets: [asset],
    remoteAssets,
    localMetadataByAssetId: metadataByAssetId,
  });
const reusePlan = planOf(createAsset(), [createRemote()], {
  asset_a: localMetadata,
});
assert.deepEqual(
  reusePlan.uploads,
  [],
  "지문·종류·크기가 모두 같으면 다시 올리지 않는다.",
);
assert.equal(reusePlan.patches.length, 1, "원격 값을 문서에 옮겨 적는다.");
assert.deepEqual(
  {
    src: reusePlan.patches[0].src,
    storagePath: reusePlan.patches[0].storagePath,
    contentHash: reusePlan.patches[0].contentHash,
  },
  {
    src: "https://cdn.example.com/asset_a.png",
    storagePath: "templates/t1/asset_a.png",
    contentHash: "hash_a",
  },
  "문서에는 원격 주소와 저장 경로가 남아야 한다. 다음 저장에서 견줄 값이 없으면 매번 다시 올린다.",
);
for (const [label, remote] of [
  ["지문이 다르면", createRemote({ contentHash: "hash_b" })],
  ["종류가 다르면", createRemote({ mimeType: "image/webp" })],
  ["크기가 다르면", createRemote({ byteSize: 200 })],
  ["원격이 다른 곳에 있으면", createRemote({ storageProvider: "supabase" })],
  ["원격 주소가 없으면", createRemote({ publicUrl: null })],
] as const) {
  assert.equal(
    planOf(createAsset(), [remote], { asset_a: localMetadata }).uploads.length,
    1,
    `${label} 다시 올린다.`,
  );
}
assert.equal(
  planOf(createAsset(), [], { asset_a: localMetadata }).uploads.length,
  1,
  "원격에 없는 사진은 올린다.",
);
assert.equal(
  planOf(createAsset(), [createRemote()], {
    asset_a: { ...localMetadata, contentHash: null } as never,
  }).uploads.length,
  1,
  "지문을 계산할 수 없으면 다시 올린다. 같은 사진을 한 번 더 올리는 것이 바뀐 사진을 안 올리는 것보다 낫다.",
);
assert.equal(
  planOf(createAsset(), [createRemote({ contentHash: null })], {
    asset_a: { ...localMetadata, contentHash: null } as never,
  }).uploads.length,
  1,
  "양쪽 지문이 모두 없으면 견줄 것이 없다. 없는 값끼리 같다고 보면 바뀐 사진을 올리지 않는다.",
);
assert.deepEqual(
  planOf(createAsset(), [createRemote()], { asset_a: localMetadata }).uploads,
  [],
  "같은 사진은 올리지 않는다.",
);
const uploadPlan = planOf(createAsset(), [], { asset_a: localMetadata });
assert.deepEqual(
  uploadPlan.uploads[0],
  {
    assetId: "asset_a",
    label: "Asset A",
    src: PNG_DATA_URL,
    localContentHash: "hash_a",
    mimeType: "image/png",
    byteSize: 100,
  },
  "올릴 때 지문을 함께 보낸다. 서버가 같은 내용을 두 번 저장하지 않도록 견주는 값이다.",
);
// 이미 주소만 있는 사진은 올리지 않지만, 원격과 같은 것이면 저장 경로를 채워 둔다.
const remoteUrlAsset = createAsset({
  src: "https://cdn.example.com/asset_a.png",
});
assert.deepEqual(
  planOf(remoteUrlAsset, [createRemote()]).uploads,
  [],
  "주소만 있는 사진은 올릴 내용이 없다.",
);
assert.equal(
  planOf(remoteUrlAsset, [createRemote()]).patches.length,
  1,
  "주소가 원격과 같으면 저장 경로를 문서에 채운다.",
);
assert.equal(
  planOf(createAsset({ src: "https://other.example.com/a.png" }), [
    createRemote(),
  ]).patches.length,
  0,
  "우리가 저장한 것이 아닌 주소는 건드리지 않는다.",
);
assert.equal(
  planOf(
    createAsset({
      src: "https://other.example.com/a.png",
      contentHash: "hash_a",
    } as Partial<StudioAsset>),
    [createRemote()],
  ).patches.length,
  1,
  "주소가 달라도 지문이 같으면 같은 사진으로 본다. 저장한 뒤 주소만 바뀐 문서가 있다.",
);
assert.equal(
  planOf(remoteUrlAsset, [createRemote({ storageProvider: "supabase" })])
    .patches.length,
  0,
  "우리가 쓰는 저장소에 있는 것만 문서에 채운다.",
);
for (const emptyHash of [null, undefined] as const) {
  assert.equal(
    planOf(createAsset({ src: "https://other.example.com/a.png" }), [
      createRemote({ contentHash: emptyHash }),
    ]).patches.length,
    0,
    "양쪽 지문이 모두 없으면 같은 사진이라고 볼 근거가 없다. 없는 값끼리 같다고 보면 엉뚱한 사진에 원격 경로가 박힌다.",
  );
}
// --- 문서에 옮겨 적기 ---
const createDocument = (assets: Record<string, StudioAsset>) =>
  ({ assets }) as unknown as StudioTemplateDocument;
const document = createDocument({ asset_a: createAsset() });
assert.equal(
  applyStudioSyncedAssets(document, reusePlan.patches),
  true,
  "옮겨 적은 것이 있으면 알린다.",
);
assert.equal(
  document.assets.asset_a.src,
  "https://cdn.example.com/asset_a.png",
  "문서에서 사진 내용을 걷어내고 주소로 바꾼다.",
);
assert.equal(
  document.assets.asset_a.label,
  "Asset A",
  "이름 같은 편집기 값은 그대로 둔다.",
);
assert.deepEqual(
  {
    storagePath: document.assets.asset_a.storagePath,
    storageProvider: document.assets.asset_a.storageProvider,
    contentHash: document.assets.asset_a.contentHash,
    publicUrl: document.assets.asset_a.publicUrl,
  },
  {
    storagePath: "templates/t1/asset_a.png",
    storageProvider: "r2",
    contentHash: "hash_a",
    publicUrl: "https://cdn.example.com/asset_a.png",
  },
  "다음 저장에서 견줄 값을 문서에 남긴다. 남기지 않으면 바뀐 것이 없어도 매번 다시 올린다.",
);
const emptyDocument = createDocument({});
assert.equal(
  applyStudioSyncedAssets(emptyDocument, reusePlan.patches),
  false,
  "문서에 없는 에셋은 되살리지 않는다. 동기화 중에 지운 사진이 문서에만 남는다.",
);
assert.deepEqual(
  Object.keys(emptyDocument.assets),
  [],
  "지운 에셋을 문서에 다시 넣지 않는다.",
);
assert.equal(
  applyStudioSyncedAssets(createDocument({ asset_a: createAsset() }), []),
  false,
  "옮겨 적을 것이 없으면 거짓을 돌려준다. 호출한 쪽이 문서를 갈아끼우지 않아 저장할 때마다 화면이 다시 그려지지 않는다.",
);
checkDataImageMetadata()
  .then(() => console.log("Studio asset sync baseline checks passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
