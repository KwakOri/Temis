import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createStudioTeamDocument,
  createStudioTeamPreview,
  adaptStudioTeamSchedules,
  getStudioTeamCells,
  getStudioTeamMemberOrder,
  getStudioTeamCellRuntime,
  isStudioTeamImageUrl,
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

const document = createStudioTeamDocument();
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
  console.log(
    "PASS Team Studio v8: native graph, 3 layouts, shared render/history/JSON/runtime, schedules, validation and actual persistence with mock DB",
  );
}
serverCheck().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
