/**
 * 시간표 인스펙터 섹션 구성의 기준선 가드.
 *
 * 무엇을 골랐을 때 어떤 섹션이 어떤 순서로 보이는지를 고정한다. 순서가 바뀌면
 * 편집 흐름이 달라지고, 조건이 어긋나면 편집할 수 없는 값이 나타나거나 필요한
 * 편집기가 사라진다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildStudioTimetableInspectorSections,
  type StudioTimetableInspectorModel,
} from "../src/app/(root)/template-studio/_components/studio-timetable-inspector";
import type { StudioPropertyItem } from "../src/components/studio/editor-shell/studio-properties-panel";
import type {
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
} from "../src/types/template-studio";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "../src/utils/template-studio/timetable-composition";
import { resolveStudioTimetableSelection } from "../src/utils/template-studio/timetable-selection";

const createObject = (
  id: string,
  overrides: Partial<StudioTimetableCompositionObject> = {},
): StudioTimetableCompositionObject =>
  ({
    id,
    kind: "text",
    label: id,
    style: {},
    ...overrides,
  }) as StudioTimetableCompositionObject;

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 100, height: 100, background: "#fff" },
    graph: { rootNodeIds: [], nodes: {} },
    inputs: {
      input_text: {
        id: "input_text",
        type: "text",
        scope: "entry",
        label: "Memo",
        defaultValue: "",
      },
    },
    styles: {},
    assets: {},
    domains: {
      timetable: {
        dayIds: ["mon"],
        days: {
          mon: {
            id: "mon",
            label: "Monday",
            shortLabel: "Mon",
            componentId: "card",
          },
        },
        entryComponentId: "card",
        components: {
          card: {
            id: "card",
            label: "Card",
            defaultStatusId: "online",
            variants: { online: { rootNodeId: "card_root" } },
          },
        },
        statuses: { online: { id: "online", label: "Online" } },
        dayCardsLayout: { gridPreset: "1x7", columns: 7, rows: 1, dayGap: 12 },
      },
    },
  }) as unknown as StudioTemplateDocument;

interface BuildOptions {
  objects?: StudioTimetableCompositionObject[];
  overrides?: Partial<StudioTimetableInspectorModel>;
  document?: StudioTemplateDocument;
}

const build = (
  selectedLayerId: string | null,
  {
    objects = [],
    overrides = {},
    document = createDocument(),
  }: BuildOptions = {},
): StudioPropertyItem[] => {
  const composition = {
    rootObjectIds: objects.map((object) => object.id),
    objects: Object.fromEntries(objects.map((object) => [object.id, object])),
  } as unknown as StudioTimetableComposition;

  return buildStudioTimetableInspectorSections({
    activeRuntimeDayLabel: "Monday",
    activeRuntimeEntry: null,
    activeRuntimeEntryIndex: 0,
    componentOptions: Object.values(
      document.domains?.timetable?.components ?? {},
    ),
    dayCardsLayout: document.domains?.timetable?.dayCardsLayout ?? null,
    days: [{ id: "mon", label: "Monday", shortLabel: "Mon" }],
    document,
    fontFamilies: ["Inter"],
    getEntryCardSize: () => ({ width: 100, height: 200 }),
    isSectionOpen: () => true,
    layerGeometry: { left: 10, top: 20, width: 30, height: 40 },
    renderAssetSlot: (object, kind) => (
      <div data-asset-slot={kind} data-object={object.id} />
    ),
    renderInputSourceSlot: (input) => <div data-input-slot={input.id} />,
    renderPreviewInputs: () => <div data-preview-inputs="" />,
    selectedLayerId,
    selectedLayerLabel: selectedLayerId ?? "Timetable Composition",
    selection: resolveStudioTimetableSelection(
      document,
      composition,
      selectedLayerId,
    ),
    onAssignComponentSet: () => {},
    onToggleFitParent: () => {},
    onToggleSection: () => {},
    onUpdateDayCardsLayout: () => {},
    onUpdateLayerPosition: () => {},
    onUpdateObject: () => {},
    ...overrides,
  });
};

const sectionIds = (sections: StudioPropertyItem[]): string[] =>
  sections.map((section) => section.id);

const findSection = (
  sections: StudioPropertyItem[],
  idPrefix: string,
): StudioPropertyItem => {
  const section = sections.find((candidate) =>
    candidate.id.startsWith(idPrefix),
  );
  if (!section) throw new Error(`섹션을 찾지 못했다: ${idPrefix}`);
  return section;
};

const markupOf = (section: StudioPropertyItem): string =>
  renderToStaticMarkup(<>{section.content}</>);

// --- 고른 것이 없을 때 ---
//
// 무엇을 고르지 않아도 어떤 맥락에서 편집하는지는 보여준다.

assert.deepEqual(
  sectionIds(build(null)),
  ["runtime:Timetable Context"],
  "고른 레이어가 없으면 맥락만 보여준다.",
);

// --- 요일 카드 ---

assert.deepEqual(
  sectionIds(build("day-card:mon")),
  [
    "componentSet:Component Set",
    "position:Position",
    "runtime:Timetable Context",
  ],
  "요일 카드는 Component Set과 자리를 편집한다.",
);

const componentSetMarkup = markupOf(
  findSection(build("day-card:mon"), "componentSet:"),
);
assert.ok(
  componentSetMarkup.includes("Monday layout"),
  "어떤 요일의 배치인지 알려준다.",
);
assert.ok(
  componentSetMarkup.includes("100 × 200"),
  "그 요일의 일정 카드 크기를 보여준다.",
);
// 표본 요일은 Component Set을 직접 지정했으므로 요일별 지정으로 보인다.
assert.ok(
  componentSetMarkup.includes("Day override"),
  "요일에 직접 지정한 묶음이면 그렇게 알려준다.",
);
assert.ok(
  !componentSetMarkup.includes("Default set"),
  "요일별 지정과 기본 묶음을 구분해서 보여준다.",
);

// 붙일 Component Set을 찾을 수 없으면 그 섹션을 아예 보여주지 않는다.
const documentWithoutComponents = createDocument();
(
  documentWithoutComponents.domains as unknown as {
    timetable: { components: Record<string, unknown> };
  }
).timetable.components = {};

assert.ok(
  !sectionIds(
    build("day-card:mon", { document: documentWithoutComponents }),
  ).includes("componentSet:Component Set"),
  "붙일 Component Set이 없으면 그 섹션을 보여주지 않는다.",
);

// --- 요일 카드 묶음 ---

const dayCardsSections = build(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);
assert.ok(
  sectionIds(dayCardsSections).includes("layout:Layout"),
  "요일 카드 묶음에는 배치 편집이 나타난다.",
);
assert.ok(
  !sectionIds(build("day-card:mon")).includes("layout:Layout"),
  "요일 카드 하나에는 묶음 배치 편집이 없다.",
);

// --- 글자 객체 ---

const textSections = build("t", {
  objects: [
    createObject("t", {
      kind: "text",
      binding: { kind: "staticText", value: "hello" },
    } as never),
  ],
});
assert.deepEqual(
  sectionIds(textSections),
  [
    "input:Text",
    "appearance:Appearance",
    "position:Position",
    "typography:Typography",
    "runtime:Timetable Context",
  ],
  "글자 객체의 섹션 종류와 순서가 바뀌면 안 된다.",
);
assert.ok(
  markupOf(findSection(textSections, "input:Text")).includes('value="hello"'),
  "묶이지 않은 글자는 직접 적는다.",
);

// 묶인 글자는 미리보기 입력도 함께 보여준다.
const boundSections = build("t", {
  objects: [
    createObject("t", {
      kind: "text",
      binding: { kind: "inputText", inputId: "input_text" },
    } as never),
  ],
});
assert.ok(
  sectionIds(boundSections).includes("runtime:Preview Inputs"),
  "묶인 글자에는 미리보기 입력 편집이 나타난다.",
);
assert.ok(
  markupOf(findSection(boundSections, "input:Text")).includes(
    'data-input-slot="input_text"',
  ),
  "묶인 입력 편집 UI는 받은 것을 그대로 놓는다.",
);
assert.ok(
  !markupOf(findSection(boundSections, "input:Text")).includes("<input"),
  "묶인 글자를 직접 적게 하면 안 된다.",
);

// 기본 필드에 묶인 글자
const builtinSections = build("t", {
  objects: [
    createObject("t", {
      kind: "text",
      binding: { kind: "builtinField", fieldId: "day.label" },
    } as never),
  ],
});
const builtinMarkup = markupOf(findSection(builtinSections, "input:Text"));
assert.ok(
  builtinMarkup.includes("Built-in Source"),
  "어떤 기본 필드에 묶였는지 보여준다.",
);
assert.ok(
  builtinMarkup.includes("<span>Day Format</span>"),
  "요일 필드에는 표기 선택이 함께 나타난다.",
);
assert.ok(
  !sectionIds(builtinSections).includes("runtime:Preview Inputs"),
  "기본 필드는 사용자 입력이 아니라 미리보기 입력 편집이 없다.",
);
assert.ok(
  !builtinMarkup.includes("<span>Date Format</span>"),
  "요일 필드에는 주간 날짜 표기 편집이 없다.",
);

// 주간 날짜 객체는 날짜 표기까지 함께 편집한다.
const weekDatesMarkup = markupOf(
  findSection(
    build("t", {
      objects: [
        createObject("t", {
          kind: "text",
          presetId: "weekDates",
          binding: { kind: "builtinField", fieldId: "day.label" },
        } as never),
      ],
    }),
    "input:Text",
  ),
);
assert.ok(
  weekDatesMarkup.includes("<span>Date Format</span>"),
  "주간 날짜 객체에는 날짜 표기 편집이 나타난다.",
);

// --- 이미지 자리 ---

const assetSlotCases: Array<
  [string, Partial<StudioTimetableCompositionObject>, string]
> = [
  [
    "weeklyMemo",
    { kind: "image", presetId: "weeklyMemo" } as never,
    "background",
  ],
  ["topObject", { kind: "image", presetId: "topObject" } as never, "topObject"],
  ["board", { kind: "image", presetId: "board" } as never, "board"],
  [
    "artistProfileText",
    { kind: "image", presetId: "artistProfileText" } as never,
    "artistProfileText",
  ],
  [
    "profileChild",
    { kind: "image", profileRole: "userImage" } as never,
    "profileChild",
  ],
  [
    "structuredBackground",
    { kind: "image", structuredRole: "background" } as never,
    "structuredBackground",
  ],
];

for (const [label, overrides, expectedKind] of assetSlotCases) {
  const sections = build("o", { objects: [createObject("o", overrides)] });
  const appearance = markupOf(findSection(sections, "appearance:"));
  assert.ok(
    appearance.includes(`data-asset-slot="${expectedKind}"`),
    `${label}에는 ${expectedKind} 이미지 자리가 나타난다.`,
  );
}

// 묶음 자체를 골랐을 때는 자식이 가진 이미지 자리를 보여주지 않는다.
const groupAppearance = markupOf(
  findSection(
    build("g", {
      objects: [
        createObject("g", { kind: "group", presetId: "topObject" } as never),
      ],
    }),
    "appearance:",
  ),
);
assert.ok(
  groupAppearance.includes("<span>Visible</span>"),
  "묶음도 보임과 투명도는 편집한다.",
);

const weeklyMemoGroupAppearance = markupOf(
  findSection(
    build("g", {
      objects: [
        createObject("g", { kind: "group", presetId: "weeklyMemo" } as never),
      ],
    }),
    "appearance:",
  ),
);
assert.ok(
  !weeklyMemoGroupAppearance.includes("data-asset-slot"),
  "메모 묶음에도 자식의 배경 자리를 보여주지 않는다.",
);
assert.ok(
  !groupAppearance.includes("data-asset-slot"),
  "묶음에는 자식의 이미지 자리를 보여주지 않는다.",
);

// 예전 프로필 묶음은 사진과 테두리, 마스크를 함께 편집한다.
const legacyProfileAppearance = markupOf(
  findSection(
    build("p", {
      objects: [
        createObject("p", {
          kind: "profileBlock",
          presetId: "profileBlock",
        } as never),
      ],
    }),
    "appearance:",
  ),
);
assert.ok(
  legacyProfileAppearance.includes('data-asset-slot="profileImage"'),
  "예전 프로필 묶음에는 사진 자리가 있다.",
);
assert.ok(
  legacyProfileAppearance.includes('data-asset-slot="profileFrame"'),
  "예전 프로필 묶음에는 테두리 자리가 있다.",
);
assert.ok(
  legacyProfileAppearance.includes("<span>Mask</span>"),
  "예전 프로필 묶음에는 마스크 편집이 있다.",
);

// 사용자 사진 자식에도 마스크 편집이 붙는다.
assert.ok(
  markupOf(
    findSection(
      build("c", {
        objects: [
          createObject("c", {
            kind: "image",
            profileRole: "userImage",
          } as never),
        ],
      }),
      "appearance:",
    ),
  ).includes("<span>Mask</span>"),
  "사용자 사진 자식은 마스크를 편집한다.",
);

// --- 자리와 크기 ---

const placedSections = build("o", {
  objects: [
    createObject("o", {
      kind: "image",
      placement: { left: 0, top: 0 },
    } as never),
  ],
});
const placedPosition = findSection(placedSections, "position:");
assert.ok(
  placedPosition.kind !== "block" && placedPosition.action !== undefined,
  "자리를 직접 정하는 객체에는 Fit 버튼이 붙는다.",
);
assert.ok(
  markupOf(placedPosition).includes('value="30"'),
  "너비를 직접 편집한다.",
);

// 요일 카드 묶음은 크기가 요일 수와 배치에서 계산된다.
const derivedPosition = findSection(
  build("o", {
    objects: [createObject("o", { kind: "generatedDayCards" } as never)],
  }),
  "position:",
);
assert.ok(
  derivedPosition.kind !== "block" && derivedPosition.action === undefined,
  "크기가 계산되는 객체에는 Fit 버튼이 없다.",
);
assert.ok(
  !markupOf(derivedPosition).includes('value="30"'),
  "크기를 직접 못 바꾸는 객체는 계산된 값만 보여준다.",
);
assert.ok(
  markupOf(derivedPosition).includes(">30</span>"),
  "계산된 크기는 읽기 전용으로 보여준다.",
);

// 부모를 채우는 객체는 좌표와 크기를 모두 잠근다.
const fitParentPositionMarkup = markupOf(
  findSection(
    build("o", {
      objects: [
        createObject("o", {
          kind: "image",
          layoutMode: "fillParent",
          placement: { left: 0, top: 0 },
        } as never),
      ],
    }),
    "position:",
  ),
);
assert.equal(
  (fitParentPositionMarkup.match(/disabled=""/g) ?? []).length,
  4,
  "부모를 채우면 X, Y, W, H 네 칸을 모두 잠근다.",
);
assert.equal(
  (markupOf(placedPosition).match(/disabled=""/g) ?? []).length,
  0,
  "자리를 직접 정하는 객체는 아무 칸도 잠기지 않는다.",
);

assert.ok(
  !sectionIds(
    build("o", {
      objects: [createObject("o")],
      overrides: { layerGeometry: null },
    }),
  ).includes("position:Position"),
  "자리를 계산할 수 없으면 자리 섹션을 보여주지 않는다.",
);

// --- 상태 ---

assert.ok(
  sectionIds(
    build("o", {
      objects: [
        createObject("o", {
          variantSet: {
            inputId: "i",
            defaultValue: "a",
            options: [{ value: "a", label: "A" }],
          },
        } as never),
      ],
    }),
  ).includes("settings:Object State"),
  "상태를 가진 객체에는 상태 선택이 나타난다.",
);
assert.ok(
  !sectionIds(build("o", { objects: [createObject("o")] })).includes(
    "settings:Object State",
  ),
  "상태가 없는 객체에는 상태 선택이 없다.",
);

// --- 맥락 ---

const contextMarkup = markupOf(
  findSection(build("day-card:mon"), "runtime:Timetable Context"),
);
assert.ok(
  contextMarkup.includes("Layer:"),
  "무엇을 편집하는지 이름을 붙여 보여준다.",
);
assert.ok(contextMarkup.includes("day-card:mon"), "어떤 레이어인지 보여준다.");
assert.ok(contextMarkup.includes("Day:"), "요일 줄에 이름을 붙인다.");
assert.ok(contextMarkup.includes("Monday"), "어떤 요일인지 보여준다.");
assert.ok(contextMarkup.includes("Entry:"), "일정 줄에 이름을 붙인다.");
assert.ok(
  contextMarkup.includes("None"),
  "고른 일정이 없으면 없다고 보여준다.",
);

// --- 섹션 접기 ---

const closedSections = build("day-card:mon", {
  overrides: { isSectionOpen: (sectionKey) => sectionKey !== "position" },
});
const closedPosition = findSection(closedSections, "position:");
assert.ok(
  closedPosition.kind !== "block" && closedPosition.open === false,
  "닫힌 섹션은 닫힌 상태로 넘어간다.",
);

const toggled: string[] = [];
const toggleSections = build("day-card:mon", {
  overrides: { onToggleSection: (sectionKey) => toggled.push(sectionKey) },
});
const togglePosition = findSection(toggleSections, "position:");
if (togglePosition.kind !== "block") togglePosition.onToggle();
assert.deepEqual(toggled, ["position"], "섹션을 누르면 그 섹션 키로 알린다.");

console.log("Studio timetable inspector baseline checks passed.");
