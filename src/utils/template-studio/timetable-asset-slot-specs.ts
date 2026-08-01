import type {
  StudioImageFit,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import {
  STUDIO_ARTIST_PROFILE_TEXT_ASSET_INPUT_LABEL,
  STUDIO_PROFILE_BLOCK_FRAME_INPUT_LABEL,
  STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
  STUDIO_TOP_OBJECT_IMAGE_INPUT_LABEL,
  STUDIO_WEEKLY_MEMO_BACKGROUND_INPUT_LABEL,
} from "@/utils/template-studio/preset-inputs";
import {
  setStudioTimetableObjectAssetInputSlot,
  setStudioTimetableObjectAssetSlot,
  setStudioTimetableObjectBackgroundAssetSlot,
  setStudioTimetableObjectBackgroundInputSlot,
} from "@/utils/template-studio/semantic-slots";

/** 시간표 객체가 가진 이미지 자리의 종류. */
export type StudioAssetSlotKind =
  | "background"
  | "profileImage"
  | "profileFrame"
  | "profileChild"
  | "structuredBackground"
  | "topObject"
  | "board"
  | "artistProfileText";

/**
 * 이미지 자리 하나를 편집하는 데 필요한 값.
 *
 * 어떤 이름으로 보여주고, 지금 값을 어디서 읽고, 바꿀 때 어떤 자리에 쓰는지를
 * 담는다. 화면을 만들지 않으므로 값으로 확인할 수 있다.
 */
export interface StudioAssetSlotSpec {
  label: string;
  assetId?: string | null;
  inputId?: string | null;
  fit?: StudioImageFit;
  /** 값이 없을 때 쓸 Fit. 자리마다 어울리는 기본이 다르다. */
  defaultFit?: StudioImageFit;
  /** 사용자 입력을 새로 만들 때 붙일 이름. */
  inputLabel?: string;
  /** 출처를 고정한다. 프리셋이 출처를 정해 둔 자리에 쓴다. */
  sourceLocked?: "asset" | "input";
  onUpdateAsset: (
    object: StudioTimetableCompositionObject,
    assetId: string | null,
    fit: StudioImageFit,
  ) => void;
  onUpdateInput?: (
    object: StudioTimetableCompositionObject,
    inputId: string,
    fit: StudioImageFit,
  ) => void;
}

/** 이름 있는 자리를 읽고 쓰는 spec. */
const createNamedAssetSlotSpec = (
  object: StudioTimetableCompositionObject,
  slotName: string,
  spec: Omit<StudioAssetSlotSpec, "onUpdateAsset" | "onUpdateInput"> & {
    /** 사용자 입력으로 바꿀 수 있는 자리인지. */
    allowInput?: boolean;
  },
): StudioAssetSlotSpec => {
  const slot = object.assetSlots?.[slotName];
  const { allowInput = true, ...rest } = spec;

  return {
    ...rest,
    assetId: slot?.assetId,
    inputId: slot?.inputId,
    fit: slot?.fit,
    onUpdateAsset: (currentObject, assetId, fit) => {
      setStudioTimetableObjectAssetSlot(currentObject, slotName, assetId, fit);
    },
    onUpdateInput: allowInput
      ? (currentObject, inputId, fit) => {
          setStudioTimetableObjectAssetInputSlot(
            currentObject,
            slotName,
            inputId,
            fit,
          );
        }
      : undefined,
  };
};

/** 프로필 자식 객체의 이름. 자리 이름과 기본 Fit이 역할에 따라 달라진다. */
const getStudioProfileChildLabel = (role: string | undefined): string => {
  if (role === "backPlate") return "Back Plate Asset";
  if (role === "frame") return "Frame Asset";
  return "User Image";
};

/**
 * 종류에 맞는 이미지 자리 spec을 만든다.
 *
 * 사용자 이미지 자리는 출처를 입력으로 고정한다. 사용자가 넣는 사진 자리에
 * 템플릿 에셋을 넣어 두면 발행 후에도 그 사진이 남는다.
 *
 * 배경과 판 같은 자리는 출처를 에셋으로 고정한다. 사용자 입력을 받지 않는
 * 자리이기 때문이다.
 */
export const resolveStudioAssetSlotSpec = (
  object: StudioTimetableCompositionObject,
  kind: StudioAssetSlotKind,
): StudioAssetSlotSpec => {
  if (kind === "background") {
    const slot = object.assetSlots?.background;

    return {
      label: "Background Asset",
      // 예전 문서는 자리 대신 객체에 직접 값을 두었다. 그 값도 읽는다.
      assetId: slot?.assetId ?? object.backgroundAssetId,
      inputId: slot?.inputId,
      fit: slot?.fit ?? object.backgroundFit,
      inputLabel: STUDIO_WEEKLY_MEMO_BACKGROUND_INPUT_LABEL,
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectBackgroundAssetSlot(
          currentObject,
          assetId,
          fit,
        );
      },
      onUpdateInput: (currentObject, inputId, fit) => {
        setStudioTimetableObjectBackgroundInputSlot(
          currentObject,
          inputId,
          fit,
        );
      },
    };
  }

  if (kind === "profileImage") {
    return createNamedAssetSlotSpec(object, "profileImage", {
      label: "Profile Image",
      inputLabel: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
    });
  }

  if (kind === "profileFrame") {
    return createNamedAssetSlotSpec(object, "profileFrame", {
      label: "Frame Asset",
      defaultFit: "contain",
      inputLabel: STUDIO_PROFILE_BLOCK_FRAME_INPUT_LABEL,
    });
  }

  if (kind === "profileChild") {
    const isUserImage = object.profileRole === "userImage";

    return createNamedAssetSlotSpec(object, "asset", {
      label: getStudioProfileChildLabel(object.profileRole),
      defaultFit: isUserImage ? "cover" : "contain",
      inputLabel: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
      sourceLocked: isUserImage ? "input" : "asset",
      allowInput: isUserImage,
    });
  }

  if (kind === "structuredBackground") {
    return createNamedAssetSlotSpec(object, "asset", {
      label: "Background Asset",
      defaultFit: "cover",
      inputLabel: STUDIO_WEEKLY_MEMO_BACKGROUND_INPUT_LABEL,
      sourceLocked: "asset",
      allowInput: false,
    });
  }

  if (kind === "topObject") {
    return createNamedAssetSlotSpec(object, "asset", {
      label: "Object Asset",
      defaultFit: "contain",
      inputLabel: STUDIO_TOP_OBJECT_IMAGE_INPUT_LABEL,
    });
  }

  if (kind === "board") {
    return createNamedAssetSlotSpec(object, "asset", {
      label: "Board Image",
      defaultFit: "cover",
      sourceLocked: "asset",
      allowInput: false,
    });
  }

  return createNamedAssetSlotSpec(object, "asset", {
    label: "Text Asset",
    defaultFit: "contain",
    inputLabel: STUDIO_ARTIST_PROFILE_TEXT_ASSET_INPUT_LABEL,
  });
};
