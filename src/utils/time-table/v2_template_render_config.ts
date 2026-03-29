import { CardInputConfig, SimpleFieldConfig } from "@/types/time-table/data";
import {
  v2_TEMPLATE_COLOR_KEYS,
  v2_TEMPLATE_RENDER_CONFIG_VERSION,
  V2TemplateColorPalette,
  V2TemplateRenderConfig,
} from "@/types/time-table/v2_template_render_config";

const v2_DEFAULT_THEME = "first";

const v2_DEFAULT_CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: "time",
      type: "time",
      placeholder: "10:00",
      required: true,
      defaultValue: "10:00",
    },
    {
      key: "mainTitle",
      type: "textarea",
      placeholder: "메인 타이틀\n적는 곳",
      defaultValue: "",
      maxLength: 200,
    },
    {
      key: "subTitle",
      type: "text",
      placeholder: "서브 타이틀 적는 곳",
      defaultValue: "",
      maxLength: 50,
    },
  ],
  showLabels: false,
  offlineToggle: {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  },
};

const v2_DEFAULT_COLOR_PALETTE: V2TemplateColorPalette = {
  primary: "",
  secondary: "",
  tertiary: "",
  quaternary: "",
};

export const v2_DEFAULT_TEMPLATE_RENDER_CONFIG: V2TemplateRenderConfig = {
  version: v2_TEMPLATE_RENDER_CONFIG_VERSION,
  metadata: {
    schema: "v2_template_render_config",
    name: "v2 template default",
    description: "_v2_template 기본 렌더링 설정",
  },
  templateSize: {
    width: 4000,
    height: 2250,
  },
  weekdayOption: "en",
  monthOption: "en",
  themes: [v2_DEFAULT_THEME],
  defaultTheme: v2_DEFAULT_THEME,
  buttonThemes: [{ value: v2_DEFAULT_THEME, label: v2_DEFAULT_THEME }],
  baseFonts: {
    primary: "Escoredream",
    secondary: "",
    tertiary: "",
    quaternary: "",
  },
  baseColors: {
    first: {
      primary: "#86889B",
      secondary: "#BBBBBB",
      tertiary: "#FFFFFF",
      quaternary: "#A7A7A7",
    },
    second: { ...v2_DEFAULT_COLOR_PALETTE },
    third: { ...v2_DEFAULT_COLOR_PALETTE },
  },
  componentColors: {
    MAIN_TITLE: "#86889B",
    SUB_TITLE: "#BBBBBB",
    STREAMING_TIME: "#FFFFFF",
    STREAMING_DATE: "#FFFFFF",
    STREAMING_DAY: "",
    ARTIST: "",
    WEEKLY_FLAG: "#A7A7A7",
  },
  componentFonts: {
    MAIN_TITLE: "Escoredream",
    SUB_TITLE: "Escoredream",
    STREAMING_TIME: "Escoredream",
    STREAMING_DATE: "Escoredream",
    STREAMING_DAY: "Escoredream",
    ARTIST: "Escoredream",
    WEEKLY_FLAG: "Escoredream",
  },
  maxFontSizes: {
    MAIN_TITLE: 70,
    SUB_TITLE: 42,
    ARTIST: 0,
  },
  cardSizes: {
    online: {
      width: 634,
      height: 558,
    },
    offline: {
      width: 634,
      height: 558,
    },
    profile: {
      width: 1300,
      height: 1770,
    },
    frame: {
      width: 4000,
      height: 2250,
    },
  },
  profileTextPlaceholder: "",
  cardInputConfig: v2_DEFAULT_CARD_INPUT_CONFIG,
  assets: {
    bgByTheme: {
      first: null,
    },
    topObjectByTheme: {
      first: null,
    },
    onlineByTheme: {
      first: null,
    },
    offlineByTheme: {
      first: null,
    },
    profileFrameByTheme: {
      first: null,
    },
    profileBgByTheme: {
      first: null,
    },
  },
  layout: {
    grid: {
      right: 264,
      top: 244,
      rowGap: 32,
      columnGap: 72,
      columns: 3,
    },
    weekFlag: {
      fontSize: 68,
      fontWeight: 500,
      width: 1000,
      height: 100,
      top: 664,
      left: 1848,
    },
    topObjectContainer: {
      width: 4000,
      height: 2250,
      zIndex: 30,
    },
    profileImage: {
      top: 264,
      left: 218,
      rotateDeg: -6.7,
      zIndex: 10,
    },
    profileFrame: {
      zIndex: 20,
    },
    cell: {
      streamingDay: {
        fontSize: 64,
        height: 80,
        width: 300,
        top: 48,
      },
      streamingDate: {
        width: 120,
        height: 120,
        lineHeight: 1,
        fontSize: 62,
        fontWeight: 600,
        letterSpacing: -1,
        marginTop: 4,
      },
      streamingTime: {
        width: 312,
        height: 80,
        lineHeight: 1,
        fontSize: 38,
        top: 476,
      },
      mainTitleContainer: {
        height: 192,
        widthPercent: 80,
        top: 230,
      },
      subTitleContainer: {
        widthPercent: 80,
        height: 80,
        top: 152,
      },
      contentArea: {
        width: 612,
        height: 528,
        top: 30,
        marginLeft: 16,
      },
    },
  },
};

