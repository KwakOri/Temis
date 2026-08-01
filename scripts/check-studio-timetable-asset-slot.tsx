/**
 * 시간표 이미지 자리 편집의 기준선 가드.
 *
 * 한 자리는 템플릿 에셋과 사용자 입력 중 하나만 출처로 쓴다. 출처가 없으면 Fit을
 * 바꾸지 못하고, 끊어진 에셋과 입력은 눈에 보이게 알린다. 이 규칙이 깨지면
 * 문서에 쓰이지 않는 값이 남거나 끊어진 연결이 조용히 숨는다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioStatusCardBackgroundSlot } from "../src/app/(root)/template-studio/_components/studio-status-card-background-slot";
import {
  StudioAssetSlotFields,
  type StudioAssetSlotFieldsProps,
} from "../src/app/(root)/template-studio/_components/studio-timetable-asset-slot-fields";
import type {
  StudioAsset,
  StudioImageFit,
  StudioInputDefinition,
  StudioAssetSlot,
} from "../src/types/template-studio";
const noop = () => {};

const ASSETS: StudioAsset[] = [
  { id: "asset_a", label: "Asset A", src: "a.png" },
  { id: "asset_b", label: "Asset B", src: "b.png" },
] as StudioAsset[];

const imageInput = (): StudioInputDefinition =>
  ({
    id: "input_image",
    type: "image",
    scope: "global",
    label: "Sticker",
    defaultUrl: "",
  }) as StudioInputDefinition;

const textInput = (): StudioInputDefinition =>
  ({
    id: "input_text",
    type: "text",
    scope: "global",
    label: "Memo",
    defaultValue: "",
  }) as StudioInputDefinition;

const createProps = (
  overrides: Partial<StudioAssetSlotFieldsProps> = {},
): StudioAssetSlotFieldsProps => ({
  label: "Background Asset",
  assets: ASSETS,
  boundInput: null,
  hasAsset: true,
  canUseInput: true,
  onSelectAsset: () => {},
  onSelectFit: () => {},
  onUseInputSource: () => {},
  onUploadFile: () => {},
  renderInputSourceSlot: (input) => (
    <div data-input-slot={input.id}>{input.label}</div>
  ),
  ...overrides,
});

const markupOf = (
  overrides: Partial<StudioAssetSlotFieldsProps> = {},
): string =>
  renderToStaticMarkup(<StudioAssetSlotFields {...createProps(overrides)} />);

/** 만들어진 요소 나무에서 조건에 맞는 요소를 모은다. */
const findAll = (
  node: React.ReactNode,
  match: (props: Record<string, unknown>) => boolean,
  elementType?: string,
): Array<React.ReactElement<Record<string, never>>> => {
  const found: Array<React.ReactElement<Record<string, never>>> = [];

  const visit = (current: React.ReactNode) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!React.isValidElement(current)) return;

    const props = current.props as Record<string, unknown>;
    if ((!elementType || current.type === elementType) && match(props)) {
      found.push(current as React.ReactElement<Record<string, never>>);
    }
    visit(props.children as React.ReactNode);
  };

  visit(node);
  return found;
};

// --- 출처 판단 ---

const assetSourceMarkup = markupOf({ assetId: "asset_a" });
assert.ok(
  assetSourceMarkup.includes("<span>Background Asset Source</span>"),
  "출처를 고를 수 있으면 출처 선택을 보여준다.",
);
assert.ok(
  assetSourceMarkup.includes('value="asset" selected=""'),
  "묶인 입력이 없으면 템플릿 에셋을 출처로 본다.",
);
assert.ok(
  assetSourceMarkup.includes("Upload Asset"),
  "에셋 출처에서는 새 파일을 올릴 수 있다.",
);

