import {
  v2_TEMPLATE_COMPUTED_BINDING_KEYS,
  V2TemplateAssetMap,
  V2TemplateFieldScope,
  V2TemplateFontFaceSource,
  V2TemplateFontRegistryItem,
  V2TemplateFormField,
  V2TemplateRenderConfig,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";

export const v2_BUILDER_TABS = [
  { id: "properties", label: "속성" },
  { id: "settings", label: "설정" },
] as const;

export const v2_FORM_FIELD_SCOPE_OPTIONS: Array<{
  value: V2TemplateFieldScope;
  label: string;
}> = [
  { value: "entry", label: "entry" },
  { value: "card", label: "card" },
  { value: "global", label: "global" },
];

export const v2_FORM_FIELD_TYPE_OPTIONS: Array<{
  value: V2TemplateFormField["type"];
  label: string;
}> = [
  { value: "text", label: "text" },
  { value: "textarea", label: "textarea" },
  { value: "time", label: "time" },
  { value: "date", label: "date" },
  { value: "select", label: "select" },
  { value: "number", label: "number" },
];

export const v2_BINDING_COMPUTED_OPTIONS = v2_TEMPLATE_COMPUTED_BINDING_KEYS;

export const v2_BASE_FONT_TOKEN_KEYS = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
] as const;

export const v2_FONT_DISPLAY_OPTIONS: Array<
  NonNullable<V2TemplateFontRegistryItem["display"]>
> = ["auto", "block", "swap", "fallback", "optional"];

export const v2_FONT_STYLE_OPTIONS: Array<
  NonNullable<V2TemplateFontFaceSource["style"]>
> = ["normal", "italic", "oblique"];

export const v2_FONT_FORMAT_OPTIONS: Array<
  NonNullable<V2TemplateFontFaceSource["format"]>
> = ["woff2", "woff", "truetype", "opentype"];

export const v2_ASSET_KEYS: Array<keyof V2TemplateAssetMap> = [
  "profileBgByTheme",
  "guideByTheme",
  "bgByTheme",
  "topObjectByTheme",
  "memoByTheme",
  "onlineByTheme",
  "offlineByTheme",
  "profileFrameByTheme",
];

export const v2_ASSET_LABELS: Record<keyof V2TemplateAssetMap, string> = {
  bgByTheme: "배경",
  topObjectByTheme: "상단 오브젝트",
  memoByTheme: "메모 오브젝트",
  onlineByTheme: "온라인 카드",
  offlineByTheme: "오프라인 카드",
  profileFrameByTheme: "프로필 프레임",
  profileBgByTheme: "아티스트 배경 오브젝트",
  guideByTheme: "가이드 레이어(상단 오버레이)",
};

export const v2_STYLE_PROPERTY_CATALOG = [
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "rowGap",
  "columnGap",
  "columns",
  "gridTemplateColumns",
  "textAlign",
  "color",
  "backgroundColor",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderRadius",
  "boxShadow",
  "filter",
  "backdropFilter",
  "opacity",
  "display",
  "justifyContent",
  "alignItems",
  "transform",
  "transformOrigin",
  "rotateDeg",
  "whiteSpace",
  "wordBreak",
] as const;

export const v2_LOCKED_STYLE_PROPERTY_KEYS = new Set<string>(["zIndex"]);

export const v2_CARD_NODE_VISIBILITY_OPTIONS: Array<{
  value: V2TemplateVisibilityMode;
  label: string;
}> = [
  { value: "always", label: "항상 표시" },
  { value: "onlineOnly", label: "온라인만" },
  { value: "offlineOnly", label: "오프라인만" },
  { value: "onlineSingleOnly", label: "온라인 · 단회차만" },
  { value: "onlineMultipleOnly", label: "온라인 · 다회차만" },
];

export const v2_FIXED_CARD_NODE_IDS = new Set([
  "streaming-day",
  "streaming-date",
  "streaming-time",
  "main-title",
  "sub-title",
]);

