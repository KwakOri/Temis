/**
 * 시간표 레이어 선택 판정의 기준선 가드.
 *
 * 인스펙터가 무엇을 보여줄지는 이 판정에서 갈린다. 프리셋을 알아보는 방법이
 * 깨지면 인스펙터가 조용히 비어 보이고, 요일 카드와 composition object를 섞으면
 * 엉뚱한 편집기가 나타난다.
 */
import assert from "node:assert/strict";

import type {
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
} from "../src/types/template-studio";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "../src/utils/template-studio/timetable-composition";
import {
  isStudioTimetableObjectOfPreset,
  resolveStudioTimetableSelection,
} from "../src/utils/template-studio/timetable-selection";

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

const createComposition = (
  objects: StudioTimetableCompositionObject[],
): StudioTimetableComposition =>
  ({
    rootObjectIds: objects.map((object) => object.id),
    objects: Object.fromEntries(objects.map((object) => [object.id, object])),
  }) as unknown as StudioTimetableComposition;

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
      },
    },
  }) as unknown as StudioTemplateDocument;

const resolve = (
  selectedLayerId: string | null,
  objects: StudioTimetableCompositionObject[] = [],
  document = createDocument(),
) =>
  resolveStudioTimetableSelection(
    document,
    createComposition(objects),
    selectedLayerId,
  );

// --- 프리셋 알아보기 ---
//
// 예전 문서는 presetId에, 지금 문서는 예외 meta에 종류를 적는다. 한쪽만 보면
// 그 문서에서 인스펙터가 비어 보인다.

assert.equal(
  isStudioTimetableObjectOfPreset(
    createObject("a", { presetId: "board" } as never),
    "board",
  ),
  true,
  "예전 문서의 presetId를 알아본다.",
);
assert.equal(
  isStudioTimetableObjectOfPreset(
    createObject("a", {
      meta: { exception: { semanticKey: "board" } },
    } as never),
    "board",
  ),
  true,
  "지금 문서의 예외 meta도 알아본다.",
);
assert.equal(
  isStudioTimetableObjectOfPreset(
    createObject("a", { presetId: "topObject" } as never),
    "board",
  ),
  false,
  "다른 프리셋은 알아보지 않는다.",
);
assert.equal(
  isStudioTimetableObjectOfPreset(null, "board"),
  false,
  "고른 객체가 없으면 어떤 프리셋도 아니다.",
);

// --- 고른 것이 없을 때 ---

const empty = resolve(null);
assert.equal(empty.object, null);
assert.equal(empty.dayId, null);
assert.equal(empty.day, null);
assert.equal(empty.textObject, null);
assert.equal(empty.textValue, "");
assert.equal(empty.variantSet, null);
assert.equal(empty.isFitParent, false);
assert.equal(empty.isDayCards, false);

// --- 요일 카드와 composition object 구분 ---
//
// 요일 카드 레이어는 object가 아니라 요일을 가리킨다. 섞으면 엉뚱한 편집기가
// 나타난다.

const dayCard = resolve("day-card:mon");
assert.equal(dayCard.dayId, "mon", "머리말을 떼어 요일 id를 읽는다.");
assert.equal(dayCard.day?.label, "Monday", "문서에서 요일을 찾는다.");
assert.equal(dayCard.object, null, "요일 카드는 composition object가 아니다.");
assert.ok(
  dayCard.dayComponentResolution !== null,
  "요일에 붙은 Component Set을 함께 읽는다.",
);

const objectSelection = resolve("memo", [createObject("memo")]);
assert.equal(objectSelection.dayId, null, "일반 객체는 요일이 아니다.");
assert.equal(objectSelection.object?.id, "memo");
assert.equal(
  objectSelection.dayComponentResolution,
  null,
  "일반 객체에는 Component Set 판정이 없다.",
);

assert.equal(
  resolve("day-card:gone").day,
  null,
  "문서에 없는 요일을 가리키면 비운다.",
);
assert.equal(
  resolve("gone").object,
  null,
  "문서에 없는 객체를 가리키면 비운다.",
);

// --- 요일 카드 묶음 ---

assert.equal(
  resolve(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID).isDayCards,
  true,
  "요일 카드 묶음 레이어를 알아본다.",
);
assert.equal(
  resolve("day-card:mon").isDayCards,
  false,
  "요일 카드 하나는 묶음이 아니다.",
);

// --- 글자 객체 ---

const textSelection = resolve("t", [
  createObject("t", {
    kind: "text",
    binding: { kind: "staticText", value: "hello" },
  } as never),
]);
assert.equal(textSelection.textObject?.id, "t");
assert.equal(
  textSelection.textValue,
  "hello",
  "묶이지 않은 글자는 적어 둔 값을 보여준다.",
);

