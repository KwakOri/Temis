/**
 * 시간표 프리셋 삽입 명령의 기준선 가드.
 *
 * 프리셋 추가는 문서에 객체와 입력을 함께 만든다. 클라이언트 콜백에서 순수
 * 함수로 옮겼으므로 실제 샘플 문서로 결과를 확인한다.
 */
import assert from "node:assert/strict";

import type {
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
} from "../src/types/template-studio";
import { STUDIO_PRESET_DEFINITIONS } from "../src/utils/template-studio/preset-registry";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  ensureStudioTimetableComposition,
  getStudioTimetableComposition,
} from "../src/utils/template-studio/timetable-composition";
import {
  findStudioTimetableStructuredTextObject,
  getStudioTimetablePresetMessage,
  insertStudioTimetablePresetObject,
  relinkStudioTimetablePresetInput,
} from "../src/utils/template-studio/timetable-preset-commands";

// --- 안내 문구 ---

assert.equal(
  getStudioTimetablePresetMessage("Weekly Memo", {
    existing: true,
    linkedInput: false,
  }),
  "Selected existing Weekly Memo",
  "이미 있는 프리셋을 다시 누르면 그 객체를 고른다.",
);
assert.equal(
  getStudioTimetablePresetMessage("Weekly Memo", {
    existing: true,
    linkedInput: true,
  }),
  "Linked Weekly Memo to input",
  "끊어진 입력을 이어 붙였으면 그렇게 알린다.",
);
assert.equal(
  getStudioTimetablePresetMessage("Board", {
    existing: false,
    linkedInput: false,
  }),
  "Added Board",
);
assert.equal(
  getStudioTimetablePresetMessage("Top Object", {
    existing: false,
    linkedInput: true,
  }),
  "Added Top Object with input",
);

// --- 구조화된 텍스트 찾기 ---

const structuredComposition = {
  rootObjectIds: ["group"],
  objects: {
    group: {
      id: "group",
      kind: "group",
      label: "group",
      childIds: ["wrapper"],
      style: {},
    },
    wrapper: {
      id: "wrapper",
      kind: "group",
      label: "wrapper",
      parentId: "group",
      childIds: ["image", "text"],
      style: {},
    },
    image: {
      id: "image",
      kind: "image",
      label: "image",
      parentId: "wrapper",
      structuredRole: "text",
      style: {},
    },
    text: {
      id: "text",
      kind: "flexibleText",
      label: "text",
      parentId: "wrapper",
      structuredRole: "text",
      style: {},
    },
  },
} as unknown as StudioTimetableComposition;

assert.equal(
  findStudioTimetableStructuredTextObject(
    structuredComposition,
    structuredComposition.objects.group,
  )?.id,
  "text",
  "구조화된 텍스트는 자손까지 내려가서 찾고, 종류가 텍스트인 것만 고른다.",
);
assert.equal(
  findStudioTimetableStructuredTextObject(structuredComposition, undefined),
  null,
  "대상이 없으면 null이다.",
);

const cyclicComposition = {
  rootObjectIds: ["a"],
  objects: {
    a: { id: "a", kind: "group", label: "a", childIds: ["b"], style: {} },
    b: { id: "b", kind: "group", label: "b", childIds: ["a"], style: {} },
  },
} as unknown as StudioTimetableComposition;
assert.equal(
  findStudioTimetableStructuredTextObject(
    cyclicComposition,
    cyclicComposition.objects.a,
  ),
  null,
  "순환 참조에서도 멈춘다.",
);

// --- 프리셋 삽입 ---

const findPreset = (timetableObjectPresetId: string) => {
  const preset = STUDIO_PRESET_DEFINITIONS.find(
    (candidate) =>
      candidate.kind === "timetableCompositionObject" &&
      candidate.timetableObjectPresetId === timetableObjectPresetId,
  );
  assert.ok(preset, `프리셋을 찾을 수 없다: ${timetableObjectPresetId}`);
  return preset as Parameters<typeof insertStudioTimetablePresetObject>[1];
};

const getComposition = (document: StudioTemplateDocument) =>
  getStudioTimetableComposition(document.domains?.timetable);

// board는 다른 객체 뒤에 깔려야 하므로 루트 목록의 앞에 들어간다.
const boardDocument = createSampleStudioDocument();
const boardRootCount = getComposition(boardDocument).rootObjectIds.length;
const boardResult = insertStudioTimetablePresetObject(
  boardDocument,
  findPreset("board"),
);
assert.ok(boardResult, "board 프리셋이 들어간다.");
const boardComposition = getComposition(boardDocument);
assert.equal(
  boardComposition.rootObjectIds[0],
  boardResult.objectId,
  "board는 루트 목록의 앞에 들어간다.",
);
assert.equal(
  boardComposition.rootObjectIds.length,
  boardRootCount + 1,
  "루트 객체가 하나 늘어난다.",
);
assert.equal(boardResult.linkedInput, false, "board는 입력을 만들지 않는다.");

// weekDates는 뒤쪽(앞에 그려지는 자리)에 들어간다.
const weekDatesDocument = createSampleStudioDocument();
const weekDatesResult = insertStudioTimetablePresetObject(
  weekDatesDocument,
  findPreset("weekDates"),
);
assert.ok(weekDatesResult);
assert.equal(
  getComposition(weekDatesDocument).rootObjectIds.at(-1),
  weekDatesResult.objectId,
  "board가 아닌 프리셋은 루트 목록의 끝에 들어간다.",
);

