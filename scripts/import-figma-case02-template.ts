import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createFigmaCase02Template } from "./templates/figma-case02";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import { validateStudioRuntimeValuesForDocument } from "../src/utils/template-studio/timetable-runtime";

// Generate a reviewable import payload. Saving it to a database is a separate action.
const savedPayloadPath = process.argv[2];
assert.ok(
  savedPayloadPath,
  "Usage: node --import tsx scripts/import-figma-case02-template.ts <saved-payload.json>",
);
const savedPayload = JSON.parse(readFileSync(savedPayloadPath, "utf8"));
assert.ok(
  savedPayload.document?.assets,
  "Saved payload must contain document.assets",
);
const payload = createFigmaCase02Template(savedPayload.document.assets);
const errors = [
  ...validateStudioDocument(payload.document),
  ...validateStudioRuntimeValuesForDocument(
    payload.document,
    payload.runtimeValues,
  ),
].filter((diagnostic) => diagnostic.severity === "error");
assert.deepEqual(
  errors,
  [],
  "CASE_02 document and runtime values must validate",
);
const output = path.resolve(__dirname, "../output/template-studio");
mkdirSync(output, { recursive: true });
writeFileSync(
  path.join(output, "figma-case02.json"),
  JSON.stringify(payload, null, 2),
);
console.log(
  "Validated CASE_02 payload written to output/template-studio/figma-case02.json",
);
