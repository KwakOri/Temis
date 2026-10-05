import type {
  StudioStyleRecord,
  StudioTimetableObjectPresetId,
} from "@/types/template-studio";
import type {
  StudioTimetableGraphDocument,
  StudioTimetableGraphNode,
  StudioTimetableNodeExtension,
} from "@/types/studio-timetable-graph";
import { createStudioId } from "./id";
import {
  ensureStudioArtistProfileTextInput,
  ensureStudioWeeklyMemoInput,
  ensureStudioTimetableVariantInput,
  ensureStudioPresetImageInput,
  STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
} from "./preset-inputs";

export const STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID = "day-cards";

const findAsset = (
  document: StudioTimetableGraphDocument,
  keywords: string[],
) =>
  Object.values(document.assets).find((asset) =>
    keywords.some((keyword) =>
      `${asset.id} ${asset.label}`.toLowerCase().includes(keyword),
    ),
  )?.id;

/** Creates nodes and styles directly in v8. The caller owns cloning and singleton lookup. */
export const insertStudioTimetableGraphPreset = (
  document: StudioTimetableGraphDocument,
  presetId: Exclude<StudioTimetableObjectPresetId, "dayCards">,
): { nodeId: string; linkedInput: boolean } => {
  const extensionStore = document.domains.timetable.nodeExtensions;
  const add = (
    node: Omit<
      StudioTimetableGraphNode,
      "id" | "styleId" | "childIds" | "parentId"
    >,
    style: StudioStyleRecord,
    extension: StudioTimetableNodeExtension = {},
    parentId: string | null = null,
  ) => {
    let id = createStudioId("node");
    while (document.graph.nodes[id]) id = createStudioId("node");
    let styleId = createStudioId("style");
    while (document.styles[styleId]) styleId = createStudioId("style");
    const result: StudioTimetableGraphNode = {
      ...node,
      id,
      styleId,
      parentId,
      childIds: [],
      assetSlots: node.assetSlots ?? {},
    };
    document.graph.nodes[id] = result;
    document.styles[styleId] = { ...style };
    extensionStore[id] = extension;
    if (parentId) document.graph.nodes[parentId].childIds.push(id);
    return result;
  };
  const meta = (
    semanticKey: Exclude<StudioTimetableObjectPresetId, "dayCards">,
  ) => ({
    exception: {
      semanticKey,
      scope: "timetable" as const,
      presetId: semanticKey,
      lockedStructure: true,
      singleton: semanticKey !== "weekDates",
      ...(semanticKey === "weekDates"
        ? { builtInBindings: { text: "week.date_range" as const } }
        : { editableSlots: {} }),
    },
  });
  const assets = Object.keys(document.assets);
  let root: StudioTimetableGraphNode;
  let linkedInput = false;
  if (presetId === "board") {
    root = add(
      {
        type: "image",
        label: "Board",
        layoutMode: "fillParent",
        fit: "cover",
        meta: meta(presetId),
      },
      {
        position: "absolute",
        left: 0,
        top: 0,
        width: 4000,
        height: 2250,
        opacity: 1,
        overflow: "hidden",
      },
      { presetId },
    );
  } else if (presetId === "weekDates") {
    root = add(
      {
        type: "text",
        label: "Week Dates",
        binding: { kind: "builtinField", fieldId: "week.date_range" },
        meta: meta(presetId),
      },
      {
        position: "absolute",
        left: 360,
        top: 250,
        width: 1500,
        height: 120,
        color: "#172033",
        display: "flex",
        alignItems: "center",
        fontSize: 86,
        fontWeight: 800,
        opacity: 1,
      },
      { presetId },
    );
  } else {
    const memo = presetId === "weeklyMemo";
    const artist = presetId === "artistProfileText";
    const profile = presetId === "profileBlock";
    const label = profile
      ? "Profile Block"
      : memo
        ? "Weekly Memo"
        : artist
          ? "Artist"
          : "Top Object";
    const width = memo ? 1500 : artist ? 1200 : 420;
    const height = memo ? 110 : artist ? 180 : 420;
    const common = {
      position: "absolute",
      left: 0,
      top: 0,
      width,
      height,
      rotateDeg: 0,
      opacity: 1,
    };
    root = add(
      { type: "group", label, meta: meta(presetId) },
      {
        ...common,
        left: profile || memo ? 360 : artist ? 840 : 3060,
        top: memo ? 1770 : profile || artist ? 470 : 260,
        overflow: "visible",
      },
      { presetId },
    );
    if (profile) {
      const profileAsset =
        findAsset(document, ["profile", "avatar", "portrait", "photo"]) ??
        assets[0];
      const backPlateAsset =
        findAsset(document, [
          "back_plate",
          "back plate",
          "backplate",
          "plate",
        ]) ?? assets[0];
      const frameAsset =
        findAsset(document, ["frame", "border"]) ?? assets[1] ?? assets[0];
      const { inputId } = ensureStudioPresetImageInput(document, {
        label: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
        scope: "global",
        placeholder: "Paste profile image URL",
        defaultUrl: profileAsset
          ? (document.assets[profileAsset]?.src ?? "")
          : "",
      });
      const image = (
        label: string,
        role: "backPlate" | "frame",
        assetId?: string,
      ) =>
        add(
          {
            type: "image",
            label,
            fit: "contain",
            binding: assetId ? { kind: "staticAsset", assetId } : undefined,
          },
          common,
          { profileRole: role },
          root.id,
        );
      image("back_plate_object", "backPlate", backPlateAsset);
      add(
        {
          type: "image",
          label: "user_image_object",
          fit: "cover",
          binding: { kind: "inputImage", inputId },
        },
        { ...common, borderRadius: 0, overflow: "hidden" },
        { profileRole: "userImage" },
        root.id,
      );
      image("frame_object", "frame", frameAsset);
    } else {
      // Each branch has its own design. Off starts hidden and can be edited separately.
      const textInput = memo
        ? ensureStudioWeeklyMemoInput(document)
        : artist
          ? ensureStudioArtistProfileTextInput(document)
          : null;
      const variantInput = ensureStudioTimetableVariantInput(
        document,
        presetId,
      );
      const roots: Record<string, string> = {};
      for (const state of ["on", "off"] as const) {
        const branch = add(
          {
            type: "group",
            label: `${label} ${state === "on" ? "On" : "Off"}`,
            hidden: state === "off",
            layoutMode: "fillParent",
          },
          { ...common, overflow: "visible" },
          {},
          root.id,
        );
        roots[state] = branch.id;
        if (textInput) {
          const prefix = memo ? "weekly_memo" : "artist";
          const statePrefix = state === "on" ? prefix : `${prefix}_off`;
          add(
            {
              type: "image",
              label: `${statePrefix}_background_object`,
              layoutMode: "fillParent",
              fit: "contain",
            },
            common,
            { structuredRole: "background" },
            branch.id,
          );
          add(
            {
              type: "flexibleText",
              label: `${statePrefix}_text_object`,
              layoutMode: "fillParent",
              binding: { kind: "inputText", inputId: textInput.inputId },
            },
            {
              ...common,
              color: memo ? "#475569" : "#172033",
              display: "flex",
              alignItems: "center",
              fontSize: memo ? 48 : 64,
              fontWeight: memo ? 700 : 800,
              lineHeight: memo ? 1.2 : 1.12,
            },
            { structuredRole: "text" },
            branch.id,
          );
        } else {
          const assetId = assets[1] ?? assets[0];
          add(
            {
              type: "image",
              label: state === "on" ? "top_object" : "top_object_off",
              layoutMode: "fillParent",
              fit: "contain",
              binding: assetId ? { kind: "staticAsset", assetId } : undefined,
            },
            { ...common, borderRadius: 0, overflow: "visible" },
            { presetId: "topObject" },
            branch.id,
          );
        }
      }
      root.variantSet = {
        options: [
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ],
        defaultValue: "on",
        inputId: variantInput?.inputId,
        rootByValue: roots,
      };
    }
    linkedInput = true;
  }
  if (presetId === "board")
    document.domains.timetable.rootNodeIds.unshift(root.id);
  else document.domains.timetable.rootNodeIds.push(root.id);
  document.graph.rootNodeIds.push(root.id);
  return { nodeId: root.id, linkedInput };
};