export const v2_SCENE_CUSTOM_NODE_ID_PREFIX = "scene-custom-";
export const v2_SCENE_CUSTOM_LAYER_ID_PREFIX = "scene-custom-layer-";

export type V2StyleSectionKey =
  | "grid"
  | "weekFlag"
  | "topObjectContainer"
  | "memoContainer"
  | "memoContentContainer"
  | "memoTextContainer"
  | "memoTextStyle"
  | "profileImage"
  | "profileFrame"
  | "profileTextRootStyle"
  | "profileTextWrapperStyle"
  | "profileTextStyle"
  | "profileTextArtistImageStyle"
  | "cardStreamingDay"
  | "cardOnlineBackgroundContainer"
  | "cardOfflineBackgroundContainer"
  | "cardStreamingDate"
  | "cardStreamingTime"
  | "cardMainTitleContainer"
  | "cardSubTitleContainer"
  | "cardContainer"
  | "streamingDayStyle"
  | "streamingDateStyle"
  | "streamingTimeStyle"
  | "mainTitleWrapperStyle"
  | "subTitleWrapperStyle"
  | "mainTitleTextStyle"
  | "subTitleTextStyle";

export type V2StyleSectionId = V2StyleSectionKey | string;

export const v2_STYLE_SECTION_LABELS: Record<V2StyleSectionKey, string> = {
  grid: "Grid",
  weekFlag: "WeekFlag",
  topObjectContainer: "TopObject",
  memoContainer: "Memo.Container",
  memoContentContainer: "Memo.ContentContainer",
  memoTextContainer: "Memo.ContentWrapper",
  memoTextStyle: "Memo.ContentStyle",
  profileImage: "ProfileImage",
  profileFrame: "ProfileFrame",
  profileTextRootStyle: "ProfileText.RootStyle",
  profileTextWrapperStyle: "ProfileText.WrapperStyle",
  profileTextStyle: "ProfileText.TextStyle",
  profileTextArtistImageStyle: "Artist.ObjectStyle",
  cardStreamingDay: "Card.StreamingDay",
  cardOnlineBackgroundContainer: "Card.OnlineBackground",
  cardOfflineBackgroundContainer: "Card.OfflineBackground",
  cardStreamingDate: "Card.StreamingDate",
  cardStreamingTime: "Card.StreamingTime",
  cardMainTitleContainer: "Card.MainTitleContainer",
  cardSubTitleContainer: "Card.SubTitleContainer",
  cardContainer: "Card.Container",
  streamingDayStyle: "StreamingDay.TextStyle",
  streamingDateStyle: "StreamingDate.TextStyle",
  streamingTimeStyle: "StreamingTime.TextStyle",
  mainTitleWrapperStyle: "MainTitle.WrapperStyle",
  subTitleWrapperStyle: "SubTitle.WrapperStyle",
  mainTitleTextStyle: "MainTitle.TextStyle",
  subTitleTextStyle: "SubTitle.TextStyle",
};

export const v2_STYLE_SECTION_ORDER: V2StyleSectionKey[] = [
  "grid",
  "weekFlag",
  "topObjectContainer",
  "memoContainer",
  "memoContentContainer",
  "memoTextContainer",
  "memoTextStyle",
  "profileImage",
  "profileFrame",
  "profileTextRootStyle",
  "profileTextWrapperStyle",
  "profileTextStyle",
  "profileTextArtistImageStyle",
  "cardOnlineBackgroundContainer",
  "cardOfflineBackgroundContainer",
  "cardStreamingDay",
  "streamingDayStyle",
  "cardStreamingDate",
  "streamingDateStyle",
  "cardStreamingTime",
  "streamingTimeStyle",
  "cardMainTitleContainer",
  "mainTitleWrapperStyle",
  "mainTitleTextStyle",
  "cardSubTitleContainer",
  "subTitleWrapperStyle",
  "subTitleTextStyle",
  "cardContainer",
];

export const v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP: Record<
  V2StyleSectionKey,
  V2TemplateHighlightTarget
