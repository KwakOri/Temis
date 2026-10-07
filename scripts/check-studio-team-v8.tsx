import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createStudioTeamDocument,
  createStudioTeamPreview,
  createStudioTeamDummyPreview,
  adaptStudioTeamSchedules,
  getStudioTeamCells,
  getStudioTeamMemberOrder,
  getStudioTeamCellRuntime,
  isStudioTeamImageUrl,
  upgradeStudioTeamDefaultCardLayers,
  upgradeStudioTeamTimetableBackground,
  STUDIO_TEAM_TIMETABLE_BACKGROUND_NODE_ID,
} from "../src/utils/template-studio/team-timetable";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { TemplateStudioRuntimeShell } from "../src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import { validateStudioRuntimeValuesForDocument } from "../src/utils/template-studio/timetable-runtime";
import {
  createStudioTemplateExportPayload,
  parseStudioTemplateExportJson,
} from "../src/utils/template-studio/serialization";
import { parseStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";
import {
  createStudioEditorStore,
  captureStudioEditorSnapshot,
} from "../src/stores/studio/studio-editor-store";
import type { UserScheduleData } from "../src/types/team-timetable";
import { prepareConnectedTeamStudioPreview } from "../src/utils/template-studio/team-runtime";
import {
  cloneStudioTimetableComponentSet,
  getStudioTeamMemberComponent,
  getStudioTimetableComponentSetDeleteReason,
} from "../src/utils/template-studio/component-sets";

assert.equal(
  createStudioTeamDocument().domains.timetable.team!.memberSlotIds.length,
  1,
);
const dummyDocument = createStudioTeamDocument(3);
const actualData = createStudioTeamPreview(dummyDocument);
const savedActualData = JSON.stringify(actualData);
const fixedSample = createStudioTeamDummyPreview(
  dummyDocument,
  actualData,
  "2026-10-05",
);
assert.deepEqual(
  Object.keys(fixedSample.members),
  dummyDocument.domains.timetable.team!.memberSlotIds,
);
assert.equal(fixedSample.members["member-a"].days.mon.status, "offline");
assert.equal(
  fixedSample.members["member-a"].days.tue.entries[0].mainTitle,
  "스팀 신작\n첫 플레이",
);
assert.equal(
  fixedSample.members["member-b"].days.mon.entries[0].mainTitle,
  "발로란트 랭크",
);
assert.equal(fixedSample.members["member-b"].days.mon.entries[0].time, "18:00");
assert.deepEqual(
  fixedSample,
  createStudioTeamDummyPreview(dummyDocument, actualData, "2026-10-12"),
  "sample content stays fixed across weeks",
);
assert.equal(
  JSON.stringify(actualData),
  savedActualData,
  "dummy generation leaves actual schedules intact",
);
assert.deepEqual(
  createStudioTeamDummyPreview(dummyDocument, { members: {} }, "2026-10-05"),
  { members: {} },
);
const oneMember = { members: { "member-b": actualData.members["member-b"] } };
assert.deepEqual(
  Object.keys(
    createStudioTeamDummyPreview(dummyDocument, oneMember, "2026-10-05")
      .members,
  ),
  ["member-b"],
);
assert.equal(
  Object.keys(
    createStudioTeamDummyPreview(dummyDocument, undefined, "2026-10-05")
      .members,
  ).length,
  3,
);
const dummyRuntime = createStudioInitialRuntimeValues(dummyDocument);
dummyRuntime.team = fixedSample;
assert.deepEqual(
  validateStudioRuntimeValuesForDocument(dummyDocument, dummyRuntime),
  [],
);

const backgroundDocument = createStudioTeamDocument();
const canvasBackgroundId = STUDIO_TEAM_TIMETABLE_BACKGROUND_NODE_ID;
assert.equal(
  backgroundDocument.domains.timetable.rootNodeIds[0],
  canvasBackgroundId,
);
assert.equal(
  backgroundDocument.domains.timetable.canvas!.backgroundColor,
  "transparent",
);
assert.equal(
  backgroundDocument.graph.nodes[canvasBackgroundId].layoutMode,
  "fillParent",
);
const backgroundStyleId =
  backgroundDocument.graph.nodes[canvasBackgroundId].styleId!;
assert.equal(
  backgroundDocument.styles[backgroundStyleId].backgroundColor,
  "#f4f4f5",
);
const initialCanvasGraph = JSON.stringify(backgroundDocument);
upgradeStudioTeamTimetableBackground(backgroundDocument);
assert.equal(JSON.stringify(backgroundDocument), initialCanvasGraph);
// Reproduce the older canvas fill and preserve an authored color during conversion.
backgroundDocument.graph.rootNodeIds =
  backgroundDocument.graph.rootNodeIds.filter(
    (id) => id !== canvasBackgroundId,
  );
backgroundDocument.domains.timetable.rootNodeIds =
  backgroundDocument.domains.timetable.rootNodeIds.filter(
    (id) => id !== canvasBackgroundId,
  );
delete backgroundDocument.graph.nodes[canvasBackgroundId];
delete backgroundDocument.domains.timetable.nodeExtensions[canvasBackgroundId];
delete backgroundDocument.styles[backgroundStyleId];
backgroundDocument.domains.timetable.canvas!.backgroundColor = "#112233";
upgradeStudioTeamTimetableBackground(backgroundDocument);
assert.equal(
  backgroundDocument.styles[
    backgroundDocument.graph.nodes[canvasBackgroundId].styleId!
  ].backgroundColor,
  "#112233",
);
assert.deepEqual(validateStudioDocument(backgroundDocument), []);
const oldCanvasGraph = JSON.stringify(backgroundDocument);
upgradeStudioTeamTimetableBackground(backgroundDocument);
assert.equal(JSON.stringify(backgroundDocument), oldCanvasGraph);
// Transparent canvases (including deleted background objects) stay transparent.
const transparentDocument = createStudioTeamDocument();
const transparentStyleId =
  transparentDocument.graph.nodes[canvasBackgroundId].styleId!;
transparentDocument.graph.rootNodeIds =
  transparentDocument.graph.rootNodeIds.filter(
    (id) => id !== canvasBackgroundId,
  );
transparentDocument.domains.timetable.rootNodeIds =
  transparentDocument.domains.timetable.rootNodeIds.filter(
    (id) => id !== canvasBackgroundId,
  );
delete transparentDocument.graph.nodes[canvasBackgroundId];
delete transparentDocument.domains.timetable.nodeExtensions[canvasBackgroundId];
delete transparentDocument.styles[transparentStyleId];
upgradeStudioTeamTimetableBackground(transparentDocument);
assert.equal(transparentDocument.graph.nodes[canvasBackgroundId], undefined);
assert.deepEqual(validateStudioDocument(transparentDocument), []);

// Default team cards expose their painted surface as a real editable background.
const defaultCards = createStudioTeamDocument();
for (const status of ["online", "offline", "missing"] as const) {
  const root = defaultCards.graph.nodes[`team-${status}`];
  const background = defaultCards.graph.nodes[`team-${status}-background`];
  assert(background);
  assert.equal(root.childIds[0], background.id);
  assert.equal(background.parentId, root.id);
  assert.equal(background.layoutMode, "fillParent");
  assert.equal(background.meta?.exception?.semanticKey, "statusCardBackground");
  assert.equal(defaultCards.styles[root.styleId!].backgroundColor, undefined);
  assert.equal(defaultCards.graph.nodes[`team-${status}-image`], undefined);
}
const initialCardGraph = JSON.stringify(defaultCards);
upgradeStudioTeamDefaultCardLayers(defaultCards);
assert.equal(
  JSON.stringify(defaultCards),
  initialCardGraph,
  "upgrade is idempotent",
);
const legacyCards = structuredClone(defaultCards);
for (const status of ["online", "offline", "missing"] as const) {
  const root = legacyCards.graph.nodes[`team-${status}`];
  const background = legacyCards.graph.nodes[`team-${status}-background`];
  const style = legacyCards.styles[background.styleId!];
  Object.assign(legacyCards.styles[root.styleId!], {
    backgroundColor: style.backgroundColor,
    borderRadius: style.borderRadius,
  });
  root.childIds = root.childIds.filter((id) => id !== background.id);
  delete legacyCards.graph.nodes[background.id];
  delete legacyCards.styles[background.styleId!];
  const id = `team-${status}-image`;
  legacyCards.graph.nodes[id] = {
    id,
    label: `${status}-image`,
    type: "image",
    parentId: root.id,
    childIds: [],
    styleId: `style_${id}`,
    binding: { kind: "inputImage", inputId: "team_member_image" },
  };
  legacyCards.styles[`style_${id}`] = {
    left: 154,
    top: 10,
    width: 36,
    height: 36,
  };
  root.childIds.push(id);
}
const onlineRootStyle = legacyCards.graph.nodes["team-online"].styleId!;
legacyCards.styles[onlineRootStyle].backgroundColor = "#112233";
const customImage = structuredClone(
  legacyCards.graph.nodes["team-online-image"],
);
customImage.id = "authored-image";
customImage.label = "Custom image";
legacyCards.graph.nodes[customImage.id] = customImage;
legacyCards.graph.nodes["team-online"].childIds.push(customImage.id);
upgradeStudioTeamDefaultCardLayers(legacyCards);
assert.equal(legacyCards.graph.nodes["team-online-image"], undefined);
assert(legacyCards.graph.nodes[customImage.id], "authored image survives");
assert(legacyCards.styles[customImage.styleId!], "shared style survives");
assert.equal(
  legacyCards.styles[legacyCards.graph.nodes["team-online-background"].styleId!]
    .backgroundColor,
  "#112233",
);
assert.deepEqual(
  validateStudioDocument(legacyCards).filter(
    (item) => item.severity === "error",
  ),
  [],
);
const encodedBackground = createStudioTemplateExportPayload(
  defaultCards,
  createStudioInitialRuntimeValues(defaultCards),
);
const decodedBackground = parseStudioTemplateExportJson(
  JSON.stringify(encodedBackground),
);
assert(decodedBackground.ok);
assert.equal(
  decodedBackground.document.styles[
    defaultCards.graph.nodes["team-online-background"].styleId!
  ].backgroundColor,
  "#ffffff",
);

const memberDesignDocument = createStudioTeamDocument(4);
const duplicate = cloneStudioTimetableComponentSet(
  memberDesignDocument,
  "team-card",
  "Member B",
);
assert(duplicate.ok);
memberDesignDocument.domains.timetable.team!.memberComponentIds = {
  "member-b": duplicate.componentId,
};
const variant =
  memberDesignDocument.domains.timetable.components[duplicate.componentId]
    .variants.online;
const backgroundId = memberDesignDocument.graph.nodes[
  variant.rootNodeId
].childIds.find(
  (id) =>
    memberDesignDocument.graph.nodes[id].meta?.exception?.semanticKey ===
    "statusCardBackground",
)!;
const styleId = memberDesignDocument.graph.nodes[backgroundId].styleId!;
memberDesignDocument.styles[styleId].backgroundColor = "#123456";
assert(
  getStudioTimetableComponentSetDeleteReason(
    memberDesignDocument,
    duplicate.componentId,
  ),
);
assert.deepEqual(validateStudioDocument(memberDesignDocument), []);
const weekFixture = {
  document: memberDesignDocument,
  revisionNo: 1,
  template: { id: "test", name: "test" },
  team: { id: "team", name: "team" },
  weekStartDate: "2026-10-05",
  members: [1, 2, 3].map((userId) => ({ userId, name: `Member ${userId}` })),
  schedules: [1, 2, 3].map((user_id) => ({
    user_id,
    success: false,
    schedule: null,
  })),
};
const prepared = prepareConnectedTeamStudioPreview(weekFixture, {
  "member-a": 1,
  "member-b": 2,
  "member-c": 3,
});
assert.deepEqual(prepared.definition.memberSlotIds, [
  "member-a",
  "member-b",
  "member-c",
]);
const connectedDocument = structuredClone(memberDesignDocument);
connectedDocument.domains.timetable.team = prepared.definition;
assert.equal(getStudioTeamCells(connectedDocument, prepared.values).length, 21);
assert.equal(
  getStudioTeamCells(memberDesignDocument, prepared.values).length,
  21,
  "Unassigned slots are not rendered",
);
assert.equal(
  getStudioTeamMemberComponent(connectedDocument, "member-b", "mon")!.id,
  duplicate.componentId,
);
assert.equal(
  getStudioTeamMemberComponent(connectedDocument, "member-a", "mon")!.id,
  "team-card",
);
const reordered = structuredClone(connectedDocument);
reordered.domains.timetable.team!.memberSlotIds.reverse();
const synchronized = prepareConnectedTeamStudioPreview(
  { ...weekFixture, document: reordered },
  prepared.bindings,
);
assert.deepEqual(synchronized.definition.memberSlotIds, [
  "member-c",
  "member-b",
  "member-a",
]);
assert.equal(synchronized.bindings["member-b"], 2);
assert.equal(
  synchronized.definition.memberComponentIds!["member-b"],
  duplicate.componentId,
);
const changedMembership = prepareConnectedTeamStudioPreview(
  {
    ...weekFixture,
    document: connectedDocument,
    members: [
      { userId: 2, name: "Member 2" },
      { userId: 4, name: "Member 4" },
    ],
  },
  prepared.bindings,
);
assert.equal(changedMembership.bindings["member-b"], 2);
assert.equal(Object.values(changedMembership.bindings).includes(1), false);
assert.equal(Object.values(changedMembership.bindings).includes(4), true);
assert.equal(
  changedMembership.definition.memberComponentIds!["member-b"],
  duplicate.componentId,
);
const emptyTeam = prepareConnectedTeamStudioPreview(
  { ...weekFixture, members: [] },
  prepared.bindings,
);
assert.equal(emptyTeam.definition.memberSlotIds.length, 1);
assert.equal(getStudioTeamCells(connectedDocument, emptyTeam.values).length, 0);
const memberRenderValues = createStudioInitialRuntimeValues(connectedDocument);
memberRenderValues.team = createStudioTeamPreview(connectedDocument);
const htmlWithMemberDesign = renderToStaticMarkup(
  <StudioTimetablePreview
    document={connectedDocument}
    runtimeValues={memberRenderValues}
  />,
);
assert(htmlWithMemberDesign.includes("#123456"));
const encoded = createStudioTemplateExportPayload(
  connectedDocument,
  memberRenderValues,
);
const roundTrip = parseStudioTemplateExportJson(JSON.stringify(encoded));
assert(roundTrip.ok);
assert.equal(
  roundTrip.document.domains!.timetable!.team!.memberComponentIds!["member-b"],
  duplicate.componentId,
);
const invalidAssignments: Array<Record<string, string>> = [
  { "unknown-slot": duplicate.componentId },
  { "member-a": "unknown-component" },
];
for (const assignments of invalidAssignments) {
  const invalid = structuredClone(connectedDocument);
  invalid.domains.timetable.team!.memberComponentIds = assignments;
  assert(
    validateStudioDocument(invalid).some((item) => item.severity === "error"),
  );
}

const document = createStudioTeamDocument(3);
const values = createStudioInitialRuntimeValues(document);
values.team = createStudioTeamPreview(document);
values.team.members["member-a"].days.mon.entries.push({
  mainTitle: "SECOND BROADCAST",
  subTitle: "",
  time: "21:00",
  isGuerrilla: false,
});
values.team.members["member-a"].days.mon.entries.push({
  mainTitle: "THIRD BROADCAST",
  subTitle: "",
  time: "22:00",
  isGuerrilla: false,
});
assert.deepEqual(validateStudioDocument(document), []);
assert.deepEqual(validateStudioRuntimeValuesForDocument(document, values), []);
const savedGraph = JSON.stringify(document);
for (const layout of ["day-columns", "day-grid", "member-rows"] as const) {
  const doc = structuredClone(document);
  doc.domains.timetable.team!.layout = layout;
  const cells = getStudioTeamCells(doc, values);
  assert.equal(cells.length, 21);
  for (const cell of cells) {
    assert.ok(cell.width >= 48 && cell.height >= 18);
    assert.ok(
      cell.left >= 0 &&
        cell.top >= 0 &&
        cell.left + cell.width <= 1536.001 &&
        cell.top + cell.height <= 830.001,
    );
  }
  const html = renderToStaticMarkup(
    <StudioTimetablePreview document={doc} runtimeValues={values} />,
  );
  assert.equal((html.match(/data-team-cell=/g) ?? []).length, 21);
  assert.ok(
    html.includes("SECOND BROADCAST") && html.includes("THIRD BROADCAST"),
  );
  assert.ok(html.includes("미등록") && html.includes("휴방"));
  assert.equal(
    (html.match(/data-team-member-header=/g) ?? []).length,
    layout === "member-rows" ? 3 : 0,
  );
  const exported = createStudioTemplateExportPayload(doc, values);
  const parsed = parseStudioTemplateExportJson(JSON.stringify(exported));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.message);
  assert.deepEqual(parsed.document, doc);
  assert.deepEqual(parsed.runtimeValues, values);
  assert.equal(
    renderToStaticMarkup(
      <StudioTimetablePreview
        document={parsed.document}
        runtimeValues={parsed.runtimeValues}
      />,
    ),
    html,
  );
}
assert.equal(
  JSON.stringify(document),
  savedGraph,
  "render and export do not write generator instances",
);
assert.ok(
  !savedGraph.includes("member-a:mon") &&
    !savedGraph.includes("SECOND BROADCAST"),
);
assert.ok(
  !savedGraph.includes('"composition"') &&
    !savedGraph.includes('"activeValue"'),
);
assert.ok(
  Object.values(document.graph.nodes).every((node) => !("style" in node)),
);

