import type {
  V2TemplateCreationDraft,
  V2TemplateCreationTimePreset,
  V2TemplateCreationWeekDatePreset,
} from "@/types/time-table/template-creation";
import type {
  V2TemplateBuiltinAssetKey,
  V2TemplateCardImageAssetByDayKey,
  V2TemplateCardStructure,
  V2TemplateDayKey,
  V2TemplateRenderConfig,
  V2TemplateStreamingTimeFormat,
  V2TemplateTimetableConfig,
  V2TemplateWeekDateFormat,
} from "@/types/time-table/template-render-config";
import {
  v2_clampTimetableCardComponentCount,
  v2_clampTimetableMultiEntryCount,
  v2_createDefaultSceneTemplateNodeGraph,
  v2_createDefaultTimetableConfig,
  v2_createEmptyTemplateRenderConfig,
  v2_createTimetableMultiEntryFrameStyle,
  v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT,
  v2_normalizeTemplateRenderConfig,
} from "@/utils/v2/template-render-config";

const v2_createThemeNullMap = (themes: string[]) =>
  themes.reduce<Record<string, null>>((acc, theme) => {
    acc[theme] = null;
    return acc;
  }, {});

type V2CreationCardAssetKey = keyof V2TemplateCreationDraft["cardAssets"];

const v2_CREATION_CARD_ASSET_SPECS: Record<
  V2CreationCardAssetKey,
  {
    nodeId: string;
    commonKey: V2TemplateBuiltinAssetKey;
    dayKeyByDay: Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>;
  }
> = {
  online: {
    nodeId: "online-background",
    commonKey: "onlineByTheme",
    dayKeyByDay: {
      mon: "online_mon",
      tue: "online_tue",
      wed: "online_wed",
      thu: "online_thu",
      fri: "online_fri",
      sat: "online_sat",
      sun: "online_sun",
    },
  },
  offline: {
    nodeId: "offline-background",
    commonKey: "offlineByTheme",
    dayKeyByDay: {
      mon: "offline_mon",
      tue: "offline_tue",
      wed: "offline_wed",
      thu: "offline_thu",
      fri: "offline_fri",
      sat: "offline_sat",
      sun: "offline_sun",
    },
  },
  multi: {
    nodeId: "multi-background",
    commonKey: "multiByTheme",
    dayKeyByDay: {
      mon: "multi_mon",
      tue: "multi_tue",
      wed: "multi_wed",
      thu: "multi_thu",
      fri: "multi_fri",
      sat: "multi_sat",
      sun: "multi_sun",
    },
  },
  offlineMemo: {
    nodeId: "offline-memo-background",
    commonKey: "offlineMemoByTheme",
    dayKeyByDay: {
      mon: "offlineMemo_mon",
      tue: "offlineMemo_tue",
      wed: "offlineMemo_wed",
      thu: "offlineMemo_thu",
      fri: "offlineMemo_fri",
      sat: "offlineMemo_sat",
      sun: "offlineMemo_sun",
    },
  },
};

const v2_createCardAssetRefByDayKey = (
  mode: V2CreationCardAssetKey
): V2TemplateCardImageAssetByDayKey => {
  const spec = v2_CREATION_CARD_ASSET_SPECS[mode];
  return Object.entries(spec.dayKeyByDay).reduce<V2TemplateCardImageAssetByDayKey>(
    (acc, [dayKey, assetKey]) => {
      acc[dayKey as V2TemplateDayKey] = {
        source: "builtin",
        key: assetKey,
      };
      return acc;
    },
    {}
  );
};

const v2_applyCreationCardAssetModeToCard = ({
  card,
  mode,
  useByDay,
}: {
  card: V2TemplateCardStructure;
  mode: V2CreationCardAssetKey;
  useByDay: boolean;
}): V2TemplateCardStructure => {
  const spec = v2_CREATION_CARD_ASSET_SPECS[mode];
  const node = card.nodes[spec.nodeId];
  if (!node || node.kind !== "image") return card;

  const nextNode = {
    ...node,
    assetRef: {
      source: "builtin" as const,
      key: spec.commonKey,
    },
    ...(useByDay
      ? { assetRefByDayKey: v2_createCardAssetRefByDayKey(mode) }
      : { assetRefByDayKey: undefined }),
  };

  return {
    ...card,
    nodes: {
      ...card.nodes,
      [spec.nodeId]: nextNode,
    },
  };
};