const v2_isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const v2_isFieldType = (
  value: unknown
): value is SimpleFieldConfig["type"] => {
  return (
    value === "text" ||
    value === "textarea" ||
    value === "time" ||
    value === "date" ||
    value === "select" ||
    value === "number"
  );
};

const v2_asString = (value: unknown, fallback: string): string => {
  return typeof value === "string" ? value : fallback;
};

const v2_asNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const v2_asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const next = value.filter((item): item is string => typeof item === "string");
  return next.length > 0 ? next : fallback;
};

const v2_clone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const v2_isCardInputConfig = (value: unknown): value is CardInputConfig => {
  if (!v2_isRecord(value) || !Array.isArray(value.fields)) return false;

  const areFieldsValid = value.fields.every((field) => {
    if (!v2_isRecord(field)) return false;
    if (typeof field.key !== "string") return false;
    if (!v2_isFieldType(field.type)) return false;
    if (typeof field.placeholder !== "string") return false;

    if (field.label !== undefined && typeof field.label !== "string") return false;
    if (field.required !== undefined && typeof field.required !== "boolean")
      return false;
    if (
      field.maxLength !== undefined &&
      (typeof field.maxLength !== "number" || !Number.isFinite(field.maxLength))
    ) {
      return false;
    }

    if (field.defaultValue !== undefined) {
      const validDefault =
        typeof field.defaultValue === "string" ||
        typeof field.defaultValue === "number";
      if (!validDefault) return false;
    }

    if (field.isOffline !== undefined && typeof field.isOffline !== "boolean") {
      return false;
    }

    if (field.options !== undefined) {
      if (!Array.isArray(field.options)) return false;
      const optionsValid = field.options.every(
        (option) =>
          v2_isRecord(option) &&
          typeof option.value === "string" &&
          typeof option.label === "string"
      );
      if (!optionsValid) return false;
    }

    return true;
  });

  if (!areFieldsValid) return false;

  if (
    value.showLabels !== undefined &&
    typeof value.showLabels !== "boolean"
  ) {
    return false;
  }

  if (value.offlineToggle !== undefined) {
    if (!v2_isRecord(value.offlineToggle)) return false;
    if (typeof value.offlineToggle.label !== "string") return false;
    if (typeof value.offlineToggle.activeColor !== "string") return false;
    if (typeof value.offlineToggle.inactiveColor !== "string") return false;
  }

  return true;
};

const v2_mergeThemeStringMap = (
  base: Record<string, string | null>,
  candidate: unknown
): Record<string, string | null> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, string | null> = { ...base };

  Object.entries(candidate).forEach(([theme, value]) => {
    if (typeof value === "string" || value === null) {
      merged[theme] = value as string | null;
    }
  });

  return merged;
};

