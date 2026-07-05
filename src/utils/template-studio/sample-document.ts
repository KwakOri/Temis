import {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { createStudioInitialRuntimeValues } from "@/utils/template-studio/input-values";

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const profilePlaceholder = svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#7dd3fc"/>
      <stop offset="1" stop-color="#f9a8d4"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="48" fill="url(#g)"/>
  <circle cx="160" cy="126" r="58" fill="#ffffff" opacity="0.9"/>
  <path d="M70 285c22-68 74-98 90-98s68 30 90 98" fill="#ffffff" opacity="0.9"/>
</svg>
`);

const sparkSticker = svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="36" fill="#111827"/>
  <path d="M91 18l18 52 53 18-52 19-19 52-19-52-52-19 52-18z" fill="#fde047"/>
  <path d="M133 25l8 22 22 8-22 8-8 22-8-22-22-8 22-8z" fill="#f0abfc"/>
</svg>
`);

const heartSticker = svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="36" fill="#fff7ed"/>
  <path d="M90 143S35 111 35 67c0-22 16-38 37-38 11 0 22 6 28 15 7-9 17-15 29-15 20 0 36 16 36 38 0 44-55 76-55 76z" fill="#fb7185"/>
</svg>
`);

export const createInitialStudioRuntimeValues = (
  document: StudioTemplateDocument,
): StudioRuntimeValues =>
  createStudioInitialRuntimeValues(document, { entryCountPerDay: 1 });

export const createSampleStudioDocument = (): StudioTemplateDocument => ({
  schema: "studio_template_document",
  version: 1,
  metadata: {
    editor: "template-studio",
    name: "Template Studio Sample",
    description: "Cards and timetable sample document",
  },
  canvas: {
    width: 960,
    height: 640,
    background: "transparent",
  },
  assets: {
    asset_a1: {
      id: "asset_a1",
      label: "Profile Placeholder",
      src: profilePlaceholder,
    },
    asset_b2: {
      id: "asset_b2",
      label: "Spark Sticker",
      src: sparkSticker,
    },
    asset_c3: {
      id: "asset_c3",
      label: "Heart Sticker",
      src: heartSticker,
    },
  },
  inputs: {
    input_a1: {
      id: "input_a1",
      type: "text",
      scope: "global",
      label: "Display Name",
      placeholder: "Enter a display name",
      defaultValue: "Template Studio",
      maxLength: 32,
    },
    input_c3: {
      id: "input_c3",
      type: "select",
      scope: "entry",
      label: "Entry Sticker",
      defaultValue: "spark",
      options: [
        { value: "none", label: "None" },
        { value: "spark", label: "Spark" },
        { value: "heart", label: "Heart" },
      ],
    },
    input_d4: {
      id: "input_d4",
      type: "text",
      scope: "day",
      label: "Day Note",
      placeholder: "Enter a note for this day",
      defaultValue: "Daily focus",
      maxLength: 40,
    },
    input_e5: {
      id: "input_e5",
      type: "text",
      scope: "entry",
      label: "Entry Memo",
      placeholder: "Enter a memo for this entry",
      defaultValue: "Entry detail",
      maxLength: 48,
    },
  },
  styles: {
    style_canvas_card: {
      position: "absolute",
      left: 90,
      top: 70,
      width: 780,
      height: 500,
      backgroundColor: "#ffffff",
      borderRadius: 24,
      boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
      border: "1px solid rgba(148, 163, 184, 0.35)",
    },
    style_day_label: {
      position: "absolute",
      left: 56,
      top: 54,
      width: 180,
      height: 42,
      fontSize: 26,
      fontWeight: 800,
      color: "#172033",
      display: "flex",
      alignItems: "center",
    },
    style_day_date: {
      position: "absolute",
      left: 56,
      top: 104,
      width: 180,
      height: 34,
      fontSize: 18,
      fontWeight: 800,
      color: "#94a3b8",
      display: "flex",
      alignItems: "center",
    },
    style_title: {
      position: "absolute",
      left: 320,
      top: 96,
      width: 380,
      height: 74,
      fontSize: 42,
      fontWeight: 800,
      color: "#111827",
      display: "flex",
      alignItems: "center",
    },
    style_status_label: {
      position: "absolute",
      left: 322,
      top: 226,
      width: 180,
      height: 34,
      fontSize: 16,
      fontWeight: 800,
      color: "#2563eb",
      display: "flex",
      alignItems: "center",
    },
    style_caption: {
      position: "absolute",
      left: 322,
      top: 178,
      width: 360,
      height: 42,
      fontSize: 18,
      fontWeight: 600,
      color: "#475569",
      display: "flex",
      alignItems: "center",
    },
    style_sticker: {
      position: "absolute",
      left: 605,
      top: 292,
      width: 128,
      height: 128,
      borderRadius: 28,
      overflow: "hidden",
      rotateDeg: -8,
    },
    style_note: {
      position: "absolute",
      left: 56,
      top: 334,
      width: 480,
      height: 74,
      fontSize: 22,
      fontWeight: 700,
      color: "#0f766e",
      display: "flex",
      alignItems: "center",
    },
    style_entry_memo: {
      position: "absolute",
      left: 56,
      top: 412,
      width: 480,
      height: 42,
      fontSize: 16,
      fontWeight: 700,
      color: "#334155",
      display: "flex",
      alignItems: "center",
    },
  },
  graph: {
    rootNodeIds: ["node_a1"],
    nodes: {
      node_a1: {
        id: "node_a1",
        type: "group",
        label: "Template Card",
        parentId: null,
        childIds: [
          "node_c3",
          "node_d4",
          "node_e5",
          "node_f6",
          "node_g7",
          "node_h8",
          "node_i9",
          "node_j10",
        ],
        styleId: "style_canvas_card",
      },
      node_c3: {
        id: "node_c3",
        type: "flexibleText",
        label: "Display Name",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_title",
        binding: {
          kind: "inputText",
          inputId: "input_a1",
        },
      },
      node_d4: {
        id: "node_d4",
        type: "text",
        label: "Selected Sticker Label",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_caption",
        binding: {
          kind: "selectText",
          inputId: "input_c3",
          output: "label",
        },
      },
      node_e5: {
        id: "node_e5",
        type: "image",
        label: "Sticker Preview",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_sticker",
        binding: {
          kind: "selectAsset",
          inputId: "input_c3",
          assetByOption: {
            none: null,
            spark: "asset_b2",
            heart: "asset_c3",
          },
        },
        fit: "cover",
      },
      node_f6: {
        id: "node_f6",
        type: "text",
        label: "Day Note",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_note",
        binding: {
          kind: "inputText",
          inputId: "input_d4",
        },
      },
      node_g7: {
        id: "node_g7",
        type: "text",
        label: "Entry Memo",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_entry_memo",
        binding: {
          kind: "inputText",
          inputId: "input_e5",
        },
      },
      node_h8: {
        id: "node_h8",
        type: "text",
        label: "Day Label",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_day_label",
        binding: {
          kind: "builtinField",
          fieldId: "day.label",
        },
        meta: {
          exception: {
            semanticKey: "dayLabel",
            scope: "cards",
            presetId: "dayLabel",
            lockedStructure: true,
            singleton: true,
            builtInBindings: {
              text: "day.label",
            },
          },
        },
      },
      node_i9: {
        id: "node_i9",
        type: "text",
        label: "Day Date",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_day_date",
        binding: {
          kind: "builtinField",
          fieldId: "day.date",
        },
        meta: {
          exception: {
            semanticKey: "dayDate",
            scope: "cards",
            presetId: "dayDate",
            lockedStructure: true,
            singleton: true,
            builtInBindings: {
              text: "day.date",
            },
          },
        },
      },
      node_j10: {
        id: "node_j10",
        type: "text",
        label: "Entry Status Label",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_status_label",
        binding: {
          kind: "builtinField",
          fieldId: "entry.status_label",
        },
        meta: {
          exception: {
            semanticKey: "entryStatusLabel",
            scope: "cards",
            presetId: "entryStatusLabel",
            lockedStructure: true,
            singleton: true,
            builtInBindings: {
              text: "entry.status_label",
            },
          },
        },
      },
    },
  },
  domains: {
    timetable: {
      version: 1,
      canvas: {
        width: 4000,
        height: 2250,
        backgroundColor: "#eef2f7",
      },
      week: {
        startDate: "2026-07-01",
        endDate: "2026-07-07",
      },
      capabilities: {
        multi: { enabled: false },
        offlineMemo: { enabled: false },
      },
      mountNodeId: "node_a1",
      dayIds: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      days: {
        mon: {
          id: "mon",
          label: "Monday",
          shortLabel: "Mon",
          date: "2026-07-01",
          order: 0,
        },
        tue: {
          id: "tue",
          label: "Tuesday",
          shortLabel: "Tue",
          date: "2026-07-02",
          order: 1,
        },
        wed: {
          id: "wed",
          label: "Wednesday",
          shortLabel: "Wed",
          date: "2026-07-03",
          order: 2,
        },
        thu: {
          id: "thu",
          label: "Thursday",
          shortLabel: "Thu",
          date: "2026-07-04",
          order: 3,
        },
        fri: {
          id: "fri",
          label: "Friday",
          shortLabel: "Fri",
          date: "2026-07-05",
          order: 4,
        },
        sat: {
          id: "sat",
          label: "Saturday",
          shortLabel: "Sat",
          date: "2026-07-06",
          order: 5,
        },
        sun: {
          id: "sun",
          label: "Sunday",
          shortLabel: "Sun",
          date: "2026-07-07",
          order: 6,
        },
      },
      dayCardsLayout: {
        left: 434,
        top: 760,
        dayWidth: 420,
        dayGap: 32,
        padding: 28,
        headerHeight: 76,
        entryPreviewWidth: 360,
        entryPreviewHeight: 212,
        entryGap: 24,
      },
      composition: {
        rootObjectIds: ["day-cards"],
        objects: {
          "day-cards": {
            id: "day-cards",
            kind: "generatedDayCards",
            label: "Day Card Containers",
            presetId: "dayCards",
            style: {},
            meta: {
              exception: {
                semanticKey: "dayCardContainers",
                scope: "timetable",
                presetId: "dayCards",
                lockedStructure: true,
                singleton: true,
                builtInBindings: {
                  dayLabel: "day.short_label",
                  dayDate: "day.date",
                  statusLabel: "entry.status_label",
                },
              },
            },
          },
        },
      },
      statuses: {
        online: {
          id: "online",
          label: "Online",
          kind: "base",
          baseStatus: "online",
        },
        offline: {
          id: "offline",
          label: "Offline",
          kind: "base",
          baseStatus: "offline",
        },
      },
      components: {
        defaultEntryCard: {
          id: "defaultEntryCard",
          label: "Default entry card",
          defaultStatusId: "online",
          variants: {
            online: {
              statusId: "online",
              rootNodeId: "node_a1",
            },
            offline: {
              statusId: "offline",
              rootNodeId: "node_a1",
            },
          },
        },
      },
      entryComponentId: "defaultEntryCard",
      defaultEntryStatusId: "online",
      maxEntriesPerDay: 3,
    },
  },
});