const inputSourceMarkup = markupOf({
  inputId: "input_image",
  boundInput: imageInput(),
});
assert.ok(
  inputSourceMarkup.includes('value="input" selected=""'),
  "묶인 입력이 있으면 사용자 입력을 출처로 본다.",
);
assert.ok(
  inputSourceMarkup.includes('data-input-slot="input_image"'),
  "묶인 입력의 편집 UI는 받은 것을 그대로 놓는다.",
);
assert.ok(
  !inputSourceMarkup.includes("Upload Asset"),
  "입력 출처에서는 에셋 올리기를 보여주지 않는다.",
);

// --- 출처 고정 ---

assert.ok(
  !markupOf({ assetId: "asset_a", sourceLocked: "asset" }).includes(
    "<span>Background Asset Source</span>",
  ),
  "출처가 고정된 자리에는 출처 선택이 없다.",
);
assert.ok(
  markupOf({ sourceLocked: "input", canUseInput: true }).includes(
    "Create user image input",
  ),
  "입력으로 고정했는데 묶인 입력이 없으면 만들도록 안내한다.",
);
assert.ok(
  !markupOf({ canUseInput: false, assetId: "asset_a" }).includes(
    "<span>Background Asset Source</span>",
  ),
  "입력을 쓸 수 없는 자리에는 출처 선택이 없다.",
);

// --- 끊어진 연결 ---

const missingAssetMarkup = markupOf({ assetId: "gone", hasAsset: false });
assert.ok(
  missingAssetMarkup.includes("Missing asset"),
  "문서에 없는 에셋을 가리키면 끊어졌다고 알린다.",
);
assert.ok(
  !markupOf({ assetId: "asset_a" }).includes("Missing asset"),
  "있는 에셋에는 끊어짐 표시를 붙이지 않는다.",
);

const missingInputMarkup = markupOf({
  inputId: "gone",
  boundInput: null,
  canUseInput: false,
});
assert.ok(
  missingInputMarkup.includes("Missing image input: gone"),
  "없는 입력을 가리키면 어떤 입력인지 함께 알린다.",
);

const wrongTypeMarkup = markupOf({
  inputId: "input_text",
  boundInput: textInput(),
  canUseInput: false,
});
assert.ok(
  wrongTypeMarkup.includes("Missing image input: input_text"),
  "이미지가 아닌 입력에 묶였으면 끊어진 것으로 본다.",
);

// --- Fit ---

assert.ok(
  markupOf({ assetId: "asset_a" }).includes('value="cover" selected=""'),
  "Fit을 정하지 않으면 기본값을 보여준다.",
);
assert.ok(
  markupOf({ assetId: "asset_a", fit: "contain" }).includes(
    'value="contain" selected=""',
  ),
  "정한 Fit을 보여준다.",
);
assert.ok(
  markupOf({ assetId: "asset_a", defaultFit: "fill" }).includes(
    'value="fill" selected=""',
  ),
  "자리마다 다른 기본 Fit을 쓸 수 있다.",
);

const noSourceMarkup = markupOf();
assert.ok(
  noSourceMarkup.includes('disabled=""'),
  "출처가 없으면 Fit을 바꾸지 못한다. 쓰이지 않는 값이 문서에 남으면 안 된다.",
);
assert.ok(
  !markupOf({ assetId: "asset_a" }).includes('disabled=""'),
  "출처가 있으면 Fit을 바꿀 수 있다.",
);

// 고를 에셋이 하나도 없으면 에셋 선택 자체를 막는다.
//
// Fit 잠금과 헷갈리지 않게 잠긴 칸 수로 확인한다.

const countDisabled = (markup: string): number =>
  (markup.match(/disabled=""/g) ?? []).length;

assert.equal(
  countDisabled(markupOf({ assets: [] })),
  2,
  "에셋이 없고 출처도 없으면 에셋 선택과 Fit이 모두 잠긴다.",
);
assert.equal(
  countDisabled(markupOf({ assets: [], assetId: "gone", hasAsset: false })),
  0,
  "이미 가리키는 에셋이 있으면 선택을 열어 둔다. 끊어진 연결을 고칠 수 있어야 한다.",
);
assert.equal(
  countDisabled(markupOf({ assetId: "asset_a" })),
  0,
  "에셋이 있으면 아무 칸도 잠기지 않는다.",
);

