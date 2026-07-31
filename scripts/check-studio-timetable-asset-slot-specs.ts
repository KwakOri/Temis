/**
 * 시간표 이미지 자리 매핑의 기준선 가드.
 *
 * 어떤 자리를 읽고 쓰는지, 출처를 고정하는지, 기본 Fit이 무엇인지를 값으로
 * 고정한다. 자리 이름이 어긋나면 편집한 값이 화면에 반영되지 않고, 출처 고정이
 * 풀리면 사용자 사진 자리에 템플릿 에셋이 박힌다.
 */
import assert from "node:assert/strict";

import type { StudioTimetableCompositionObject } from "../src/types/template-studio";
import {
  resolveStudioTimetableAssetSlotSpec,
  type StudioTimetableAssetSlotKind,
} from "../src/utils/template-studio/timetable-asset-slot-specs";

const createObject = (
  overrides: Partial<StudioTimetableCompositionObject> = {},
): StudioTimetableCompositionObject =>
  ({
    id: "object",
    kind: "image",
    label: "Object",
    style: {},
    ...overrides,
  }) as StudioTimetableCompositionObject;

/** spec대로 문서를 바꾼 뒤 객체에 남은 자리를 본다. */
const applyAsset = (
  kind: StudioTimetableAssetSlotKind,
  object: StudioTimetableCompositionObject,
  assetId: string | null,
  fit: "cover" | "contain" | "fill" = "cover",
): StudioTimetableCompositionObject => {
  const spec = resolveStudioTimetableAssetSlotSpec(object, kind);
  spec.onUpdateAsset(object, assetId, fit);
  return object;
};

const applyInput = (
  kind: StudioTimetableAssetSlotKind,
  object: StudioTimetableCompositionObject,
  inputId: string,
  fit: "cover" | "contain" | "fill" = "cover",
): StudioTimetableCompositionObject => {
  const spec = resolveStudioTimetableAssetSlotSpec(object, kind);
  if (!spec.onUpdateInput) throw new Error(`${kind}: 입력으로 바꿀 수 없다`);
  spec.onUpdateInput(object, inputId, fit);
  return object;
};

// --- 자리 이름 ---

assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "background").label,
  "Background Asset",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "profileImage").label,
  "Profile Image",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "profileFrame").label,
  "Frame Asset",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "topObject").label,
  "Object Asset",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "board").label,
  "Board Image",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "artistProfileText")
    .label,
  "Text Asset",
);

// 프로필 자식은 역할에 따라 이름이 달라진다.
assert.equal(
  resolveStudioTimetableAssetSlotSpec(
    createObject({ profileRole: "backPlate" } as never),
    "profileChild",
  ).label,
  "Back Plate Asset",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(
    createObject({ profileRole: "frame" } as never),
    "profileChild",
  ).label,
  "Frame Asset",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(
    createObject({ profileRole: "userImage" } as never),
    "profileChild",
  ).label,
  "User Image",
);

// --- 지금 값을 읽는 자리 ---

const readObject = createObject({
  assetSlots: {
    background: { assetId: "bg", fit: "contain" },
    profileImage: { assetId: "photo" },
    profileFrame: { inputId: "input_frame", fit: "fill" },
    asset: { assetId: "generic", fit: "cover" },
  },
} as never);

assert.equal(
  resolveStudioTimetableAssetSlotSpec(readObject, "background").assetId,
  "bg",
  "배경 자리의 값을 읽는다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(readObject, "background").fit,
  "contain",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(readObject, "profileImage").assetId,
  "photo",
  "프로필 사진 자리의 값을 읽는다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(readObject, "profileFrame").inputId,
  "input_frame",
  "묶인 입력도 읽는다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(readObject, "board").assetId,
  "generic",
  "이름 없는 자리는 asset을 쓴다.",
);

// 예전 문서는 자리 대신 객체에 직접 값을 두었다.
const legacyObject = createObject({
  backgroundAssetId: "legacy",
  backgroundFit: "fill",
} as never);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(legacyObject, "background").assetId,
  "legacy",
  "예전 문서의 배경 값도 읽는다. 안 읽으면 기존 템플릿의 배경이 사라진다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(legacyObject, "background").fit,
  "fill",
);

// --- 기본 Fit ---

const defaultFitOf = (kind: StudioTimetableAssetSlotKind) =>
  resolveStudioTimetableAssetSlotSpec(createObject(), kind).defaultFit;

assert.equal(
  defaultFitOf("profileFrame"),
  "contain",
  "테두리는 잘리면 안 되므로 안쪽에 맞춘다.",
);
assert.equal(defaultFitOf("topObject"), "contain");
assert.equal(defaultFitOf("artistProfileText"), "contain");
assert.equal(
  defaultFitOf("structuredBackground"),
  "cover",
  "배경은 빈 곳이 없도록 채운다.",
);
assert.equal(defaultFitOf("board"), "cover");
assert.equal(
  defaultFitOf("background"),
  undefined,
  "배경 자리는 컨트롤의 기본값을 그대로 쓴다.",
);

