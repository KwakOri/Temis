import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioDateFormatControls } from "../src/components/studio/inspector/studio-binding-format-controls";
import { StudioDayLabelFormatField } from "../src/app/(root)/template-studio/_components/studio-day-label-format-field";
import {
  dropStudioFormatPart,
  getStudioFormatDropTarget,
  parseStudioFormatParts,
  removeStudioFormatPart,
  serializeStudioFormatParts,
} from "../src/utils/template-studio/format-template-blocks";
import {
  getStudioDateFormatPresets,
  resolveStudioSingleDateText,
  resolveStudioDateRangeText,
} from "../src/utils/template-studio/date-template";

const tokens = ["${YYYY}", "${MM}", "${DD}", "${weekday}"];
const blockBounds = [
  { position: 0, left: 20, top: 20, width: 80, height: 40 },
  { position: 1, left: 112, top: 20, width: 80, height: 40 },
  { position: 2, left: 20, top: 80, width: 80, height: 40 },
];
assert.equal(
  getStudioFormatDropTarget(blockBounds, { x: 30, y: 35 })?.position,
  0,
);
assert.equal(
  getStudioFormatDropTarget(blockBounds, { x: 185, y: 35 })?.position,
  2,
);
assert.equal(
  getStudioFormatDropTarget(blockBounds, { x: 106, y: 66 })?.position,
  1,
  "A pointer below the first row still identifies the boundary between its blocks.",
);
assert.equal(
  getStudioFormatDropTarget(blockBounds, { x: 12, y: 90 })?.position,
  2,
  "Wrapped rows show their own leading boundary.",
);
assert.equal(
  getStudioFormatDropTarget(blockBounds, { x: 108, y: 115 })?.position,
  3,
);
assert.equal(
  getStudioFormatDropTarget(blockBounds, { x: 116, y: 35 }, 0),
  null,
  "An unchanged order has no insertion marker.",
);
assert.equal(
  getStudioFormatDropTarget(blockBounds, { x: 188, y: 35 }, 0)?.position,
  2,
);
assert.equal(getStudioFormatDropTarget([], { x: 0, y: 0 }), null);
const source = " 앞 ${ YYYY }.${MM}\n${DD}${YYYY} ${unknown} 뒤  ";
const parts = parseStudioFormatParts(source, tokens);
assert.equal(
  serializeStudioFormatParts(parts),
  source,
  "Parsing preserves whitespace, unknown expressions, newlines and repeated variables.",
);
assert.equal(parts.filter((part) => part.kind === "token").length, 4);
assert.deepEqual(parseStudioFormatParts("", tokens), []);
assert.deepEqual(
  parseStudioFormatParts("${YYYY}${MM}", tokens).map((part) => part.kind),
  ["token", "token"],
  "No implicit text fields are inserted before, between or after variables.",
);
const chain = parseStudioFormatParts("${YYYY}.${MM}-${DD}", tokens);
const first = chain[0];
assert.equal(
  serializeStudioFormatParts(
    dropStudioFormatPart(chain, chain.length, { id: first.id }),
  ),
  ".${MM}-${DD}${YYYY}",
);
assert.equal(
  serializeStudioFormatParts(
    dropStudioFormatPart(chain, 0, { kind: "token", value: "${weekday}" }),
  ),
  "${weekday}${YYYY}.${MM}-${DD}",
);
const text = chain[1];
const movedText = dropStudioFormatPart(chain, chain.length, { id: text.id });
assert.equal(serializeStudioFormatParts(movedText), "${YYYY}${MM}-${DD}.");
assert.equal(
  movedText.at(-1)?.id,
  text.id,
  "Text blocks move with their identity intact.",
);
assert.equal(
  serializeStudioFormatParts(removeStudioFormatPart(chain, text.id)),
  "${YYYY}${MM}-${DD}",
);
assert.equal(
  serializeStudioFormatParts(chain),
  "${YYYY}.${MM}-${DD}",
  "Edits leave the source snapshot intact for Undo.",
);
assert.deepEqual(
  dropStudioFormatPart(chain, 1, { id: first.id }),
  chain,
  "Dropping next to the same block is a no-op.",
);
assert.equal(dropStudioFormatPart(chain, 2, { id: "missing" }), chain);
const emptyText = dropStudioFormatPart(chain, 2, { kind: "text", value: "" });
assert.equal(
  emptyText.length,
  chain.length + 1,
  "Adding empty text creates a real editable block.",
);
assert.equal(emptyText[2].kind, "text");
const adjacentText = dropStudioFormatPart(chain, 2, {
  kind: "text",
  value: "추가\n ",
});
assert.equal(adjacentText[1].id, text.id);
assert.equal(
  adjacentText[2].value,
  "추가\n ",
  "Adjacent text blocks remain independent.",
);
const removedVariable = removeStudioFormatPart(adjacentText, chain[2].id);
assert.equal(
  removedVariable.filter((part) => part.kind === "text").length,
  3,
  "Deletion never merges text blocks.",
);
assert.equal(
  serializeStudioFormatParts(removedVariable),
  "${YYYY}.추가\n -${DD}",
);

for (const mode of ["single", "range"] as const) {
  const recognized = ["", "start.", "end."].flatMap((prefix) =>
    [
      "YYYY",
      "YY",
      "MM",
      "M",
      "DD",
      "D",
      "weekday",
      "weekdayShort",
      "localized",
      "localizedWithYear",
    ].map((token) => `\${${prefix}${token}}`),
  );
  for (const preset of getStudioDateFormatPresets(mode)) {
    const parsed = parseStudioFormatParts(preset.template, recognized);
    assert.ok(parsed.some((part) => part.kind === "token"));
    assert.equal(serializeStudioFormatParts(parsed), preset.template);
  }
}
assert.equal(
  resolveStudioSingleDateText({
    date: "2026-07-01",
    format: "custom",
    template: "${DD}일  ",
  }),
  "01일  ",
);
assert.equal(
  resolveStudioDateRangeText({
    startDate: "2026-07-01",
    format: "custom",
    template: "",
  }),
  "",
  "Clearing every block produces an empty format, rather than a fallback preset.",
);
const dateMarkup = renderToStaticMarkup(
  <StudioDateFormatControls
    mode="single"
    template="${YYYY}년 ${MM}월"
    onChange={() => {}}
  />,
);
assert.match(dateMarkup, /aria-label="Edit Date Format"/);
assert.match(dateMarkup, /<dialog/);
assert.match(dateMarkup, /data-format-token="\$\{YYYY\}"/);
assert.doesNotMatch(
  dateMarkup,
  /value="\$\{YYYY\}"/,
  "Fixed variables are blocks rather than editable text inputs.",
);
const dayMarkup = renderToStaticMarkup(
  <StudioDayLabelFormatField
    fieldId="day.label"
    template="(${weekdayShort})"
    onChange={() => {}}
  />,
);
assert.match(dayMarkup, /aria-label="Edit Day Format"/);
assert.match(dayMarkup, /data-format-token="\$\{weekdayShort\}"/);
assert.match(dateMarkup, /aria-label="Add Text block"/);
assert.match(dateMarkup, /data-format-text=/);
assert.match(dateMarkup, /border-orange-400/);
assert.doesNotMatch(
  dateMarkup,
  /aria-label="(?:Move block \d+ (?:left|right)|Remove block)/,
);
assert.doesNotMatch(
  dateMarkup,
  /data-format-trash/,
  "Trash is hidden until dragging an existing block.",
);
console.log(
  "Studio format block checks passed: lossless parsing, independent text blocks, drag insertion/reorder/deletion, preset roundtrips and modal rendering.",
);
