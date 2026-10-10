import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CASE02_ASSET_IDS,
  createFigmaCase02Template,
} from "./templates/figma-case02";
import type { StudioAssetMap } from "../src/types/template-studio";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import { validateStudioRuntimeValuesForDocument } from "../src/utils/template-studio/timetable-runtime";
import {
  getStudioTimetableDayCardGeometries,
  StudioTimetablePreview,
} from "../src/app/(root)/template-studio/_components/studio-timetable-preview";

Object.assign(globalThis, { React });
// Rendering checks use synthetic metadata; no deployed template or local images are required.
const assets: StudioAssetMap = Object.fromEntries(
  CASE02_ASSET_IDS.map((id) => {
    const mimeType =
      /background|header|paw|pill/.test(id) && id !== "artist-background"
        ? "image/svg+xml"
        : "image/png";
    const src = `https://assets.example.test/${id}`;
    return [
      id,
      {
        id,
        label: `CASE_02 ${id}`,
        src,
        publicUrl: src,
        storageProvider: "r2",
        storagePath: `test/${id}`,
        contentHash: "0".repeat(64),
        mimeType,
        byteSize: 1,
      },
    ];
  }),
);
assert.throws(
  () => createFigmaCase02Template({}),
  /synced R2 asset metadata: board/,
);
assert.throws(
  () =>
    createFigmaCase02Template({
      ...assets,
      board: { ...assets.board, src: "/local-board.png" },
    }),
  /synced R2 asset metadata: board/,
);
const { document, runtimeValues } = createFigmaCase02Template(assets);
assert.deepEqual(document.assets, assets);
assert.notEqual(
  document.assets.board,
  assets.board,
  "Asset metadata must be copied",
);
assert.deepEqual(validateStudioDocument(document), []);
assert.deepEqual(
  validateStudioRuntimeValuesForDocument(document, runtimeValues),
  [],
);
const domain = document.domains.timetable;
const geometry = getStudioTimetableDayCardGeometries(
  domain.dayCardsLayout!,
  domain.dayIds.map((id) => domain.days[id]),
  () => 1,
  { width: 715, height: 644 },
);
assert.deepEqual([geometry.mon.left, geometry.mon.top], [1654, 79]);
assert.deepEqual([geometry.tue.left, geometry.tue.top], [1654, 731]);
assert.deepEqual([geometry.wed.left, geometry.wed.top], [2381, 731]);
assert.deepEqual([geometry.sun.left, geometry.sun.top], [3108, 1383]);
const render = () =>
  renderToStaticMarkup(
    <StudioTimetablePreview
      document={document}
      runtimeValues={runtimeValues}
    />,
  );
const initial = render();
assert.ok(initial.includes("OFF\nLINE"));
assert.ok(initial.includes("PM 09:00"));
assert.ok(initial.includes("2026.05.25 ~ 2026.05.31"));
runtimeValues.timetable.weekStartDate = "2026-10-05";
runtimeValues.timetable.entriesByDay.tue[0].statusId = "online";
runtimeValues.timetable.entriesByDay.mon[0].mainTitle =
  "길이가 긴 사용자 제목을 두 줄로\n교체한 일정";
runtimeValues.timetable.entriesByDay.mon[0].time = "08:30";
const artistInput = Object.values(document.inputs).find(
  (input) => input.label === "Artist",
);
const profileInput = Object.values(document.inputs).find(
  (input) => input.type === "image",
);
assert.ok(artistInput && profileInput);
runtimeValues.global[artistInput.id] = "교체한 작가명";
runtimeValues.global[profileInput.id] =
  "https://example.test/replacement-profile.png";
const updated = render();
assert.ok(
  !updated.includes("OFF\nLINE"),
  "An Offline day must switch to its Online card",
);
assert.ok(
  updated.includes("2026.10.05 ~ 2026.10.11"),
  "Dates must follow the selected week",
);
assert.ok(updated.includes("교체한 일정"));
assert.ok(updated.includes("AM 08:30"));
assert.ok(updated.includes("교체한 작가명"));
assert.ok(updated.includes("https://example.test/replacement-profile.png"));
console.log(
  "CASE_02 checks passed: assets, grid, status switching, titles, time, dates, artist, profile.",
);