const flexibleSelection = resolve("t", [
  createObject("t", { kind: "flexibleText" } as never),
]);
assert.equal(
  flexibleSelection.textObject?.id,
  "t",
  "Auto Text도 글자 객체로 본다.",
);
assert.equal(
  flexibleSelection.textValue,
  "t",
  "적어 둔 값이 없으면 레이어 이름을 보여준다.",
);

assert.equal(
  resolve("i", [createObject("i", { kind: "image" } as never)]).textObject,
  null,
  "이미지는 글자 객체가 아니다.",
);

// 묶인 입력과 기본 필드
const boundSelection = resolve("t", [
  createObject("t", {
    kind: "text",
    binding: { kind: "inputText", inputId: "input_text" },
  } as never),
]);
assert.equal(
  boundSelection.boundInput?.label,
  "Memo",
  "묶인 사용자 입력을 찾는다.",
);
assert.equal(boundSelection.builtinField, null);

const builtinSelection = resolve("t", [
  createObject("t", {
    kind: "text",
    binding: { kind: "builtinField", fieldId: "day.label" },
  } as never),
]);
assert.ok(builtinSelection.builtinField, "묶인 기본 필드를 찾는다.");
assert.equal(builtinSelection.boundInput, null);

assert.equal(
  resolve("t", [
    createObject("t", {
      kind: "text",
      binding: { kind: "inputText", inputId: "gone" },
    } as never),
  ]).boundInput,
  null,
  "사라진 입력에 묶였으면 비운다.",
);

// --- 부모 채우기 ---

assert.equal(
  resolve("o", [createObject("o", { layoutMode: "fillParent" } as never)])
    .isFitParent,
  true,
);
assert.equal(resolve("o", [createObject("o")]).isFitParent, false);

// --- 프리셋별 판정 ---

const presetChecks: Array<
  [string, keyof ReturnType<typeof resolveStudioTimetableSelection>]
> = [
  ["weekDates", "isWeekDates"],
  ["weeklyMemo", "isWeeklyMemo"],
  ["artistProfileText", "isArtistProfileText"],
  ["topObject", "isTopObject"],
  ["board", "isBoard"],
];

for (const [presetId, flag] of presetChecks) {
  assert.equal(
    resolve("o", [createObject("o", { presetId } as never)])[flag],
    true,
    `${presetId}를 presetId로 알아본다.`,
  );
  assert.equal(
    resolve("o", [
      createObject("o", {
        meta: { exception: { semanticKey: presetId } },
      } as never),
    ])[flag],
    true,
    `${presetId}를 예외 meta로도 알아본다.`,
  );
  assert.equal(
    resolve("o", [createObject("o")])[flag],
    false,
    `프리셋이 없으면 ${presetId}가 아니다.`,
  );
}

// --- 프로필 구조 ---
//
// 예전 프로필은 한 덩어리였고 지금은 자식 객체로 쪼개져 있다. 둘을 구분해야
// 서로 다른 인스펙터가 나온다.

assert.equal(
  resolve("p", [
    createObject("p", {
      kind: "profileBlock",
      presetId: "profileBlock",
    } as never),
  ]).isLegacyProfileBlock,
  true,
  "예전 구조의 프로필 묶음을 알아본다.",
);
assert.equal(
  resolve("p", [
    createObject("p", { kind: "group", presetId: "profileBlock" } as never),
  ]).isLegacyProfileBlock,
  false,
  "지금 구조의 프로필은 예전 묶음이 아니다.",
);

assert.equal(
  resolve("c", [
    createObject("c", { kind: "image", profileRole: "userImage" } as never),
  ]).isProfileChild,
  true,
  "프로필 자식 이미지를 알아본다.",
);
assert.equal(
  resolve("c", [createObject("c", { kind: "image" } as never)]).isProfileChild,
  false,
  "역할이 없는 이미지는 프로필 자식이 아니다.",
);

assert.equal(
  resolve("b", [
    createObject("b", {
      kind: "image",
      structuredRole: "background",
    } as never),
  ]).isStructuredBackground,
  true,
);
assert.equal(
  resolve("b", [
    createObject("b", { kind: "group", structuredRole: "background" } as never),
  ]).isStructuredBackground,
  false,
  "이미지가 아니면 구조 배경이 아니다.",
);

// --- 상태 ---

assert.deepEqual(
  resolve("o", [
    createObject("o", {
      variantSet: { inputId: "i", defaultValue: "a", options: [] },
    } as never),
  ]).variantSet,
  { inputId: "i", defaultValue: "a", options: [] },
  "상태를 가진 객체는 상태 묶음을 그대로 준다.",
);

console.log("Studio timetable selection baseline checks passed.");