// weeklyMemo는 그룹과 자식, 그리고 텍스트 입력을 함께 만든다.
const memoDocument = createSampleStudioDocument();
const memoInputCount = Object.keys(memoDocument.inputs).length;
const memoResult = insertStudioTimetablePresetObject(
  memoDocument,
  findPreset("weeklyMemo"),
);
assert.ok(memoResult);
assert.equal(
  memoResult.linkedInput,
  true,
  "weeklyMemo는 입력과 함께 만들어진다.",
);
assert.ok(
  Object.keys(memoDocument.inputs).length > memoInputCount,
  "문서에 입력이 늘어난다.",
);
const memoGroup = getComposition(memoDocument).objects[memoResult.objectId];
assert.equal(memoGroup.kind, "group", "weeklyMemo는 그룹으로 만들어진다.");
assert.ok(
  getComposition(memoDocument).rootObjectIds.includes(memoResult.objectId),
  "만든 그룹은 루트 목록에 들어간다.",
);
assert.ok(
  (memoGroup.childIds ?? []).length > 0,
  "그룹 안에 자식이 함께 만들어진다.",
);
const memoText = findStudioTimetableStructuredTextObject(
  getComposition(memoDocument),
  memoGroup,
);
assert.ok(memoText, "그룹 안에 텍스트 객체가 있다.");
assert.equal(
  memoText.binding?.kind,
  "inputText",
  "만든 텍스트는 입력에 연결된다.",
);

// profileBlock은 이미지 입력을 만들고 사용자 이미지 자리에 연결한다.
const profileDocument = createSampleStudioDocument();
const profileResult = insertStudioTimetablePresetObject(
  profileDocument,
  findPreset("profileBlock"),
);
assert.ok(profileResult);
assert.equal(profileResult.linkedInput, true);
const profileComposition = getComposition(profileDocument);
const profileGroup = profileComposition.objects[profileResult.objectId];
const userImageObject = (profileGroup.childIds ?? [])
  .map((childId) => profileComposition.objects[childId])
  .find(
    (child: StudioTimetableCompositionObject | undefined) =>
      child?.profileRole === "userImage",
  );
assert.ok(userImageObject, "사용자 이미지 객체가 만들어진다.");
assert.ok(
  userImageObject.assetSlots?.asset?.inputId,
  "사용자 이미지 자리가 입력에 연결된다.",
);

// 시간표 도메인이 없으면 넣지 않는다.
const noTimetableDocument = createSampleStudioDocument();
delete noTimetableDocument.domains?.timetable;
assert.equal(
  insertStudioTimetablePresetObject(noTimetableDocument, findPreset("board")),
  null,
  "시간표 도메인이 없으면 프리셋을 넣지 않는다.",
);

// --- 다시 연결 ---

// 방금 만든 프리셋은 이미 연결돼 있으므로 다시 연결할 것이 없다.
const relinkedDocument = createSampleStudioDocument();
const relinkTarget = insertStudioTimetablePresetObject(
  relinkedDocument,
  findPreset("weeklyMemo"),
);
assert.ok(relinkTarget);
assert.equal(
  relinkStudioTimetablePresetInput(
    relinkedDocument,
    findPreset("weeklyMemo"),
    relinkTarget.objectId,
  ),
  false,
  "이미 연결된 프리셋은 다시 연결하지 않는다.",
);

// 연결이 끊어져 있으면 다시 이어 붙인다.
const brokenDocument = createSampleStudioDocument();
const brokenTarget = insertStudioTimetablePresetObject(
  brokenDocument,
  findPreset("weeklyMemo"),
);
assert.ok(brokenTarget);
// 문서에 남는 객체를 바꿔야 하므로 살아 있는 composition을 쓴다.
const timetableDomain = brokenDocument.domains?.timetable;
assert.ok(timetableDomain, "샘플 문서에 시간표 도메인이 있어야 한다.");
const brokenComposition = ensureStudioTimetableComposition(timetableDomain);
const brokenText = findStudioTimetableStructuredTextObject(
  brokenComposition,
  brokenComposition.objects[brokenTarget.objectId],
);
assert.ok(brokenText);
brokenText.binding = { kind: "staticText", value: "detached" };
assert.equal(
  relinkStudioTimetablePresetInput(
    brokenDocument,
    findPreset("weeklyMemo"),
    brokenTarget.objectId,
  ),
  true,
  "끊어진 연결은 다시 이어 붙인다.",
);
assert.equal(
  findStudioTimetableStructuredTextObject(
    getComposition(brokenDocument),
    getComposition(brokenDocument).objects[brokenTarget.objectId],
  )?.binding?.kind,
  "inputText",
  "다시 연결하면 입력 바인딩으로 돌아온다.",
);

assert.equal(
  relinkStudioTimetablePresetInput(
    noTimetableDocument,
    findPreset("weeklyMemo"),
    "missing",
  ),
  false,
  "시간표 도메인이 없으면 다시 연결하지 않는다.",
);

console.log("Studio timetable preset baseline checks passed.");
