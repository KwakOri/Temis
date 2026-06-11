import type { TLanOpt } from "@/types/time-table/data";
import type {
  V2TemplateArtistMode,
  V2TemplateMemoMode,
  V2TemplateObjectAssetMode,
  V2TemplateTimetableFlex42Align,
  V2TemplateTimetableFlex42ThreeRow,
  V2TemplateTimetableGridLayoutMode,
  V2TemplateWeekDateFormat,
} from "@/types/time-table/template-render-config";

export type V2TemplateCreationTimePreset = "h12Prefix" | "h12Suffix" | "h24";
export type V2TemplateCreationWeekDateCompositionMode =
  | "rangeText"
  | "startEndText"
  | "splitDateParts";
export type V2TemplateCreationWeekDateMonthStyle =
  | "numeric"
  | "2-digit"
  | "shortUpper"
  | "shortCapital"
  | "longCapital";
export type V2TemplateCreationCardAssetMode = "common" | "byDay";

export interface V2TemplateCreationWeekDateFormat {
  dateOrder: V2TemplateWeekDateFormat["dateOrder"];
  includeYear: boolean;
  yearStyle: V2TemplateWeekDateFormat["yearStyle"];
  monthStyle: V2TemplateCreationWeekDateMonthStyle;
  dateStyle: V2TemplateWeekDateFormat["dateStyle"];
  dateSeparator: string;
  monthDateSeparator: string;
  rangeSeparator: string;
}

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
    weekDateCompositionMode: V2TemplateCreationWeekDateCompositionMode;
    weekDateFormat: V2TemplateCreationWeekDateFormat;
  };
}