const v2_mergePaletteMap = (
  base: Record<string, V2TemplateColorPalette>,
  candidate: unknown
): Record<string, V2TemplateColorPalette> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, V2TemplateColorPalette> = { ...base };

  Object.entries(candidate).forEach(([theme, value]) => {
    if (!v2_isRecord(value)) return;

    const fallbackPalette =
      merged[theme] ??
      v2_clone<V2TemplateColorPalette>(v2_DEFAULT_COLOR_PALETTE);

    merged[theme] = {
      primary: v2_asString(value.primary, fallbackPalette.primary),
      secondary: v2_asString(value.secondary, fallbackPalette.secondary),
      tertiary: v2_asString(value.tertiary, fallbackPalette.tertiary),
      quaternary: v2_asString(value.quaternary, fallbackPalette.quaternary),
    };
  });

  return merged;
};

const v2_mergeKeyedStringMap = (
  base: Record<string, string>,
  candidate: unknown,
  allowedKeys: readonly string[]
): Record<string, string> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, string> = { ...base };

  allowedKeys.forEach((key) => {
    merged[key] = v2_asString(candidate[key], merged[key]);
  });

  return merged;
};

export const v2_createDefaultTemplateRenderConfig = (): V2TemplateRenderConfig => {
  return v2_clone(v2_DEFAULT_TEMPLATE_RENDER_CONFIG);
};

