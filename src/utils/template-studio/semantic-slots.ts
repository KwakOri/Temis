import {
  StudioAssetId,
  StudioImageFit,
  StudioInputId,
  StudioInputScope,
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
  object.hidden = visible ? undefined : true;
  setStudioExceptionEditableSlot(
    object,
    "visibility",
    createStudioSemanticVisibilitySlot(visible),
  );
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

  setStudioExceptionEditableSlot(
    object,
    slotName,
    createStudioSemanticAssetSlot({
      assetId,
      fit,
    }),
  );
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

  setStudioExceptionEditableSlot(
    object,
    slotName,
    createStudioSemanticImageInputSlot({
      inputId,
      fit,
    }),
  );
};

export const setStudioTimetableObjectBackgroundAssetSlot = (
  object: StudioTimetableCompositionObject,
  assetId: StudioAssetId | null,
  fit: StudioImageFit = "cover",
) => {
  if (assetId) {
    object.backgroundAssetId = assetId;
    object.backgroundFit = fit;
  } else {
    delete object.backgroundAssetId;
    delete object.backgroundFit;
  }

  setStudioTimetableObjectAssetSlot(object, "background", assetId, fit);
};

export const setStudioTimetableObjectBackgroundInputSlot = (
  object: StudioTimetableCompositionObject,
  inputId: StudioInputId,
  fit: StudioImageFit = "cover",
) => {
  delete object.backgroundAssetId;
  object.backgroundFit = fit;

  setStudioTimetableObjectAssetInputSlot(object, "background", inputId, fit);
};

export const setStudioTimetableObjectMaskSlot = (
  object: StudioTimetableCompositionObject,
  shape: StudioSemanticMaskShape,
  radius: number,
) => {
  object.style = {
    ...object.style,
    borderRadius: radius,
    overflow: "hidden",
  };

  setStudioExceptionEditableSlot(
    object,
    "mask",
    createStudioSemanticMaskSlot({
      shape,
      radius,
    }),
  );
};