const store = createStudioEditorStore({
  document,
  runtimeValues: values,
  view: {},
});
const snapshot = captureStudioEditorSnapshot(store.getState());
const changed = structuredClone(document);
changed.styles.style_node_c3.color = "#ef4444";
store.getState().setDocument(changed);
assert.ok(
  renderToStaticMarkup(
    <StudioTimetablePreview document={changed} runtimeValues={values} />,
  ).includes("#ef4444"),
);
store.getState().restoreSnapshot(snapshot);
assert.deepEqual(store.getState().document, document);
assert.deepEqual(store.getState().runtimeValues, values);

for (const patch of [
  { memberSlotIds: [] },
  { memberSlotIds: ["duplicate", "duplicate"] },
  { memberSlotIds: ["__proto__"] },
  { layout: "unsupported" },
  { layout: "member-rows", order: "time" },
  { gap: Infinity },
  { memberImageInputId: "missing" },
]) {
  const invalid = structuredClone(document);
  Object.assign(invalid.domains.timetable.team!, patch);
  assert.throws(() =>
    parseStudioTimetableGraphDocument(JSON.stringify(invalid)),
  );
}
for (const image of [
  "javascript:alert(1)",
  "//evil.invalid/x",
  "/api/users",
  "https://user:password@evil.invalid/x",
  "/images/../x",
])
  assert.equal(isStudioTeamImageUrl(image), false);