assert.equal(
  resolveStudioTimetableAssetSlotSpec(
    createObject({ profileRole: "userImage" } as never),
    "profileChild",
  ).defaultFit,
  "cover",
  "사용자 사진은 자리를 채운다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(
    createObject({ profileRole: "frame" } as never),
    "profileChild",
  ).defaultFit,
  "contain",
  "테두리는 안쪽에 맞춘다.",
);

// --- 출처 고정 ---

assert.equal(
  resolveStudioTimetableAssetSlotSpec(
    createObject({ profileRole: "userImage" } as never),
    "profileChild",
  ).sourceLocked,
  "input",
  "사용자 사진 자리는 입력으로 고정한다. 템플릿 에셋이 박히면 발행 후에도 남는다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(
    createObject({ profileRole: "frame" } as never),
    "profileChild",
  ).sourceLocked,
  "asset",
  "테두리는 템플릿이 정하므로 에셋으로 고정한다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "structuredBackground")
    .sourceLocked,
  "asset",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "board").sourceLocked,
  "asset",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "background")
    .sourceLocked,
  undefined,
  "배경은 사용자 입력과 템플릿 에셋 중 고를 수 있다.",
);

// --- 사용자 입력으로 바꿀 수 있는 자리 ---

const canUseInput = (
  kind: StudioTimetableAssetSlotKind,
  object = createObject(),
) => Boolean(resolveStudioTimetableAssetSlotSpec(object, kind).onUpdateInput);

assert.equal(canUseInput("background"), true);
assert.equal(canUseInput("profileImage"), true);
assert.equal(canUseInput("profileFrame"), true);
assert.equal(canUseInput("topObject"), true);
assert.equal(canUseInput("artistProfileText"), true);
assert.equal(
  canUseInput("structuredBackground"),
  false,
  "구조 배경은 사용자 입력을 받지 않는다.",
);
assert.equal(canUseInput("board"), false, "판 이미지는 템플릿이 정한다.");
assert.equal(
  canUseInput("profileChild", createObject({ profileRole: "frame" } as never)),
  false,
  "테두리는 사용자 입력을 받지 않는다.",
);
assert.equal(
  canUseInput(
    "profileChild",
    createObject({ profileRole: "userImage" } as never),
  ),
  true,
  "사용자 사진 자리는 입력만 받는다.",
);

// --- 어떤 자리에 쓰는지 ---

const written = applyAsset("profileImage", createObject(), "next", "contain");
assert.deepEqual(
  written.assetSlots?.profileImage,
  { assetId: "next", fit: "contain" },
  "프로필 사진은 profileImage 자리에 쓴다.",
);
assert.equal(
  written.assetSlots?.asset,
  undefined,
  "다른 자리를 건드리지 않는다.",
);

assert.deepEqual(
  applyAsset("profileFrame", createObject(), "frame").assetSlots?.profileFrame,
  { assetId: "frame", fit: "cover" },
  "테두리는 profileFrame 자리에 쓴다.",
);

for (const kind of [
  "profileChild",
  "structuredBackground",
  "topObject",
  "board",
  "artistProfileText",
] as StudioTimetableAssetSlotKind[]) {
  const object = applyAsset(kind, createObject(), "shared");
  assert.deepEqual(
    object.assetSlots?.asset,
    { assetId: "shared", fit: "cover" },
    `${kind}는 asset 자리를 쓴다.`,
  );
}

const inputWritten = applyInput(
  "topObject",
  createObject(),
  "input_1",
  "contain",
);
assert.equal(
  inputWritten.assetSlots?.asset?.inputId,
  "input_1",
  "입력으로 바꾸면 같은 자리에 입력을 쓴다.",
);
assert.equal(inputWritten.assetSlots?.asset?.fit, "contain");

// --- 사용자 입력 이름 ---
//
// 입력을 새로 만들 때 붙는 이름이라, 자리마다 달라야 사람이 구분할 수 있다.

const inputLabels = (
  [
    "background",
    "profileImage",
    "profileFrame",
    "topObject",
    "artistProfileText",
  ] as StudioTimetableAssetSlotKind[]
).map(
  (kind) =>
    resolveStudioTimetableAssetSlotSpec(createObject(), kind).inputLabel,
);

assert.ok(
  inputLabels.every(Boolean),
  "사용자 입력을 받는 자리에는 만들 입력의 이름이 있다.",
);
assert.equal(
  new Set(inputLabels).size,
  inputLabels.length,
  "자리마다 다른 입력 이름을 쓴다. 같으면 입력 목록에서 구분되지 않는다.",
);
assert.equal(
  resolveStudioTimetableAssetSlotSpec(createObject(), "board").inputLabel,
  undefined,
  "사용자 입력을 받지 않는 자리에는 입력 이름이 없다.",
);

console.log("Studio timetable asset slot spec baseline checks passed.");