export const v2_normalizeTemplateRenderConfig = (
  raw: unknown
): V2TemplateRenderConfig => {
  const normalized = v2_createDefaultTemplateRenderConfig();

  if (!v2_isRecord(raw)) {
    return normalized;
  }

  if (v2_isRecord(raw.metadata)) {
    normalized.metadata = {
      schema: "v2_template_render_config",
      name: v2_asString(raw.metadata.name, normalized.metadata.name),
      description: v2_asString(
        raw.metadata.description,
        normalized.metadata.description
      ),
    };
  }

  if (v2_isRecord(raw.templateSize)) {
    normalized.templateSize = {
      width: v2_asNumber(raw.templateSize.width, normalized.templateSize.width),
      height: v2_asNumber(
        raw.templateSize.height,
        normalized.templateSize.height
      ),
    };
  }

  if (
    raw.weekdayOption === "kr" ||
    raw.weekdayOption === "en" ||
    raw.weekdayOption === "jp"
  ) {
    normalized.weekdayOption = raw.weekdayOption;
  }

  if (
    raw.monthOption === "kr" ||
    raw.monthOption === "en" ||
    raw.monthOption === "jp"
  ) {
    normalized.monthOption = raw.monthOption;
  }

  normalized.themes = v2_asStringArray(raw.themes, normalized.themes);
  normalized.defaultTheme = v2_asString(raw.defaultTheme, normalized.defaultTheme);

  if (Array.isArray(raw.buttonThemes)) {
    const parsed = raw.buttonThemes
      .filter(v2_isRecord)
      .map((theme) => ({
        value: v2_asString(theme.value, ""),
        label: v2_asString(theme.label, ""),
      }))
      .filter((theme) => theme.value && theme.label);

    if (parsed.length > 0) {
      normalized.buttonThemes = parsed;
    }
  }

  if (v2_isRecord(raw.baseFonts)) {
    normalized.baseFonts = {
      primary: v2_asString(raw.baseFonts.primary, normalized.baseFonts.primary),
      secondary: v2_asString(
        raw.baseFonts.secondary,
        normalized.baseFonts.secondary
      ),
      tertiary: v2_asString(raw.baseFonts.tertiary, normalized.baseFonts.tertiary),
      quaternary: v2_asString(
        raw.baseFonts.quaternary,
        normalized.baseFonts.quaternary
      ),
    };
  }

  normalized.baseColors = v2_mergePaletteMap(
    normalized.baseColors,
    raw.baseColors
  );

  normalized.componentColors = v2_mergeKeyedStringMap(
    normalized.componentColors,
    raw.componentColors,
    v2_TEMPLATE_COLOR_KEYS
  );

  normalized.componentFonts = v2_mergeKeyedStringMap(
    normalized.componentFonts,
    raw.componentFonts,
    v2_TEMPLATE_COLOR_KEYS
  );

  if (v2_isRecord(raw.maxFontSizes)) {
    normalized.maxFontSizes = {
      MAIN_TITLE: v2_asNumber(
        raw.maxFontSizes.MAIN_TITLE,
        normalized.maxFontSizes.MAIN_TITLE
      ),
      SUB_TITLE: v2_asNumber(
        raw.maxFontSizes.SUB_TITLE,
        normalized.maxFontSizes.SUB_TITLE
      ),
      ARTIST: v2_asNumber(raw.maxFontSizes.ARTIST, normalized.maxFontSizes.ARTIST),
    };
  }

  if (v2_isRecord(raw.cardSizes)) {
    const cardSizes = normalized.cardSizes;

    if (v2_isRecord(raw.cardSizes.online)) {
      cardSizes.online = {
        width: v2_asNumber(raw.cardSizes.online.width, cardSizes.online.width),
        height: v2_asNumber(
          raw.cardSizes.online.height,
          cardSizes.online.height
        ),
      };
    }

    if (v2_isRecord(raw.cardSizes.offline)) {
      cardSizes.offline = {
        width: v2_asNumber(raw.cardSizes.offline.width, cardSizes.offline.width),
        height: v2_asNumber(
          raw.cardSizes.offline.height,
          cardSizes.offline.height
        ),
      };
    }

    if (v2_isRecord(raw.cardSizes.profile)) {
      cardSizes.profile = {
        width: v2_asNumber(raw.cardSizes.profile.width, cardSizes.profile.width),
        height: v2_asNumber(
          raw.cardSizes.profile.height,
          cardSizes.profile.height
        ),
      };
    }

    if (v2_isRecord(raw.cardSizes.frame)) {
      cardSizes.frame = {
        width: v2_asNumber(raw.cardSizes.frame.width, cardSizes.frame.width),
        height: v2_asNumber(raw.cardSizes.frame.height, cardSizes.frame.height),
      };
    }
  }

  normalized.profileTextPlaceholder = v2_asString(
    raw.profileTextPlaceholder,
    normalized.profileTextPlaceholder
  );

  if (v2_isCardInputConfig(raw.cardInputConfig)) {
    normalized.cardInputConfig = raw.cardInputConfig;
  }

  if (v2_isRecord(raw.assets)) {
    normalized.assets = {
      bgByTheme: v2_mergeThemeStringMap(
        normalized.assets.bgByTheme,
        raw.assets.bgByTheme
      ),
      topObjectByTheme: v2_mergeThemeStringMap(
        normalized.assets.topObjectByTheme,
        raw.assets.topObjectByTheme
      ),
      onlineByTheme: v2_mergeThemeStringMap(
        normalized.assets.onlineByTheme,
        raw.assets.onlineByTheme
      ),
      offlineByTheme: v2_mergeThemeStringMap(
        normalized.assets.offlineByTheme,
        raw.assets.offlineByTheme
      ),
      profileFrameByTheme: v2_mergeThemeStringMap(
        normalized.assets.profileFrameByTheme,
        raw.assets.profileFrameByTheme
      ),
      profileBgByTheme: v2_mergeThemeStringMap(
        normalized.assets.profileBgByTheme,
        raw.assets.profileBgByTheme
      ),
    };
  }

  if (v2_isRecord(raw.layout)) {
    if (v2_isRecord(raw.layout.grid)) {
      normalized.layout.grid = {
        right: v2_asNumber(raw.layout.grid.right, normalized.layout.grid.right),
        top: v2_asNumber(raw.layout.grid.top, normalized.layout.grid.top),
        rowGap: v2_asNumber(
          raw.layout.grid.rowGap,
          normalized.layout.grid.rowGap
        ),
        columnGap: v2_asNumber(
          raw.layout.grid.columnGap,
          normalized.layout.grid.columnGap
        ),
        columns: v2_asNumber(
          raw.layout.grid.columns,
          normalized.layout.grid.columns
        ),
      };
    }

    if (v2_isRecord(raw.layout.weekFlag)) {
      normalized.layout.weekFlag = {
        fontSize: v2_asNumber(
          raw.layout.weekFlag.fontSize,
          normalized.layout.weekFlag.fontSize
        ),
        fontWeight: v2_asNumber(
          raw.layout.weekFlag.fontWeight,
          normalized.layout.weekFlag.fontWeight
        ),
        width: v2_asNumber(raw.layout.weekFlag.width, normalized.layout.weekFlag.width),
        height: v2_asNumber(
          raw.layout.weekFlag.height,
          normalized.layout.weekFlag.height
        ),
        top: v2_asNumber(raw.layout.weekFlag.top, normalized.layout.weekFlag.top),
        left: v2_asNumber(raw.layout.weekFlag.left, normalized.layout.weekFlag.left),
      };
    }

    if (v2_isRecord(raw.layout.topObjectContainer)) {
      normalized.layout.topObjectContainer = {
        width: v2_asNumber(
          raw.layout.topObjectContainer.width,
          normalized.layout.topObjectContainer.width
        ),
        height: v2_asNumber(
          raw.layout.topObjectContainer.height,
          normalized.layout.topObjectContainer.height
        ),
        zIndex: v2_asNumber(
          raw.layout.topObjectContainer.zIndex,
          normalized.layout.topObjectContainer.zIndex
        ),
      };
    }

    if (v2_isRecord(raw.layout.profileImage)) {
      normalized.layout.profileImage = {
        top: v2_asNumber(
          raw.layout.profileImage.top,
          normalized.layout.profileImage.top
        ),
        left: v2_asNumber(
          raw.layout.profileImage.left,
          normalized.layout.profileImage.left
        ),
        rotateDeg: v2_asNumber(
          raw.layout.profileImage.rotateDeg,
          normalized.layout.profileImage.rotateDeg
        ),
        zIndex: v2_asNumber(
          raw.layout.profileImage.zIndex,
          normalized.layout.profileImage.zIndex
        ),
      };
    }

    if (v2_isRecord(raw.layout.profileFrame)) {
      normalized.layout.profileFrame = {
        zIndex: v2_asNumber(
          raw.layout.profileFrame.zIndex,
          normalized.layout.profileFrame.zIndex
        ),
      };
    }

    if (v2_isRecord(raw.layout.cell)) {
      const cell = raw.layout.cell;

      if (v2_isRecord(cell.streamingDay)) {
        normalized.layout.cell.streamingDay = {
          fontSize: v2_asNumber(
            cell.streamingDay.fontSize,
            normalized.layout.cell.streamingDay.fontSize
          ),
          height: v2_asNumber(
            cell.streamingDay.height,
            normalized.layout.cell.streamingDay.height
          ),
          width: v2_asNumber(
            cell.streamingDay.width,
            normalized.layout.cell.streamingDay.width
          ),
          top: v2_asNumber(
            cell.streamingDay.top,
            normalized.layout.cell.streamingDay.top
          ),
        };
      }

      if (v2_isRecord(cell.streamingDate)) {
        normalized.layout.cell.streamingDate = {
          width: v2_asNumber(
            cell.streamingDate.width,
            normalized.layout.cell.streamingDate.width
          ),
          height: v2_asNumber(
            cell.streamingDate.height,
            normalized.layout.cell.streamingDate.height
          ),
          lineHeight: v2_asNumber(
            cell.streamingDate.lineHeight,
            normalized.layout.cell.streamingDate.lineHeight
          ),
          fontSize: v2_asNumber(
            cell.streamingDate.fontSize,
            normalized.layout.cell.streamingDate.fontSize
          ),
          fontWeight: v2_asNumber(
            cell.streamingDate.fontWeight,
            normalized.layout.cell.streamingDate.fontWeight
          ),
          letterSpacing: v2_asNumber(
            cell.streamingDate.letterSpacing,
            normalized.layout.cell.streamingDate.letterSpacing
          ),
          marginTop: v2_asNumber(
            cell.streamingDate.marginTop,
            normalized.layout.cell.streamingDate.marginTop
          ),
        };
      }

      if (v2_isRecord(cell.streamingTime)) {
        normalized.layout.cell.streamingTime = {
          width: v2_asNumber(
            cell.streamingTime.width,
            normalized.layout.cell.streamingTime.width
          ),
          height: v2_asNumber(
            cell.streamingTime.height,
            normalized.layout.cell.streamingTime.height
          ),
          lineHeight: v2_asNumber(
            cell.streamingTime.lineHeight,
            normalized.layout.cell.streamingTime.lineHeight
          ),
          fontSize: v2_asNumber(
            cell.streamingTime.fontSize,
            normalized.layout.cell.streamingTime.fontSize
          ),
          top: v2_asNumber(
            cell.streamingTime.top,
            normalized.layout.cell.streamingTime.top
          ),
        };
      }

      if (v2_isRecord(cell.mainTitleContainer)) {
        normalized.layout.cell.mainTitleContainer = {
          height: v2_asNumber(
            cell.mainTitleContainer.height,
            normalized.layout.cell.mainTitleContainer.height
          ),
          widthPercent: v2_asNumber(
            cell.mainTitleContainer.widthPercent,
            normalized.layout.cell.mainTitleContainer.widthPercent
          ),
          top: v2_asNumber(
            cell.mainTitleContainer.top,
            normalized.layout.cell.mainTitleContainer.top
          ),
        };
      }

      if (v2_isRecord(cell.subTitleContainer)) {
        normalized.layout.cell.subTitleContainer = {
          widthPercent: v2_asNumber(
            cell.subTitleContainer.widthPercent,
            normalized.layout.cell.subTitleContainer.widthPercent
          ),
          height: v2_asNumber(
            cell.subTitleContainer.height,
            normalized.layout.cell.subTitleContainer.height
          ),
          top: v2_asNumber(
            cell.subTitleContainer.top,
            normalized.layout.cell.subTitleContainer.top
          ),
        };
      }

      if (v2_isRecord(cell.contentArea)) {
        normalized.layout.cell.contentArea = {
          width: v2_asNumber(
            cell.contentArea.width,
            normalized.layout.cell.contentArea.width
          ),
          height: v2_asNumber(
            cell.contentArea.height,
            normalized.layout.cell.contentArea.height
          ),
          top: v2_asNumber(
            cell.contentArea.top,
            normalized.layout.cell.contentArea.top
          ),
          marginLeft: v2_asNumber(
            cell.contentArea.marginLeft,
            normalized.layout.cell.contentArea.marginLeft
          ),
        };
      }
    }
  }

  normalized.version = v2_TEMPLATE_RENDER_CONFIG_VERSION;

  return normalized;
};

export const v2_getThemedAssetUrl = (
  map: Record<string, string | null>,
  currentTheme: string,
  fallbackTheme: string = v2_DEFAULT_THEME
): string | null => {
  return (
    map[currentTheme] ??
    map[fallbackTheme] ??
    Object.values(map).find((value) => typeof value === "string" && value.length > 0) ??
    null
  );
};

export const v2_isTemplateRenderConfig = (
  candidate: unknown
): candidate is V2TemplateRenderConfig => {
  if (!v2_isRecord(candidate)) return false;
  if (candidate.version !== v2_TEMPLATE_RENDER_CONFIG_VERSION) return false;
  if (!v2_isRecord(candidate.templateSize)) return false;
  if (!v2_isRecord(candidate.layout)) return false;
  return true;
};
