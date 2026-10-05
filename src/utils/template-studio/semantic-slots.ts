import { applyStudioObjectHidden } from "./object-style";
import { normalizeStudioTimetableDateBinding } from "./timetable-bindings";
import {
  StudioAssetId,
  StudioImageFit,
  StudioInputId,
  StudioInputScope,
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";

export type StudioSemanticMaskShape = "rectangle" | "rounded" | "circle";

export const createStudioSemanticTextInputSlot = ({
  inputId,
  scope = "global",
}: {
  inputId?: StudioInputId;
  scope?: StudioInputScope;
}) => ({
  source: "preset-created-input" as const,
  type: "text" as const,
  scope,
  ...(inputId ? { inputId } : {}),
});

export const createStudioSemanticAssetSlot = ({
  assetId,
  fit = "cover",
}: {
  assetId?: StudioAssetId | null;
  fit?: StudioImageFit;
}) =>
  assetId
    ? {
        source: "template-asset" as const,
        assetId,
        fit,
      }
    : null;

export const createStudioSemanticImageInputSlot = ({
  inputId,
  scope = "global",
  fit = "cover",
}: {
  inputId?: StudioInputId;
  scope?: StudioInputScope;
  fit?: StudioImageFit;
}) => ({
  source: "preset-created-input" as const,
  type: "image" as const,
  scope,
  fit,
  ...(inputId ? { inputId } : {}),
});

export const createStudioSemanticVisibilitySlot = (visible: boolean) => ({
  source: "object-visibility" as const,
  visible,
});

export const createStudioSemanticMaskSlot = ({
  shape,
  radius,
}: {
  shape: StudioSemanticMaskShape;
  radius: number;
}) => ({
  source: "object-mask" as const,
  shape,
  radius,
});

export const createStudioSemanticSlotRecord = (
  slots: Record<string, unknown | null | undefined>,
) =>
  Object.fromEntries(
    Object.entries(slots).filter(
      ([, slot]) => slot !== null && slot !== undefined,
    ),
  );

export const setStudioExceptionEditableSlot = (
  object: StudioTimetableCompositionObject,
  slotName: string,
  slot: unknown | null | undefined,
) => {
  const exception = object.meta?.exception;
  if (!exception) return;

  const editableSlots = {
    ...(exception.editableSlots ?? {}),
  };

  if (slot === null || slot === undefined) {
    delete editableSlots[slotName];
  } else {
    editableSlots[slotName] = slot;
  }

  object.meta = {
    ...object.meta,
    exception: {
      ...exception,
      editableSlots,
    },
  };
};

export const setStudioTimetableObjectVisibilitySlot = (
  object: StudioTimetableCompositionObject,
  visible: boolean,
) => {
  applyStudioObjectHidden(object, visible ? undefined : true);
  setStudioExceptionEditableSlot(object, "visibility", undefined);
};

export const setStudioTimetableObjectAssetSlot = (
  object: StudioTimetableCompositionObject,
  slotName: string,
  assetId: StudioAssetId | null,
  fit: StudioImageFit = "cover",
) => {
  if (assetId) {
    object.assetSlots = {
      ...(object.assetSlots ?? {}),
      [slotName]: {
        assetId,
        fit,
      },
    };
  } else {
    const assetSlots = {
      ...(object.assetSlots ?? {}),
    };
    delete assetSlots[slotName];
    object.assetSlots =
      Object.keys(assetSlots).length > 0 ? assetSlots : undefined;
  }

  setStudioExceptionEditableSlot(object, slotName, undefined);
};

export const setStudioTimetableObjectAssetInputSlot = (
  object: StudioTimetableCompositionObject,
  slotName: string,
  inputId: StudioInputId,
  fit: StudioImageFit = "cover",
) => {
  object.assetSlots = {
    ...(object.assetSlots ?? {}),
    [slotName]: {
      inputId,
      fit,
    },
  };

  setStudioExceptionEditableSlot(object, slotName, undefined);
};

export const setStudioTimetableObjectBackgroundAssetSlot = (
  object: StudioTimetableCompositionObject,
  assetId: StudioAssetId | null,
  fit: StudioImageFit = "cover",
) => {
  delete object.backgroundAssetId;
  delete object.backgroundFit;

  setStudioTimetableObjectAssetSlot(object, "background", assetId, fit);
};

export const setStudioTimetableObjectBackgroundInputSlot = (
  object: StudioTimetableCompositionObject,
  inputId: StudioInputId,
  fit: StudioImageFit = "cover",
) => {
  delete object.backgroundAssetId;
  delete object.backgroundFit;

  setStudioTimetableObjectAssetInputSlot(object, "background", inputId, fit);
};

export const setStudioTimetableObjectMaskSlot = (
  object: StudioTimetableCompositionObject,
  _shape: StudioSemanticMaskShape,
  radius: number,
) => {
  object.style = {
    ...object.style,
    borderRadius: radius,
    overflow: "hidden",
  };

  setStudioExceptionEditableSlot(object, "mask", undefined);
};

/** Semantic metadata keeps descriptors; the object owns rendered values. */
const isTimetableSnapshotSlot = (slot: unknown) => {
  if (!slot || typeof slot !== "object") return false;
  const value = slot as { source?: string; type?: string };
  return (
    value.source === "template-asset" ||
    value.source === "object-visibility" ||
    value.source === "object-mask" ||
    (value.source === "preset-created-input" && value.type === "image")
  );
};

export const createStudioTimetableEditableSlots = (
  slots: Record<string, unknown>,
) =>
  createStudioSemanticSlotRecord(
    Object.fromEntries(
      Object.entries(slots).filter(
        ([, slot]) => !isTimetableSnapshotSlot(slot),
      ),
    ),
  );

/** Load/import and serialization boundary, never a render-time repair. */
export const canonicalizeStudioTimetableObjectStorage = (
  object: StudioTimetableCompositionObject,
) => {
  normalizeStudioTimetableDateBinding(object);
  if (object.variantSet) {
    object.variantSet = { ...object.variantSet };
    delete object.variantSet.activeValue;
  }
  const background = object.assetSlots?.background;
  if (background || object.backgroundAssetId) {
    object.assetSlots = {
      ...object.assetSlots,
      background: {
        ...background,
        ...(!background?.assetId &&
        !background?.inputId &&
        object.backgroundAssetId
          ? { assetId: object.backgroundAssetId }
          : {}),
        fit: background?.fit ?? object.backgroundFit ?? "cover",
      },
    };
  }
  // Input image + template fallback are two sources, not redundant snapshots.
  // Retain this legacy fallback until the slot contract represents it explicitly.
  if (!background?.inputId) delete object.backgroundAssetId;
  delete object.backgroundFit;
  const exception = object.meta?.exception;
  if (exception?.editableSlots) {
    object.meta = {
      ...object.meta,
      exception: {
        ...exception,
        editableSlots: createStudioTimetableEditableSlots(
          exception.editableSlots,
        ),
      },
    };
  }
};

export const canonicalizeStudioTimetableDocumentStorage = (
  document: StudioTemplateDocument,
) => {
  Object.values(
    document.domains?.timetable?.composition?.objects ?? {},
  ).forEach(canonicalizeStudioTimetableObjectStorage);
};