// --- 조작이 나가는 경로 ---

const calls = {
  assets: [] as Array<string | null>,
  fits: [] as StudioImageFit[],
  useInput: 0,
  uploads: [] as string[],
};

const element = StudioAssetSlotFields(
  createProps({
    assetId: "asset_a",
    onSelectAsset: (assetId) => calls.assets.push(assetId),
    onSelectFit: (fit) => calls.fits.push(fit),
    onUseInputSource: () => {
      calls.useInput += 1;
    },
    onUploadFile: (file) => calls.uploads.push(file.name),
  }),
);

const selects = findAll(element, () => true, "select");
assert.equal(selects.length, 3, "출처, 에셋, Fit 세 선택이 있다.");

const [sourceSelect, assetSelect, fitSelect] = selects as unknown as Array<
  React.ReactElement<{ onChange: (event: unknown) => void }>
>;

sourceSelect.props.onChange({ currentTarget: { value: "input" } });
assert.equal(
  calls.useInput,
  1,
  "출처를 사용자 입력으로 바꾸면 입력을 만들어 묶는다.",
);

sourceSelect.props.onChange({ currentTarget: { value: "asset" } });
assert.deepEqual(
  calls.assets,
  ["asset_a"],
  "출처를 에셋으로 되돌리면 지금 에셋을 그대로 다시 저장한다.",
);

assetSelect.props.onChange({ currentTarget: { value: "asset_b" } });
assetSelect.props.onChange({ currentTarget: { value: "" } });
assert.deepEqual(
  calls.assets.slice(1),
  ["asset_b", null],
  "에셋을 비우면 없음으로 저장한다.",
);

fitSelect.props.onChange({ currentTarget: { value: "contain" } });
assert.deepEqual(calls.fits, ["contain"], "고른 Fit을 넘긴다.");

// 파일 선택은 같은 파일을 다시 골라도 잡히도록 값을 비운다.
const fileInput = findAll(
  element,
  (props) => props.type === "file",
  "input",
).at(0) as unknown as React.ReactElement<{
  onChange: (event: unknown) => void;
}>;

const target = { files: [{ name: "sticker.png" }], value: "sticker.png" };
fileInput.props.onChange({ currentTarget: target });
assert.deepEqual(calls.uploads, ["sticker.png"], "고른 파일을 넘긴다.");
assert.equal(
  target.value,
  "",
  "같은 파일을 다시 골라도 변경으로 잡히게 값을 비운다.",
);

const emptyTarget = { files: [] as unknown[], value: "" };
fileInput.props.onChange({ currentTarget: emptyTarget });
assert.deepEqual(
  calls.uploads,
  ["sticker.png"],
  "파일을 고르지 않으면 아무것도 하지 않는다.",
);