const v2_applyCreationCardAssetModesToTimetable = (
  timetable: V2TemplateTimetableConfig,
  draft: V2TemplateCreationDraft
): V2TemplateTimetableConfig => {
  const nextComponents = Object.fromEntries(
    Object.entries(timetable.components).map(([componentId, component]) => {
      const nextStates = {
        ...component.states,
      };

      (Object.keys(v2_CREATION_CARD_ASSET_SPECS) as V2CreationCardAssetKey[]).forEach(
        (mode) => {
          const state = nextStates[mode];
          if (!state) return;
          const isAvailable =
            mode === "online" ||
            mode === "offline" ||
            (mode === "multi" && draft.timetable.multipleEnabled) ||
            (mode === "offlineMemo" && draft.timetable.offlineMemoEnabled);
          nextStates[mode] = {
            ...state,
            card: v2_applyCreationCardAssetModeToCard({
              card: state.card,
              mode,
              useByDay: isAvailable && draft.cardAssets[mode] === "byDay",
            }),
          };
        }
      );

      return [
        componentId,
        {
          ...component,
          states: nextStates,
        },
      ];
    })
  );

  return {
    ...timetable,
    components: nextComponents,
  };
};

export const v2_createDefaultTemplateCreationDraft =
  (): V2TemplateCreationDraft => {
    const baseConfig = v2_createEmptyTemplateRenderConfig();
    return {
      metadata: {
        name: "새 템플릿",
        description: "",
      },
      canvas: {
        width: baseConfig.templateSize.width,
        height: baseConfig.templateSize.height,
      },
      theme: {
        defaultTheme: baseConfig.defaultTheme,
        enableThemeSelection: false,
      },
      objects: {
        topObject: {
          enabled: true,
          mode: "singleAsset",
        },
        profile: {
          enabled: true,
          imageRequired: false,
          frameRequired: true,
        },
        artist: {
          enabled: true,
        },
        memo: {
          enabled: true,
        },
        weekDates: {
          enabled: true,
        },
      },
      timetable: {
        layoutMode: "grid3x3",
        flex42ThreeRow: "bottom",
        flex42Align: "center",
        multipleEnabled: true,
        maxEntriesPerDay: 2,
        offlineMemoEnabled: true,
        cardComponentCount: 1,
      },
      cardAssets: {
        online: "common",
        offline: "common",
        multi: "common",
        offlineMemo: "common",
      },
      formats: {
        localePreset: "en",
        timePreset: "h12Prefix",
        weekDatePreset: "mdySlash",
      },
    };
  };

export const v2_resolveCreationThemeOptions = (
  config: Pick<V2TemplateRenderConfig, "themes" | "defaultTheme">
): string[] => {
  const baseThemes =
    config.themes?.length && Array.isArray(config.themes)
      ? config.themes
      : [config.defaultTheme || "first"];
  if (!baseThemes.includes(config.defaultTheme)) {
    return [...baseThemes, config.defaultTheme];
  }
  return baseThemes;
};

export const v2_applyCreationTimePreset = (
  base: V2TemplateStreamingTimeFormat,
  preset: V2TemplateCreationTimePreset
): V2TemplateStreamingTimeFormat => {
  if (preset === "h24") {
    return {
      ...base,
      hourCycle: "h24",
      padHour: true,
      showMeridiem: false,
      meridiemPosition: "suffix",
      meridiemStyle: "upper",
      meridiemSeparator: "",
      timeSeparator: base.timeSeparator || ":",
    };
  }

  if (preset === "h12Suffix") {
    return {
      ...base,
      hourCycle: "h12",
      padHour: true,
      showMeridiem: true,
      meridiemPosition: "suffix",
      meridiemStyle: "upper",
      meridiemSeparator: base.meridiemSeparator || " ",
      timeSeparator: base.timeSeparator || ":",
    };
  }

  return {
    ...base,
    hourCycle: "h12",
    padHour: true,
    showMeridiem: true,
    meridiemPosition: "prefix",
    meridiemStyle: "upper",
    meridiemSeparator: base.meridiemSeparator || " ",
    timeSeparator: base.timeSeparator || ":",
  };
};

