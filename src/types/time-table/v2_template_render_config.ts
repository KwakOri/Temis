import { CardInputConfig, TLanOpt } from "@/types/time-table/data";

export const v2_TEMPLATE_RENDER_CONFIG_VERSION = 1 as const;

export const v2_TEMPLATE_COLOR_KEYS = [
  "MAIN_TITLE",
  "SUB_TITLE",
  "STREAMING_TIME",
  "STREAMING_DATE",
  "STREAMING_DAY",
  "ARTIST",
  "WEEKLY_FLAG",
] as const;

export type V2TemplateColorKey = (typeof v2_TEMPLATE_COLOR_KEYS)[number];
export type V2TemplateFontKey = V2TemplateColorKey;

export interface V2TemplateSize {
  width: number;
  height: number;
}

export interface V2TemplateCardSizes {
  online: V2TemplateSize;
  offline: V2TemplateSize;
  profile: V2TemplateSize;
  frame: V2TemplateSize;
}

export interface V2TemplateColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

export interface V2TemplateFonts {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

export interface V2TemplateMaxFontSizes {
  MAIN_TITLE: number;
  SUB_TITLE: number;
  ARTIST: number;
}

export interface V2TemplateAssetMap {
  bgByTheme: Record<string, string | null>;
  topObjectByTheme: Record<string, string | null>;
  onlineByTheme: Record<string, string | null>;
  offlineByTheme: Record<string, string | null>;
  profileFrameByTheme: Record<string, string | null>;
  profileBgByTheme: Record<string, string | null>;
}

export interface V2TemplateLayoutConfig {
  grid: {
    right: number;
    top: number;
    rowGap: number;
    columnGap: number;
    columns: number;
  };
  weekFlag: {
    fontSize: number;
    fontWeight: number;
    width: number;
    height: number;
    top: number;
    left: number;
  };
  topObjectContainer: {
    width: number;
    height: number;
    zIndex: number;
  };
  profileImage: {
    top: number;
    left: number;
    rotateDeg: number;
    zIndex: number;
  };
  profileFrame: {
    zIndex: number;
  };
  cell: {
    streamingDay: {
      fontSize: number;
      height: number;
      width: number;
      top: number;
    };
    streamingDate: {
      width: number;
      height: number;
      lineHeight: number;
      fontSize: number;
      fontWeight: number;
      letterSpacing: number;
      marginTop: number;
    };
    streamingTime: {
      width: number;
      height: number;
      lineHeight: number;
      fontSize: number;
      top: number;
    };
    mainTitleContainer: {
      height: number;
      widthPercent: number;
      top: number;
    };
    subTitleContainer: {
      widthPercent: number;
      height: number;
      top: number;
    };
    contentArea: {
      width: number;
      height: number;
      top: number;
      marginLeft: number;
    };
  };
}

export interface V2TemplateRenderConfig {
  version: typeof v2_TEMPLATE_RENDER_CONFIG_VERSION;
  metadata: {
    schema: "v2_template_render_config";
    name: string;
    description: string;
  };
  templateSize: V2TemplateSize;
  weekdayOption: TLanOpt;
  monthOption: TLanOpt;
  themes: string[];
  defaultTheme: string;
  buttonThemes: Array<{ value: string; label: string }>;
  baseFonts: V2TemplateFonts;
  baseColors: Record<string, V2TemplateColorPalette>;
  componentColors: Record<V2TemplateColorKey, string>;
  componentFonts: Record<V2TemplateFontKey, string>;
  maxFontSizes: V2TemplateMaxFontSizes;
  cardSizes: V2TemplateCardSizes;
  profileTextPlaceholder: string;
  cardInputConfig: CardInputConfig;
  assets: V2TemplateAssetMap;
  layout: V2TemplateLayoutConfig;
}
