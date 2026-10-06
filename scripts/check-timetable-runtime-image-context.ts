import assert from "node:assert/strict";

import { buildStudioRuntimeImageContextKey } from "../src/services/browser/templateStudioRuntimeImageStorage";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import {
  getStudioRuntimeImageContext,
  replaceStudioRuntimeImageObjectUrl,
  resolveStudioRuntimeImageContext,
  setStudioRuntimeImageValue,
} from "../src/utils/template-studio/runtime-image-context";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { ensureStudioTimetableCapabilityStatus } from "../src/utils/template-studio/timetable-capabilities";
import {
  addStudioTimetableEntry,
  removeStudioTimetableEntry,
} from "../src/utils/template-studio/timetable-runtime";

const main = async () => {
  const document = createSampleStudioDocument();
  const timetable = document.domains!.timetable!;
  const dayId = timetable.dayIds[0];
  timetable.capabilities!.multi.enabled = true;
  ensureStudioTimetableCapabilityStatus(timetable, "multi");
  const inputId = "entry-image-regression";
  document.inputs[inputId] = {
    id: inputId,
    label: "Entry image",
    type: "image",
    scope: "entry",
  };
  let values = addStudioTimetableEntry(
    document,
    createStudioInitialRuntimeValues(document),
    dayId,
    "surviving-entry",
  );
  const removedContext = getStudioRuntimeImageContext(document, values, {
    dayId,
    entryIndex: 0,
  })!;
  const survivingContext = getStudioRuntimeImageContext(document, values, {
    dayId,
    entryIndex: 1,
  })!;
  const urls = new Map<string, string>();
  const revoked: string[] = [];
  const key = (context: typeof removedContext) =>
    `${inputId}:${buildStudioRuntimeImageContextKey(context)}`;
  const replace = (context: typeof removedContext, url: string | null) =>
    replaceStudioRuntimeImageObjectUrl(urls, key(context), url, (previous) =>
      revoked.push(previous),
    );
  replace(removedContext, "blob:removed");
  replace(survivingContext, "blob:surviving");
  values = setStudioRuntimeImageValue(
    document,
    values,
    inputId,
    "blob:surviving",
    survivingContext,
  );

  // Simulate a restoration/upload awaiting a Blob while an earlier card is deleted.
  const pendingMovedImage = Promise.resolve().then(() => {
    values = setStudioRuntimeImageValue(
      document,
      values,
      inputId,
      "blob:restored-surviving",
      survivingContext,
    );
  });
  values = removeStudioTimetableEntry(document, values, dayId, 0);
  replace(removedContext, null);
  await pendingMovedImage;
  assert.equal(values.entries[dayId][0][inputId], "blob:restored-surviving");
  assert.equal(
    values.entries[dayId].length,
    1,
    "pending image does not create a phantom card",
  );
  assert.deepEqual(
    resolveStudioRuntimeImageContext(document, values, survivingContext),
    {
      dayId,
      entryIndex: 0,
    },
  );

  values = addStudioTimetableEntry(document, values, dayId, "new-entry");
  const newContext = getStudioRuntimeImageContext(document, values, {
    dayId,
    entryIndex: 1,
  })!;
  replace(newContext, "blob:new");
  replace(survivingContext, "blob:replacement");
  assert.deepEqual(revoked, ["blob:removed", "blob:surviving"]);
  assert.equal(
    urls.get(key(newContext)),
    "blob:new",
    "replacement must not revoke the new card's image",
  );
  assert.equal(
    newContext.entryId,
    "new-entry",
    "IndexedDB locator retains entry identity",
  );
  assert.notEqual(key(newContext), key(survivingContext));
  assert.equal(
    getStudioRuntimeImageContext(document, values, { dayId, entryIndex: 9 }),
    null,
  );

  const pendingDeletedImage = Promise.resolve().then(() => {
    const before = values;
    values = setStudioRuntimeImageValue(
      document,
      values,
      inputId,
      "blob:too-late",
      survivingContext,
    );
    assert.equal(
      values,
      before,
      "late crop/upload/restore for a deleted card is ignored",
    );
  });
  values = removeStudioTimetableEntry(document, values, dayId, 0);
  replace(survivingContext, null);
  await pendingDeletedImage;
  assert.equal(values.timetable.entriesByDay[dayId][0].id, "new-entry");
  assert.notEqual(values.entries[dayId][0][inputId], "blob:too-late");
  assert.equal(urls.get(key(newContext)), "blob:new");

  console.log(
    "Timetable runtime image checks passed: stable locators, deletion, index shifts, new cards, async completion and URL ownership.",
  );
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