for (const image of [
  "",
  "/images/team.png",
  "https://assets.example.invalid/team.png",
])
  assert.equal(isStudioTeamImageUrl(image), true);
const invalidValues = structuredClone(values);
invalidValues.team!.members["member-a"].image = "javascript:alert(1)";
assert.equal(
  parseStudioTemplateExportJson(
    JSON.stringify(createStudioTemplateExportPayload(document, invalidValues)),
  ).ok,
  false,
);
const unknownValues = structuredClone(values);
unknownValues.team!.members.unknown = unknownValues.team!.members["member-a"];
assert.ok(
  validateStudioRuntimeValuesForDocument(document, unknownValues).some(
    (d) => d.severity === "error",
  ),
);
const missing = createStudioInitialRuntimeValues(document);
assert.equal(
  (
    renderToStaticMarkup(
      <StudioTimetablePreview document={document} runtimeValues={missing} />,
    ).match(/data-status="missing"/g) ?? []
  ).length,
  21,
);

const week = Array.from({ length: 7 }, (_, day) => ({
  day,
  isOffline: day === 1,
  entries: values.team!.members["member-a"].days.mon.entries,
}));
const adapted = adaptStudioTeamSchedules(
  document,
  [
    { slotId: "member-a", userId: 1, name: "Artist A" },
    { slotId: "member-b", userId: 2, name: "Artist B" },
  ],
  [
    { user_id: 1, success: true, schedule: { schedule_data: week } },
    { user_id: 2, success: false, schedule: null },
  ] as UserScheduleData[],
);
assert.equal(adapted.members["member-a"].days.mon.entries.length, 3);
assert.equal(adapted.members["member-a"].days.tue.status, "offline");
assert.equal(adapted.members["member-b"].days.mon.status, "missing");
const team = { ...document.domains.timetable.team!, order: "time" as const };
const orderValues = structuredClone(values.team!);
for (const [id, time] of [
  ["member-a", "22:00"],
  ["member-b", "18:00"],
  ["member-c", "18:00"],
]) {
  orderValues.members[id].days.mon = {
    status: "online",
    entries: [{ mainTitle: "", subTitle: "", time, isGuerrilla: false }],
  };
}
assert.deepEqual(getStudioTeamMemberOrder(team, orderValues, "mon"), [
  "member-b",
  "member-c",
  "member-a",
]);
assert.equal(
  getStudioTeamCellRuntime(document, values, "member-a", "mon", 2).timetable
    .entriesByDay.mon[0].mainTitle,
  "THIRD BROADCAST",
);
const runtimeHtml = renderToStaticMarkup(
  <TemplateStudioRuntimeShell
    document={document}
    initialRuntimeValues={values}
    source="draft"
  />,
);
assert.equal((runtimeHtml.match(/data-team-cell=/g) ?? []).length, 21);

