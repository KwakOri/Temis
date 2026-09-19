import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { cloneStudioComponentVariant } from "../src/utils/template-studio/component-variants";
import {
  createStudioInitialRuntimeValues,
  setStudioRuntimeInputValue,
} from "../src/utils/template-studio/input-values";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { ensureStudioTimetableCapabilityStatus } from "../src/utils/template-studio/timetable-capabilities";
import {
  createStudioProfileBlockPresetObjects,
  getStudioTimetableComposition,
} from "../src/utils/template-studio/timetable-composition";
import {
  addStudioTimetableEntry,
  setStudioTimetableEntryField,
} from "../src/utils/template-studio/timetable-runtime";

const countOccurrences = (source: string, value: string) =>
  source.split(value).length - 1;

const document = createSampleStudioDocument();
const timetable = document.domains!.timetable!;
timetable.capabilities!.multi.enabled = true;
ensureStudioTimetableCapabilityStatus(timetable, "multi");
const component = timetable.components[timetable.entryComponentId];
const cloneResult = cloneStudioComponentVariant(
  document,
  component.id,
  "online",
  "multi",
);
if (!cloneResult.ok) throw new Error(cloneResult.reason);

const dayId = timetable.dayIds[0];
let runtimeValues = createStudioInitialRuntimeValues(document);
runtimeValues = setStudioTimetableEntryField(
  document,
  runtimeValues,
  dayId,
  0,
  "mainTitle",
  "First authored entry",
);
runtimeValues = addStudioTimetableEntry(
  document,
  runtimeValues,
  dayId,
  `${dayId}-entry-2`,
);
runtimeValues = setStudioTimetableEntryField(
  document,
  runtimeValues,
  dayId,
  1,
  "mainTitle",
  "Second authored entry",
);

const markup = renderToStaticMarkup(
  <StudioTimetablePreview document={document} runtimeValues={runtimeValues} />,
);

assert.equal(countOccurrences(markup, "First authored entry"), 1);
assert.equal(countOccurrences(markup, "Second authored entry"), 1);
assert.equal(
  countOccurrences(markup, "Monday"),
  1,
  "Day-level objects must render once even when Multi has two entries.",
);
assert.equal(
  markup.includes("scale("),
  false,
  "Timetable runtime must not scale a full card per entry.",
);

const profileDocument = createSampleStudioDocument();
const profileTimetable = profileDocument.domains!.timetable!;
const profileComposition = getStudioTimetableComposition(profileTimetable);
const profileInputId = "profile-image-input";
const dummyProfileImage = profileDocument.assets.asset_a1.src;
profileDocument.inputs[profileInputId] = {
  id: profileInputId,
  type: "image",
  scope: "global",
  label: "프로필 이미지",
  defaultUrl: dummyProfileImage,
};
const profileObjects = createStudioProfileBlockPresetObjects(
  profileComposition,
  {
    inputId: profileInputId,
    backPlateAssetId: "asset_b2",
    frameAssetId: "asset_c3",
  },
);
[profileObjects.group, ...profileObjects.children].forEach((object) => {
  profileComposition.objects[object.id] = object;
});
profileComposition.rootObjectIds.push(profileObjects.group.id);
profileTimetable.composition = profileComposition;

const initialProfileValues = createStudioInitialRuntimeValues(profileDocument);
const authoringProfileMarkup = renderToStaticMarkup(
  <StudioTimetablePreview
    document={profileDocument}
    runtimeValues={initialProfileValues}
    variantMode="authoring"
  />,
);
assert.equal(
  authoringProfileMarkup.includes(dummyProfileImage),
  true,
  "The profile dummy image must remain visible in the authoring canvas.",
);

const runtimeProfileMarkup = renderToStaticMarkup(
  <StudioTimetablePreview
    document={profileDocument}
    runtimeValues={initialProfileValues}
  />,
);
assert.equal(
  runtimeProfileMarkup.includes(dummyProfileImage),
  false,
  "The profile dummy image must be hidden from the runtime preview.",
);
assert.doesNotMatch(
  runtimeProfileMarkup,
  />user_image_object<\/div>/,
  "The empty runtime profile slot must not render an editor placeholder label.",
);

const uploadedProfileValues = setStudioRuntimeInputValue(
  profileDocument,
  initialProfileValues,
  profileInputId,
  "https://example.com/uploaded-profile.png",
);
const uploadedProfileMarkup = renderToStaticMarkup(
  <StudioTimetablePreview
    document={profileDocument}
    runtimeValues={uploadedProfileValues}
  />,
);
assert.match(
  uploadedProfileMarkup,
  /https:\/\/example\.com\/uploaded-profile\.png/,
  "A user-provided profile image must remain visible in the runtime preview.",
);

console.log("Template Studio Entry Group renderer checks passed.");