> = {
  grid: "grid",
  weekFlag: "weekFlag",
  topObjectContainer: "topObjectContainer",
  memoContainer: "memoObject",
  memoContentContainer: "memoText",
  memoTextContainer: "memoText",
  memoTextStyle: "memoText",
  profileImage: "profileImage",
  profileFrame: "profileFrame",
  profileTextRootStyle: "profileText",
  profileTextWrapperStyle: "profileText",
  profileTextStyle: "profileText",
  profileTextArtistImageStyle: "profileText",
  cardOnlineBackgroundContainer: "cardNode:online-background",
  cardOfflineBackgroundContainer: "cardNode:offline-background",
  cardStreamingDay: "cardStreamingDay",
  cardStreamingDate: "cardStreamingDate",
  cardStreamingTime: "cardStreamingTime",
  cardMainTitleContainer: "cardMainTitleContainer",
  cardSubTitleContainer: "cardSubTitleContainer",
  cardContainer: "cardContainer",
  streamingDayStyle: "cardStreamingDay",
  streamingDateStyle: "cardStreamingDate",
  streamingTimeStyle: "cardStreamingTime",
  mainTitleWrapperStyle: "cardMainTitleContainer",
  mainTitleTextStyle: "cardMainTitleContainer",
  subTitleWrapperStyle: "cardSubTitleContainer",
  subTitleTextStyle: "cardSubTitleContainer",
};

export const v2_ROOT_LAYOUT_STYLE_SECTION_KEY_MAP: Partial<
  Record<V2StyleSectionKey, keyof V2TemplateRenderConfig["layout"]>
> = {
  grid: "grid",
  weekFlag: "weekFlag",
  topObjectContainer: "topObjectContainer",
  profileImage: "profileImage",
  profileFrame: "profileFrame",
  profileTextRootStyle: "profileTextRootStyle",
  profileTextWrapperStyle: "profileTextWrapperStyle",
  profileTextStyle: "profileTextStyle",
  profileTextArtistImageStyle: "profileTextArtistImageStyle",
};

export const v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP: Partial<
  Record<
    V2StyleSectionKey,
    Extract<keyof V2TemplateRenderConfig["layout"]["card"], string>
  >
> = {
  cardOnlineBackgroundContainer: "onlineBackgroundContainer",
  cardOfflineBackgroundContainer: "offlineBackgroundContainer",
  cardStreamingDay: "streamingDay",
  cardStreamingDate: "streamingDate",
  cardStreamingTime: "streamingTime",
  cardMainTitleContainer: "mainTitleContainer",
  cardSubTitleContainer: "subTitleContainer",
  cardContainer: "container",
  streamingDayStyle: "streamingDayStyle",
  streamingDateStyle: "streamingDateStyle",
  streamingTimeStyle: "streamingTimeStyle",
  mainTitleWrapperStyle: "mainTitleWrapperStyle",
  subTitleWrapperStyle: "subTitleWrapperStyle",
  mainTitleTextStyle: "mainTitleTextStyle",
  subTitleTextStyle: "subTitleTextStyle",
};

export const v2_HIGHLIGHT_TARGET_LABELS: Record<
  V2TemplateHighlightTarget,
  string
> = {
  grid: "Grid",
  weekFlag: "WeekFlag",
  topObjectContainer: "TopObject",
  profileImage: "Profile Image",
  profileFrame: "Profile Frame",
  memoObject: "Memo Object",
  profileText: "Profile Text",
  memoText: "Memo Text",
  cardStreamingDay: "Card / StreamingDay",
  cardStreamingDate: "Card / StreamingDate",
  cardStreamingTime: "Card / StreamingTime",
  cardMainTitleContainer: "Card / MainTitle",
  cardSubTitleContainer: "Card / SubTitle",
  cardContainer: "Card Container",
};

export const v2_BOILERPLATE_STORAGE_KEY =
  "v2-template-builder-style-boilerplates-v1";