export const v2_applyCreationWeekDatePreset = (
  base: V2TemplateWeekDateFormat,
  preset: V2TemplateCreationWeekDatePreset
): V2TemplateWeekDateFormat => {
  if (preset === "ymdSlash") {
    return {
      ...base,
      dateOrder: "ymd",
      monthStyle: "numeric",
      dateStyle: "numeric",
      dateSeparator: "/",
      monthDateSeparator: "/",
      rangeSeparator: " - ",
    };
  }

  if (preset === "mdySlash") {
    return {
      ...base,
      dateOrder: "mdy",
      monthStyle: "numeric",
      dateStyle: "numeric",
      dateSeparator: "/",
      monthDateSeparator: "/",
      rangeSeparator: " - ",
    };
  }

  if (preset === "dmyDot") {
    return {
      ...base,
      dateOrder: "dmy",
      monthStyle: "2-digit",
      dateStyle: "2-digit",
      dateSeparator: ".",
      monthDateSeparator: ".",
      rangeSeparator: " - ",
    };
  }

  return base;
};

export const v2_buildRenderConfigFromCreationDraft = (
  draft: V2TemplateCreationDraft,
  options: {
    fallbackNameSuffix?: string;
  } = {}
): V2TemplateRenderConfig => {
  const normalized = v2_createEmptyTemplateRenderConfig();
  const baseThemeOptions = v2_resolveCreationThemeOptions(normalized);
  const fallbackName =
    options.fallbackNameSuffix && options.fallbackNameSuffix.trim().length > 0
      ? `template_${options.fallbackNameSuffix}`
      : "template_untitled";
  const finalName = draft.metadata.name.trim() || fallbackName;
  const finalDescription =
    draft.metadata.description.trim() || `${finalName} (admin template)`;
  const normalizedMultiEntryCount = draft.timetable.multipleEnabled
    ? v2_clampTimetableMultiEntryCount(draft.timetable.maxEntriesPerDay)
    : v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT;
  const normalizedMaxEntries = draft.timetable.multipleEnabled
    ? normalizedMultiEntryCount
    : 1;
  const normalizedCardComponentCount = v2_clampTimetableCardComponentCount(
    draft.timetable.cardComponentCount
  );
  const width = Math.max(1, Math.round(draft.canvas.width));
  const height = Math.max(1, Math.round(draft.canvas.height));
  const resolvedDefaultTheme = baseThemeOptions.includes(draft.theme.defaultTheme)
    ? draft.theme.defaultTheme
    : baseThemeOptions[0];
  const nextThemeOptions = resolvedDefaultTheme
    ? baseThemeOptions.includes(resolvedDefaultTheme)
      ? baseThemeOptions
      : [...baseThemeOptions, resolvedDefaultTheme]
    : baseThemeOptions;
  const topObjectEnabled =
    draft.objects.topObject.enabled && draft.objects.topObject.mode !== "none";
  const topObjectMode =
    draft.objects.topObject.mode === "statefulAsset"
      ? "statefulAsset"
      : "singleAsset";
  const nextGraph = v2_createDefaultSceneTemplateNodeGraph({
    includeArtist: draft.objects.artist.enabled,
    includeMemo: draft.objects.memo.enabled,
    includeTopObject: topObjectEnabled,
    includeProfile: draft.objects.profile.enabled,
    includeWeekDates: draft.objects.weekDates.enabled,
    topObjectMode,
  });
  let nextTimetable = v2_createDefaultTimetableConfig({
    multiEntryCount: normalizedMultiEntryCount,
    componentCount: normalizedCardComponentCount,
    statusOptions: {
      multi: draft.timetable.multipleEnabled,
      offlineMemo: draft.timetable.offlineMemoEnabled,
    },
  });
  nextTimetable.layoutMode = draft.timetable.layoutMode;
  nextTimetable.flex42Align = draft.timetable.flex42Align;
  nextTimetable.flex42ThreeRow = draft.timetable.flex42ThreeRow;
  nextTimetable = v2_applyCreationCardAssetModesToTimetable(nextTimetable, draft);

  const nextCardLayout = {
    ...normalized.layout.card,
  };
  Array.from({ length: normalizedMultiEntryCount }, (_, entryIndex) => {
    nextCardLayout[`multiEntryFrame${entryIndex + 1}`] =
      v2_createTimetableMultiEntryFrameStyle({
        entryIndex,
        entryCount: normalizedMultiEntryCount,
      });
  });

  const nextExtraAssets = {
    ...normalized.extraAssets,
  };
  const nextExtraAssetDimensions = {
    ...normalized.extraAssetDimensions,
  };
  if (topObjectEnabled && topObjectMode === "statefulAsset") {
    nextExtraAssets["topObject.on"] =
      nextExtraAssets["topObject.on"] ?? v2_createThemeNullMap(nextThemeOptions);
    nextExtraAssets["topObject.off"] =
      nextExtraAssets["topObject.off"] ?? v2_createThemeNullMap(nextThemeOptions);
    nextExtraAssetDimensions["topObject.on"] =
      nextExtraAssetDimensions["topObject.on"] ??
      v2_createThemeNullMap(nextThemeOptions);
    nextExtraAssetDimensions["topObject.off"] =
      nextExtraAssetDimensions["topObject.off"] ??
      v2_createThemeNullMap(nextThemeOptions);
  }

  return v2_normalizeTemplateRenderConfig({
    ...normalized,
    metadata: {
      ...normalized.metadata,
      name: finalName,
      description: finalDescription,
    },
    templateSize: {
      width,
      height,
    },
    weekdayOption: draft.formats.localePreset,
    dayLabelFormat: {
      mode: "preset",
      preset: draft.formats.localePreset,
      custom: {},
    },
    monthOption: draft.formats.localePreset,
    streamingDayFormat: {
      ...normalized.streamingDayFormat,
      locale: draft.formats.localePreset,
      custom: {},
    },
    streamingTimeFormat: v2_applyCreationTimePreset(
      normalized.streamingTimeFormat,
      draft.formats.timePreset
    ),
    weekDateFormat: v2_applyCreationWeekDatePreset(
      {
        ...normalized.weekDateFormat,
        locale: draft.formats.localePreset,
      },
      draft.formats.weekDatePreset
    ),
    themes: nextThemeOptions,
    defaultTheme: resolvedDefaultTheme || normalized.defaultTheme,
    buttonThemes: nextThemeOptions.map((theme) => ({ value: theme, label: theme })),
    formSchema: {
      ...normalized.formSchema,
      fields: normalized.formSchema.fields.filter((field) => {
        if (
          !draft.objects.memo.enabled &&
          field.scope === "global" &&
          field.key === "memoText"
        ) {
          return false;
        }
        if (
          !draft.objects.artist.enabled &&
          field.scope === "global" &&
          field.key === "artistText"
        ) {
          return false;
        }
        if (
          !draft.timetable.offlineMemoEnabled &&
          field.scope === "card" &&
          field.key === "offlineMemo"
        ) {
          return false;
        }
        return true;
      }),
    },
    cardSizes: {
      ...normalized.cardSizes,
      frame: {
        ...normalized.cardSizes.frame,
        width,
        height,
      },
    },
    layout: {
      ...normalized.layout,
      card: nextCardLayout,
      topObjectContainer: {
        ...normalized.layout.topObjectContainer,
        width,
        height,
      },
    },
    graph: nextGraph,
    timetable: nextTimetable,
    editorOptions: {
      ...normalized.editorOptions,
      isArtist: draft.objects.artist.enabled,
      isMemo: draft.objects.memo.enabled,
      isMultiple: draft.timetable.multipleEnabled,
      maxStreamingTimeByDay: normalizedMaxEntries,
      useOnlineAssetsByDay: draft.cardAssets.online === "byDay",
      useMultiAssetsByDay:
        draft.timetable.multipleEnabled && draft.cardAssets.multi === "byDay",
      useOfflineAssetsByDay: draft.cardAssets.offline === "byDay",
      useOfflineMemoAssetsByDay:
        draft.timetable.offlineMemoEnabled &&
        draft.cardAssets.offlineMemo === "byDay",
      enableThemeSelection: draft.theme.enableThemeSelection,
    },
    structureCapabilities: {
      objects: {
        topObject: {
          enabled: topObjectEnabled,
          mode: topObjectEnabled ? draft.objects.topObject.mode : "none",
        },
        profile: {
          enabled: draft.objects.profile.enabled,
          imageRequired:
            draft.objects.profile.enabled && draft.objects.profile.imageRequired,
          frameRequired:
            draft.objects.profile.enabled && draft.objects.profile.frameRequired,
        },
        artist: {
          enabled: draft.objects.artist.enabled,
          mode: draft.objects.artist.enabled ? "textWithStatefulAsset" : "none",
        },
        memo: {
          enabled: draft.objects.memo.enabled,
          mode: draft.objects.memo.enabled ? "statefulAssetWithText" : "none",
        },
        weekDates: {
          enabled: draft.objects.weekDates.enabled,
        },
      },
      timetable: {
        multipleEnabled: draft.timetable.multipleEnabled,
        maxEntriesPerDay: normalizedMaxEntries,
        offlineMemoEnabled: draft.timetable.offlineMemoEnabled,
      },
    },
    extraAssets: nextExtraAssets,
    extraAssetDimensions: nextExtraAssetDimensions,
  });
};
