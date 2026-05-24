import type { TLanOpt } from "@/types/time-table/data";
import type {
  V2TemplateArtistMode,
  V2TemplateMemoMode,
  V2TemplateObjectAssetMode,
  V2TemplateTimetableFlex42Align,
  V2TemplateTimetableFlex42ThreeRow,
  V2TemplateTimetableGridLayoutMode,
} from "@/types/time-table/template-render-config";

export type V2TemplateCreationTimePreset = "h12Prefix" | "h12Suffix" | "h24";
export type V2TemplateCreationWeekDatePreset =
  | "locale"
  | "ymdSlash"
  | "mdySlash"
  | "dmyDot";
export type V2TemplateCreationCardAssetMode = "common" | "byDay";

export interface V2TemplateCreationDraft {
  metadata: {
    name: string;
    description: string;
  };
  canvas: {
    width: number;
    height: number;
  };
  theme: {
    defaultTheme: string;
    enableThemeSelection: boolean;
  };
  objects: {
    topObject: {
      enabled: boolean;
      mode: V2TemplateObjectAssetMode;
    };
    profile: {
      enabled: boolean;
      imageRequired: boolean;
      frameRequired: boolean;
    };
    artist: {
      enabled: boolean;
      mode: V2TemplateArtistMode;
    };
    memo: {
      enabled: boolean;
      mode: V2TemplateMemoMode;
    };
    weekDates: {
      enabled: boolean;
    };
  };
  timetable: {
    layoutMode: V2TemplateTimetableGridLayoutMode;
    flex42ThreeRow: V2TemplateTimetableFlex42ThreeRow;
    flex42Align: V2TemplateTimetableFlex42Align;
    multipleEnabled: boolean;
    maxEntriesPerDay: number;
    offlineMemoEnabled: boolean;
    cardComponentCount: number;
  };
  cardAssets: {
    online: V2TemplateCreationCardAssetMode;
    offline: V2TemplateCreationCardAssetMode;
    multi: V2TemplateCreationCardAssetMode;
    offlineMemo: V2TemplateCreationCardAssetMode;
  };
  formats: {
    localePreset: TLanOpt;
    timePreset: V2TemplateCreationTimePreset;
    weekDatePreset: V2TemplateCreationWeekDatePreset;
  };
}