async function serverCheck() {
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_local_fixture_only";
  const service =
    await import("../src/services/server/templateStudioPersistenceService");
  assert.equal(
    service.validateTemplateStudioDocumentForPersistence(document, values).ok,
    true,
  );
  assert.equal(
    service.validateTemplateStudioDocumentForPersistence(
      document,
      invalidValues,
    ).ok,
    false,
  );
  const payload = createStudioTemplateExportPayload(document, values);
  const row = {
    id: "fixture-row",
    template_id: "fixture-template",
    user_id: 1,
    document_version: 8,
    document: payload.document,
    runtime_values: payload.runtimeValues,
    base_revision_no: null,
    published_revision_no: 1,
    is_autosave: false,
    created_at: "2026-10-04T00:00:00Z",
    updated_at: "2026-10-04T00:00:00Z",
  };
  const calls: Array<Record<string, unknown>> = [];
  const mock = {
    rpc: async (name: string, input: Record<string, unknown>) => {
      calls.push(input);
      return {
        data: name === "publish_template_studio_document" ? 1 : row,
        error: null,
      };
    },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return query;
    },
  } as unknown as NonNullable<
    Parameters<typeof service.saveTemplateStudioDraft>[1]
  >;
  const result = await service.saveTemplateStudioDraft(
    { templateId: row.template_id, userId: 1, document, runtimeValues: values },
    mock,
  );
  assert.equal(result.documentVersion, 8);
  assert.deepEqual(result.document, document);
  assert.deepEqual(result.runtimeValues, values);
  assert.equal(calls[0].p_document_version, 8);
  assert.deepEqual(calls[0].p_document, document);
  const published = await service.publishTemplateStudioDocument(
    { templateId: row.template_id, userId: 1, document, runtimeValues: values },
    mock,
  );
  assert.deepEqual(published.document.document, document);
  assert.deepEqual(published.document.runtimeValues, values);
  assert.equal(calls[1].p_document_version, 8);

  assert.equal(
    service.validateTemplateStudioDocumentForPersistence(
      createStudioTeamDocument(3),
      createStudioInitialRuntimeValues(createStudioTeamDocument(3)),
    ).ok,
    true,
    "new team templates can persist before entering the editor",
  );
  const templateIds = [
    "personal",
    "team",
    "own-team",
    "own-personal",
    "other-draft",
    "empty",
  ];
  const records = templateIds.map((id) => ({
    id,
    name: id,
    description: "",
    status: "draft",
    template_kind: "timetable",
    created_by: 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
  const publishedModes = [
    { template_id: "personal", team: null },
    { template_id: "team", team: "day-columns" },
    { template_id: "own-team", team: null },
    { template_id: "own-personal", team: "day-columns" },
  ];
  const draftModes = [
    { template_id: "team", user_id: 2, team: null },
    { template_id: "own-team", user_id: 1, team: "member-rows" },
    { template_id: "own-personal", user_id: 1, team: null },
    { template_id: "other-draft", user_id: 2, team: "day-grid" },
  ];
  let modeError = false;
  const listMock = {
    from: (table: string) => {
      const data =
        table === "templates"
          ? records
          : table === "template_studio_documents"
            ? publishedModes
            : draftModes;
      const query = {
        select: (columns: string) => {
          if (table !== "templates") {
            assert.ok(
              columns.includes(
                "team:document->domains->timetable->team->layout",
              ),
            );
            assert.ok(!columns.includes("runtime_values"));
          }
          return query;
        },
        eq: () => query,
        in: (column: string, ids: string[]) => {
          assert.equal(column, "template_id");
          assert.deepEqual(ids, templateIds);
          return query;
        },
        order: () => query,
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve({
            data,
            error:
              modeError && table === "template_studio_documents"
                ? { message: "mode lookup failed" }
                : null,
          }).then(resolve),
      };
      return query;
    },
  } as unknown as NonNullable<
    Parameters<typeof service.listTemplateStudioTemplates>[0]
  >;
  const listOptions = { templateKind: "timetable" as const, userId: 1 };
  assert.deepEqual(
    (
      await service.listTemplateStudioTemplates(listMock, {
        ...listOptions,
        templateMode: "team",
      })
    ).map((item) => item.id),
    ["team", "own-team", "other-draft"],
  );
  assert.deepEqual(
    (
      await service.listTemplateStudioTemplates(listMock, {
        ...listOptions,
        templateMode: "personal",
      })
    ).map((item) => item.id),
    ["personal", "own-personal", "empty"],
  );
  assert.equal(
    (await service.listTemplateStudioTemplates(listMock)).length,
    records.length,
  );
  modeError = true;
  await assert.rejects(
    service.listTemplateStudioTemplates(listMock, {
      ...listOptions,
      templateMode: "team",
    }),
    /mode lookup failed/,
  );
  console.log(
    "PASS Team Studio v8: graph, layouts, history/JSON/runtime, persistence, team/personal lists with draft precedence and lookup errors",
  );
}
serverCheck().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
