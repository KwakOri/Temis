import type {
  StudioAssetMap,
  StudioBinding,
  StudioStyleRecord,
} from "../../src/types/template-studio";
import type { StudioTimetableGraphNode } from "../../src/types/studio-timetable-graph";
import { createStudioTimetableGraphDocument } from "../../src/utils/template-studio/timetable-graph-document";
import { insertStudioTimetableGraphPreset } from "../../src/utils/template-studio/timetable-graph-presets";
import { createStudioInitialRuntimeValues } from "../../src/utils/template-studio/input-values";
import { createStudioStatusCardBackgroundExceptionMeta } from "../../src/utils/template-studio/status-card-background";
import { parseStudioWebFontCss } from "../../src/utils/template-studio/web-fonts";

export const CASE02_NAME = "Figma CASE_02 · Blue Weekly Schedule";
export const CASE02_SOURCE =
  "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/temis?node-id=1588-6807";

export const CASE02_ASSET_IDS = [
  "board",
  "plate",
  "frame",
  "top-object",
  "artist-background",
  "online-background",
  "online-header",
  "online-paw",
  "offline-background",
  "offline-header",
  "offline-paw",
  "time-pill",
] as const;

/** A native, editable v8 document. Decorations are exported independently of data text. */
export function createFigmaCase02Template(assets: StudioAssetMap) {
  const document = createStudioTimetableGraphDocument();
  document.metadata.name = CASE02_NAME;
  document.metadata.description = `${CASE02_SOURCE}\n제주돌담체 웹 임베딩 조건은 게시 전에 별도 확인 필요.`;
  document.canvas = { width: 1035, height: 904, background: "transparent" };
  const timetable = document.domains.timetable;
  timetable.canvas = { width: 4000, height: 2250, backgroundColor: "#b4cdfc" };
  timetable.dayCardsLayout = {
    left: 1654,
    top: 79,
    dayWidth: 715,
    entryPreviewWidth: 715,
    entryPreviewHeight: 644,
    padding: 0,
    headerHeight: 0,
    entryGap: 0,
    dayGap: 12,
    columns: 3,
    rows: 3,
    columnGap: 12,
    rowGap: 8,
    gridPreset: "3x3",
    emptySlotIndexes: [1, 2],
    fillOrder: "row",
    alignLastRow: "start",
    dayOffsets: {},
  };
  document.graph = {
    rootNodeIds: ["day-cards"],
    nodes: {
      "day-cards": {
        id: "day-cards",
        type: "group",
        label: "Day Card Containers",
        parentId: null,
        childIds: [],
        styleId: "day-cards-style",
      },
    },
  };
  document.styles = { "day-cards-style": { opacity: 1, rotateDeg: 0 } };
  document.assets = {};
  document.inputs = {};
  for (const id of CASE02_ASSET_IDS) {
    const asset = assets[id];
    if (
      !asset ||
      asset.id !== id ||
      asset.storageProvider !== "r2" ||
      !asset.src.startsWith("https://") ||
      asset.publicUrl !== asset.src ||
      !asset.storagePath ||
      !asset.contentHash ||
      !asset.mimeType ||
      !asset.byteSize
    ) {
      throw new Error(`CASE_02 requires synced R2 asset metadata: ${id}`);
    }
    document.assets[id] = structuredClone(asset);
  }
  const css = [
    {
      id: "case02-kcc",
      label: "KCC 간판체",
      family: "KCC Ganpan",
      src: "https://cdn.jsdelivr.net/gh/fonts-archive/KCCGanpan/KCC-Ganpan.woff2",
    },
    {
      id: "case02-jeju",
      label: "제주돌담체 · 임베딩 조건 확인 필요",
      family: "JejuStoneWall",
      src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2210-EF@1.0/EF_jejudoldam.woff2",
    },
  ].map((font) => {
    const parsed = parseStudioWebFontCss(
      `@font-face { font-family: '${font.family}'; src: url('${font.src}') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }`,
    );
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    return {
      id: font.id,
      label: font.label,
      cssText: parsed.cssText,
      enabled: true,
    };
  });
  document.resources = { webFonts: css, defaultFontFamily: "KCC Ganpan" };
  const add = (
    id: string,
    type: StudioTimetableGraphNode["type"],
    parentId: string | null,
    style: StudioStyleRecord,
    extra: Partial<StudioTimetableGraphNode> = {},
  ) => {
    const node: StudioTimetableGraphNode = {
      id,
      type,
      label: id,
      parentId,
      childIds: [],
      styleId: `${id}-style`,
      ...extra,
    };
    document.graph.nodes[id] = node;
    document.styles[node.styleId!] = { position: "absolute", ...style };
    if (parentId) document.graph.nodes[parentId].childIds.push(id);
    else document.graph.rootNodeIds.push(id);
    return node;
  };
  const image = (
    id: string,
    assetId: string,
    parentId: string,
    left: number,
    top: number,
    width: number,
    height: number,
  ) =>
    add(
      id,
      "image",
      parentId,
      { left, top, width, height },
      { fit: "fill", binding: { kind: "staticAsset", assetId } },
    );
  const text = (
    id: string,
    parentId: string,
    left: number,
    top: number,
    width: number,
    height: number,
    fontSize: number,
    color: string,
    binding: StudioBinding,
    lineHeight = 1.38,
  ) =>
    add(
      id,
      binding.kind === "builtinField" && binding.fieldId.startsWith("entry.")
        ? "flexibleText"
        : "text",
      parentId,
      {
        left,
        top,
        width,
        height,
        fontSize,
        fontFamily: "KCC Ganpan",
        fontWeight: 400,
        lineHeight,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      },
      { binding },
    );

  for (const status of ["online", "offline"] as const) {
    const root = add(
      `${status}-card`,
      "group",
      null,
      { left: 160, top: 120, width: 715, height: 644, overflow: "visible" },
      { label: `CASE_02 ${status}` },
    );
    const background = add(
      `${status}-background`,
      "group",
      root.id,
      {
        left: status === "online" ? 29.044 : 27.907,
        top: status === "online" ? 22.554 : 22.054,
        width: status === "online" ? 685.959 : 682,
        height: status === "online" ? 628.446 : 630,
      },
      {
        assetSlots: { asset: { assetId: `${status}-background`, fit: "fill" } },
        meta: {
          exception: createStudioStatusCardBackgroundExceptionMeta({
            assetId: `${status}-background`,
            fit: "fill",
          }),
        },
      },
    );
    void background;
    image(
      `${status}-header`,
      `${status}-header`,
      root.id,
      status === "online" ? 30.51 : 30.49,
      23.554,
      377,
      133,
    );
    image(`${status}-paw`, `${status}-paw`, root.id, 0, 0, 179, 165);
    const day = text(
      `${status}-day`,
      root.id,
      status === "online" ? 201.06 : 190.89,
      46,
      136.28,
      82.59,
      60,
      "#ffffff",
      {
        kind: "builtinField",
        fieldId: "day.label",
        dayLabelFormat: "shortUpper",
      },
    );
    day.meta = {
      exception: {
        semanticKey: "dayLabel",
        scope: "cards",
        presetId: "dayLabel",
        lockedStructure: true,
        singleton: true,
        builtInBindings: { text: "day.label" },
      },
    };
    const date = text(
      `${status}-date`,
      root.id,
      status === "online" ? 476 : 471.09,
      48,
      140.74,
      77.01,
      50,
      status === "online" ? "#4a628c" : "#546173",
      { kind: "builtinField", fieldId: "day.date" },
    );
    date.meta = {
      exception: {
        semanticKey: "dayDate",
        scope: "cards",
        presetId: "dayDate",
        lockedStructure: true,
        singleton: true,
        builtInBindings: { text: "day.date" },
      },
    };
    const entry = add(
      `${status}-entry`,
      "group",
      root.id,
      { left: 0, top: 0, width: 715, height: 644, overflow: "visible" },
      { label: "Entry Group 1", meta: { entrySlot: { index: 0 } } },
    );
    if (status === "online") {
      image(
        "online-time-pill",
        "time-pill",
        entry.id,
        218.935,
        531.272,
        304,
        74,
      );
      text("online-time", entry.id, 268.2, 536.969, 208, 62, 45, "#ffffff", {
        kind: "builtinField",
        fieldId: "entry.time",
        timeFormat: "half",
        timeAmText: "AM",
        timePmText: "PM",
      });
      text("online-sub-title", entry.id, 181.063, 193, 381, 69, 50, "#a2c9ec", {
        kind: "builtinField",
        fieldId: "entry.sub_title",
      });
      text(
        "online-main-title",
        entry.id,
        152.148,
        270.868,
        437,
        222,
        90,
        "#4a628c",
        { kind: "builtinField", fieldId: "entry.main_title" },
        1.23,
      );
    } else {
      // Static wording remains an editable text node in the Offline design.
      text(
        "offline-label",
        root.id,
        221.034,
        247.778,
        302.527,
        229.92,
        120,
        "#717f91",
        { kind: "staticText", value: "OFF\nLINE" },
        0.86,
      );
    }
  }
  timetable.mountNodeId = "online-card";
  timetable.components = {
    defaultEntryCard: {
      id: "defaultEntryCard",
      label: "CASE_02 Card",
      defaultStatusId: "online",
      frame: { left: 160, top: 120, width: 715, height: 644 },
      variants: {
        online: { statusId: "online", rootNodeId: "online-card" },
        offline: { statusId: "offline", rootNodeId: "offline-card" },
      },
    },
  };
  const preset = (id: Parameters<typeof insertStudioTimetableGraphPreset>[1]) =>
    insertStudioTimetableGraphPreset(document, id).nodeId;
  const setStyle = (id: string, style: StudioStyleRecord) => {
    document.styles[document.graph.nodes[id].styleId!] = {
      position: "absolute",
      ...style,
    };
  };
  const fullCanvas = {
    left: 0,
    top: 0,
    width: 4000,
    height: 2250,
    overflow: "visible",
  };
  const board = preset("board");
  document.graph.nodes[board].binding = {
    kind: "staticAsset",
    assetId: "board",
  };
  document.graph.nodes[board].fit = "fill";
  const profile = preset("profileBlock");
  setStyle(profile, fullCanvas);
  for (const childId of document.graph.nodes[profile].childIds) {
    const node = document.graph.nodes[childId];
    const role = timetable.nodeExtensions[childId].profileRole;
    node.fit = "fill";
    if (role === "userImage") {
      // Figma has a solid blue placeholder; the real user image stays dynamic.
      setStyle(childId, {
        left: 91.198,
        top: 210.73,
        width: 1346.766,
        height: 1772.281,
        rotateDeg: -5.89163,
        backgroundColor: "#89b4fd",
      });
      node.fit = "cover";
      if (node.binding?.kind === "inputImage") {
        const input = document.inputs[node.binding.inputId];
        if (input.type === "image")
          input.defaultUrl =
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="1347" height="1772"><rect width="1347" height="1772" fill="#89b4fd"/></svg>',
            );
      }
    } else {
      setStyle(childId, fullCanvas);
      node.binding = {
        kind: "staticAsset",
        assetId: role === "frame" ? "frame" : "plate",
      };
    }
  }
  const top = preset("topObject");
  setStyle(top, fullCanvas);
  for (const branchId of document.graph.nodes[top].childIds) {
    setStyle(branchId, fullCanvas);
    for (const id of document.graph.nodes[branchId].childIds) {
      setStyle(id, fullCanvas);
      document.graph.nodes[id].binding = {
        kind: "staticAsset",
        assetId: "top-object",
      };
    }
  }
  const artist = preset("artistProfileText");
  setStyle(artist, fullCanvas);
  for (const branchId of document.graph.nodes[artist].childIds) {
    setStyle(branchId, fullCanvas);
    for (const id of document.graph.nodes[branchId].childIds) {
      const node = document.graph.nodes[id];
      node.layoutMode = "fixed";
      if (timetable.nodeExtensions[id].structuredRole === "background") {
        setStyle(id, fullCanvas);
        node.binding = { kind: "staticAsset", assetId: "artist-background" };
        node.fit = "fill";
      } else {
        // Converted once from Figma bounding box to CSS center rotation coordinates.
        setStyle(id, {
          left: 288.205,
          top: 2034.247,
          width: 477.774,
          height: 74,
          rotateDeg: -4.02,
          fontSize: 60,
          fontFamily: "KCC Ganpan",
          fontWeight: 400,
          lineHeight: 1.23,
          color: "#4a628c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        });
        if (node.binding?.kind === "inputText") {
          const input = document.inputs[node.binding.inputId];
          if (input.type === "text") input.defaultValue = "작가명 적는곳";
        }
      }
    }
  }
  const dates = preset("weekDates");
  document.graph.nodes[dates].binding = {
    kind: "builtinField",
    fieldId: "week.date_range",
    dateRangeFormat: "custom",
    dateRangeTemplate:
      "${start.YYYY}.${start.MM}.${start.DD} ~ ${end.YYYY}.${end.MM}.${end.DD}",
  };
  setStyle(dates, {
    left: 2624,
    top: 146.5,
    width: 968,
    height: 80,
    fontFamily: "JejuStoneWall",
    fontSize: 64,
    lineHeight: 1,
    letterSpacing: -1.1,
    whiteSpace: "nowrap",
    fontWeight: 400,
    color: "#2c415c",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  // Match Figma paint order while leaving the generated cards under the decorations.
  timetable.rootNodeIds = [board, profile, "day-cards", top, artist, dates];
  const runtimeValues = createStudioInitialRuntimeValues(document);
  runtimeValues.timetable.weekStartDate = "2026-05-25";
  for (const dayId of timetable.dayIds) {
    const entry = runtimeValues.timetable.entriesByDay[dayId][0];
    entry.mainTitle = "메인 타이틀\n적는곳";
    entry.subTitle = "서브타이틀 적는곳";
    entry.time = "21:00";
    entry.statusId = dayId === "tue" ? "offline" : "online";
  }
  return { document, runtimeValues };
}
