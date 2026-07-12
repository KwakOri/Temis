import {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { createStudioInitialRuntimeValues } from "@/utils/template-studio/input-values";
import { ensureStudioIndependentStatusVariants } from "@/utils/template-studio/status-variants";
import { createStudioStatusCardBackgroundExceptionMeta } from "@/utils/template-studio/status-card-background";

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

const defaultCardBackground = svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 500">
  <rect width="780" height="500" rx="24" fill="#ffffff"/>
</svg>
`);

export const createInitialStudioRuntimeValues = (
  document: StudioTemplateDocument,
): StudioRuntimeValues =>
  createStudioInitialRuntimeValues(document, { entryCountPerDay: 1 });

const ensureIndependentSampleVariants = (
  document: StudioTemplateDocument,
): StudioTemplateDocument => {
  ensureStudioIndependentStatusVariants(document);
  return document;
};

export const createSampleStudioDocument = (): StudioTemplateDocument =>
  ensureIndependentSampleVariants({
  schema: "studio_template_document",
  version: 4,
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
    asset_background: {
      id: "asset_background",
      label: "Default Card Background",
      src: defaultCardBackground,
    },
  },
  inputs: {},
  styles: {
    style_canvas_card: {
      position: "absolute",
      left: 90,
      top: 70,
      width: 780,
      height: 500,
      backgroundColor: "transparent",
    },
    style_background: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 780,
      height: 500,
      backgroundColor: "#ffffff",
      borderRadius: 24,
      boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
      border: "1px solid rgba(148, 163, 184, 0.35)",
      overflow: "hidden",
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
    style_main_title: {
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
    style_time: {
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
    style_sub_title: {
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
    style_entry_group_1: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 780,
      height: 500,
      overflow: "visible",
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
        childIds: ["node_b2", "node_i9", "node_h8", "node_entry_group_1"],
        styleId: "style_canvas_card",
      },
      node_b2: {
        id: "node_b2",
        type: "group",
        label: "background",
        parentId: "node_a1",
        childIds: [],
        styleId: "style_background",
        assetSlots: {
          online: {
            assetId: "asset_background",
            fit: "cover",
          },
          offline: {
            assetId: "asset_background",
            fit: "cover",
          },
        },
        meta: {
          exception: createStudioStatusCardBackgroundExceptionMeta({
            online: {
              assetId: "asset_background",
              fit: "cover",
            },
            offline: {
              assetId: "asset_background",
              fit: "cover",
            },
          }),
        },
      },
      node_c3: {
        id: "node_c3",
        type: "flexibleText",
        label: "main_title",
        parentId: "node_entry_group_1",
        childIds: [],
        styleId: "style_main_title",
        binding: {
          kind: "builtinField",
          fieldId: "entry.main_title",
        },
      },
      node_d4: {
        id: "node_d4",
        type: "flexibleText",
        label: "sub_title",
        parentId: "node_entry_group_1",
        childIds: [],
        styleId: "style_sub_title",
        binding: {
          kind: "builtinField",
          fieldId: "entry.sub_title",
        },
      },
      node_e5: {
        id: "node_e5",
        type: "text",
        label: "time",
        parentId: "node_entry_group_1",
        childIds: [],
        styleId: "style_time",
        binding: {
          kind: "builtinField",
          fieldId: "entry.time",
        },
      },
      node_entry_group_1: {
        id: "node_entry_group_1",
        type: "group",
        label: "Entry Group 1",
        parentId: "node_a1",
        childIds: ["node_e5", "node_d4", "node_c3"],
        styleId: "style_entry_group_1",
        meta: { entrySlot: { index: 0 } },
      },
      node_h8: {
        id: "node_h8",
        type: "text",
        label: "day",
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
        label: "date",
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
    },
  },
  domains: {
    timetable: {
      version: 2,
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
        gridPreset: "1x7",
        columns: 7,
        rows: 1,
        dayGap: 32,
        columnGap: 32,
        rowGap: 32,
        fillOrder: "row",
        alignLastRow: "start",
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
          frame: {
            left: 160,
            top: 120,
            width: 780,
            height: 500,
          },
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
      maxEntriesPerDay: 2,
    },
  },
});
