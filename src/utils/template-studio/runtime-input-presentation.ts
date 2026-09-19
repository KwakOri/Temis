import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import {
  getStudioTimetableComposition,
  getStudioTimetableObjectRenderableChildIds,
  getStudioTimetableObjectRuntimeVariantValue,
} from "@/utils/template-studio/timetable-composition";
import { findStudioArtistProfileTextInput } from "@/utils/template-studio/preset-inputs";
import { getStudioTextWrapMode } from "@/utils/template-studio/text-wrap";

const isArtistObject = (object: StudioTimetableCompositionObject) =>
  object.presetId === "artistProfileText" ||
  object.meta?.exception?.semanticKey === "artistProfileText";

const findArtistTextObject = (
  composition: StudioTimetableComposition,
  objectId: string,
  visitedObjectIds = new Set<string>(),
): StudioTimetableCompositionObject | null => {
  if (visitedObjectIds.has(objectId)) return null;
  visitedObjectIds.add(objectId);

  const object = composition.objects[objectId];
  if (!object) return null;
  if (
    object.structuredRole === "text" &&
    (object.kind === "text" || object.kind === "flexibleText")
  ) {
    return object;
  }

  for (const childId of object.childIds ?? []) {
    const textObject = findArtistTextObject(
      composition,
      childId,
      visitedObjectIds,
    );
    if (textObject) return textObject;
  }

  return null;
};

const resolveArtistTextObject = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
): StudioTimetableCompositionObject | null => {
  const timetable = document.domains?.timetable;
  if (!timetable) return null;

  const composition = getStudioTimetableComposition(timetable);
  const artistGroup = Object.values(composition.objects).find(
    (object) => isArtistObject(object) && object.kind === "group",
  );

  if (artistGroup) {
    const variantValue = getStudioTimetableObjectRuntimeVariantValue(
      document,
      runtimeValues,
      artistGroup,
    );
    const activeRootIds = getStudioTimetableObjectRenderableChildIds(
      artistGroup,
      variantValue,
    );
    for (const rootId of activeRootIds) {
      const textObject = findArtistTextObject(composition, rootId);
      if (textObject) return textObject;
    }
  }

  return (
    Object.values(composition.objects).find(
      (object) =>
        isArtistObject(object) &&
        object.structuredRole === "text" &&
        (object.kind === "text" || object.kind === "flexibleText"),
    ) ?? null
  );
};

/**
 * Artist's runtime control follows the text object's line-break setting.
 *
 * Other text inputs keep their own multiline definition. Legacy Artist
 * documents without a resolvable text object retain that input definition.
 */
export const getStudioRuntimeInputMultiline = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  input: StudioInputDefinition,
): boolean => {
  if (input.type !== "text") return false;

  const artistInput = findStudioArtistProfileTextInput(document);
  if (!artistInput || artistInput.id !== input.id) {
    return Boolean(input.multiline);
  }

  const textObject = resolveArtistTextObject(document, runtimeValues);
  return textObject
    ? getStudioTextWrapMode(textObject.style) === "preserve"
    : Boolean(input.multiline);
};