// --- 상태 카드 배경 자리 ---
//
// 카드는 상태마다 배경이 다르다. 어느 상태를 편집하는 중인지 자리 위에 없으면
// 온라인 배경을 고치려다 오프라인 배경을 바꾼다.
//
// 이 자리는 시간표 이미지 자리와 같은 칸을 쓴다. 예전에는 같은 칸을 각각
// 그렸고 그래서 한쪽만 고쳐지는 일이 있었다.
const statusSlotCalls: {
  assets: Array<[string | null, StudioImageFit]>;
  fits: StudioImageFit[];
  uploads: string[];
} = { assets: [], fits: [], uploads: [] };
const statusSlotElement = (
  <StudioStatusCardBackgroundSlot
    assets={ASSETS}
    hasAsset
    slot={{ assetId: "asset_a", fit: "contain" } as StudioAssetSlot}
    statusLabel="Online"
    onSelectAsset={(assetId, fit) =>
      statusSlotCalls.assets.push([assetId, fit])
    }
    onSelectFit={(fit) => statusSlotCalls.fits.push(fit)}
    onUploadFile={(file) => statusSlotCalls.uploads.push(file.name)}
  />
);
const statusSlotMarkup = renderToStaticMarkup(statusSlotElement);
assert.ok(
  statusSlotMarkup.includes("Online layout"),
  "지금 편집 중인 상태를 자리 위에 적는다.",
);
assert.equal(
  statusSlotMarkup.includes("Source</span>"),
  false,
  "카드 배경은 사용자 입력을 출처로 쓸 수 없다. 사용자가 바꾸는 것은 일정 내용이고 배경은 템플릿이 정한다.",
);
assert.ok(
  statusSlotMarkup.includes("Upload Asset"),
  "배경도 새 파일을 올릴 수 있다.",
);
assert.ok(
  statusSlotMarkup.includes('value="contain" selected=""'),
  "저장해 둔 Fit이 고른 상태로 보여야 한다.",
);
assert.ok(
  statusSlotMarkup.includes(">Asset A</option>"),
  "고를 수 있는 템플릿 에셋을 보여준다.",
);
assert.equal(
  renderToStaticMarkup(
    <StudioStatusCardBackgroundSlot
      assets={ASSETS}
      hasAsset={false}
      slot={{ assetId: "asset_missing" } as StudioAssetSlot}
      statusLabel="Offline"
      onSelectAsset={noop}
      onSelectFit={noop}
      onUploadFile={noop}
    />,
  ).includes(">Missing asset</option>"),
  true,
  "문서에서 사라진 에셋은 끊어진 것으로 알린다.",
);
assert.ok(
  renderToStaticMarkup(
    <StudioStatusCardBackgroundSlot
      assets={ASSETS}
      hasAsset={false}
      slot={null}
      statusLabel="Offline"
      onSelectAsset={noop}
      onSelectFit={noop}
      onUploadFile={noop}
    />,
  ).includes('disabled=""'),
  "배경을 고르지 않았으면 Fit을 바꿀 수 없다. 쓰이지 않는 값이 문서에 남는다.",
);
// 두 자리가 같은 칸을 쓰는지는 넘기는 props로 본다. 마크업만 보면 비슷하게
// 생긴 칸을 따로 그려도 통과한다.
const statusSlotTree = StudioStatusCardBackgroundSlot(
  statusSlotElement.props as React.ComponentProps<
    typeof StudioStatusCardBackgroundSlot
  > satisfies React.ComponentProps<typeof StudioStatusCardBackgroundSlot>,
);
const sharedFieldsProps = findAll(
  statusSlotTree,
  (props) => "canUseInput" in props,
)[0]?.props as unknown as StudioAssetSlotFieldsProps | undefined;
assert.ok(
  sharedFieldsProps,
  "상태 카드 배경 자리는 시간표 이미지 자리와 같은 칸을 쓴다.",
);
assert.equal(
  sharedFieldsProps.canUseInput,
  false,
  "카드 배경 자리에는 사용자 입력을 쓸 수 없다고 칸에 알린다.",
);
assert.equal(
  sharedFieldsProps.fit,
  "contain",
  "저장해 둔 Fit을 칸에 그대로 넘긴다.",
);
// 에셋을 바꿀 때 지금 Fit을 함께 넘겨야 한다. 넘기지 않으면 저장해 둔 Fit이
// 기본값으로 돌아간다.
sharedFieldsProps.onSelectAsset("asset_b");
assert.deepEqual(
  statusSlotCalls.assets,
  [["asset_b", "contain"]],
  "에셋을 바꿀 때 저장해 둔 Fit을 함께 넘긴다.",
);
sharedFieldsProps.onSelectFit("fill");
assert.deepEqual(
  statusSlotCalls.fits,
  ["fill"],
  "Fit만 바꾸는 길도 이어져 있다.",
);
console.log("Studio timetable asset slot baseline checks passed.");
