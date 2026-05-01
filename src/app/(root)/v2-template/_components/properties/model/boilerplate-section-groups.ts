import { V2BoilerplateGroupConfig } from "./boilerplate-ui-utils";
import { v2_BOILERPLATE_SELECT_OPTIONS } from "./boilerplate-presets";
import { v2_OBJECT_STYLE_SCHEMA_SECTIONS } from "./template-properties-constants";

const v2_OBJECT_TRANSFORM_GROUP: V2BoilerplateGroupConfig = {
  id: "transform",
  label: "Transform",
  fields: [
    {
      key: "position",
      label: "Position",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.position,
    },
    { key: "top", label: "Top" },
    { key: "left", label: "Left" },
    { key: "right", label: "Right" },
    { key: "bottom", label: "Bottom" },
    { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
    {
      key: "transformOrigin",
      label: "Transform Origin",
      type: "text",
      placeholder: "center center",
    },
    { key: "width", label: "Width" },
    { key: "height", label: "Height" },
    { key: "opacity", label: "Opacity", step: "0.01" },
  ],
};

const v2_OBJECT_CONTAINER_LAYOUT_GROUP: V2BoilerplateGroupConfig = {
  id: "layout",
  label: "Layout",
  fields: [
    {
      key: "display",
      label: "Display",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.display,
    },
    {
      key: "justifyContent",
      label: "Justify",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent,
    },
    {
      key: "alignItems",
      label: "Align",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems,
    },
    { key: "gap", label: "Gap" },
    { key: "paddingTop", label: "Padding Top" },
    { key: "paddingRight", label: "Padding Right" },
    { key: "paddingBottom", label: "Padding Bottom" },
    { key: "paddingLeft", label: "Padding Left" },
  ],
};

const v2_OBJECT_FRAME_LAYOUT_GROUP: V2BoilerplateGroupConfig = {
  id: "layout",
  label: "Layout",
  fields: [
    {
      key: "overflow",
      label: "Clip Content",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.overflow,
    },
  ],
};

const v2_OBJECT_TEXT_STYLE_GROUP: V2BoilerplateGroupConfig = {
  id: "typography",
  label: "Typography",
  fields: [
    { key: "fontFamily", label: "Font Family", type: "text" },
    { key: "fontSize", label: "Font Size" },
    { key: "fontWeight", label: "Font Weight" },
    { key: "lineHeight", label: "Line Height", step: "0.1" },
    { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
    {
      key: "textAlign",
      label: "Text Align",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign,
    },
    { key: "color", label: "Color", type: "text", placeholder: "#FFFFFF" },
    {
      key: "whiteSpace",
      label: "White Space",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace,
    },
    {
      key: "wordBreak",
      label: "Word Break",
      type: "select",
      options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak,
    },
  ],
};

const v2_WEEK_DATES_CONTAINER_GROUPS: V2BoilerplateGroupConfig[] = [
  {
    id: "transform",
    label: "Transform",
    fields: [
      {
        key: "position",
        label: "Position",
        type: "select",
        options: v2_BOILERPLATE_SELECT_OPTIONS.position,
      },
      { key: "top", label: "Top" },
      { key: "left", label: "Left" },
      { key: "right", label: "Right" },
      { key: "bottom", label: "Bottom" },
      { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      { key: "width", label: "Width" },
      { key: "height", label: "Height" },
      { key: "opacity", label: "Opacity", step: "0.01" },
      { key: "zIndex", label: "Z Index" },
    ],
  },
];

const v2_WEEK_DATES_TEXT_GROUPS: V2BoilerplateGroupConfig[] = [
  {
    id: "transform",
    label: "Transform",
    fields: [
      {
        key: "position",
        label: "Position",
        type: "select",
        options: v2_BOILERPLATE_SELECT_OPTIONS.position,
      },
      { key: "top", label: "Top" },
      { key: "left", label: "Left" },
      { key: "right", label: "Right" },
      { key: "bottom", label: "Bottom" },
      { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      { key: "width", label: "Width" },
      { key: "height", label: "Height" },
      { key: "opacity", label: "Opacity", step: "0.01" },
      { key: "zIndex", label: "Z Index" },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    fields: [
      { key: "fontFamily", label: "Font Family", type: "text" },
      { key: "fontSize", label: "Font Size" },
      { key: "fontWeight", label: "Font Weight" },
      { key: "lineHeight", label: "Line Height", step: "0.1" },
      { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
      {
        key: "textAlign",
        label: "Text Align",
        type: "select",
        options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign,
      },
      { key: "color", label: "Color", type: "text", placeholder: "#554945" },
      {
        key: "whiteSpace",
        label: "White Space",
        type: "select",
        options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace,
      },
      {
        key: "wordBreak",
        label: "Word Break",
        type: "select",
        options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak,
      },
    ],
  },
];

export const v2_BOILERPLATE_SECTION_GROUPS: Record<
  string,
  V2BoilerplateGroupConfig[]
> = {
  grid: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "right", label: "Right" },
        { key: "left", label: "Left" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "columns", label: "Columns" },
        { key: "gridTemplateColumns", label: "Grid Template Columns", type: "text", placeholder: "repeat(3, minmax(0, 1fr))" },
        { key: "rowGap", label: "Row Gap" },
        { key: "columnGap", label: "Column Gap" },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  gridBg: [v2_OBJECT_TRANSFORM_GROUP],
  weekFlag: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#A7A7A7" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
      ],
    },
  ],
  weekDates: v2_WEEK_DATES_CONTAINER_GROUPS,
  weekDatesStart: v2_WEEK_DATES_CONTAINER_GROUPS,
  weekDatesEnd: v2_WEEK_DATES_CONTAINER_GROUPS,
  weekStartMonth: v2_WEEK_DATES_TEXT_GROUPS,
  weekStartDate: v2_WEEK_DATES_TEXT_GROUPS,
  weekEndMonth: v2_WEEK_DATES_TEXT_GROUPS,
  weekEndDate: v2_WEEK_DATES_TEXT_GROUPS,
  topObjectContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "transformOrigin", label: "Transform Origin", type: "text", placeholder: "center center" },
      ],
    },
  ],
  memoContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      ],
    },
  ],
  memoContentContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  memoTextContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  memoTextStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#A7A7A7" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  frameArtwork: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "transformOrigin", label: "Transform Origin", type: "text", placeholder: "center center" },
      ],
    },
  ],
  frameObject: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      ],
    },
  ],
  profileImage: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "transformOrigin", label: "Transform Origin", type: "text", placeholder: "center center" },
      ],
    },
  ],
  profileFrame: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      ],
    },
  ],
  artistTextRootStyle: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  artistTextWrapperStyle: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  artistTextStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#A7A7A7" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
      ],
    },
  ],
  artistObjectStyle: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "opacity", label: "Opacity", step: "0.01" },
      ],
    },
  ],
  cardStreamingDay: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "marginTop", label: "Margin Top" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardStreamingDate: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "marginTop", label: "Margin Top" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardStreamingTime: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardMainTitleContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardSubTitleContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "marginTop", label: "Margin Top" },
        { key: "marginLeft", label: "Margin Left" },
        { key: "paddingTop", label: "Padding Top" },
        { key: "paddingRight", label: "Padding Right" },
        { key: "paddingBottom", label: "Padding Bottom" },
        { key: "paddingLeft", label: "Padding Left" },
      ],
    },
  ],
  streamingDayStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#FFFFFF" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  streamingDateStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#FFFFFF" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  streamingTimeStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#FFFFFF" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  mainTitleWrapperStyle: [
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
        { key: "gap", label: "Gap" },
        { key: "paddingTop", label: "Padding Top" },
        { key: "paddingRight", label: "Padding Right" },
        { key: "paddingBottom", label: "Padding Bottom" },
        { key: "paddingLeft", label: "Padding Left" },
      ],
    },
  ],
  subTitleWrapperStyle: [
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
        { key: "gap", label: "Gap" },
        { key: "paddingTop", label: "Padding Top" },
        { key: "paddingRight", label: "Padding Right" },
        { key: "paddingBottom", label: "Padding Bottom" },
        { key: "paddingLeft", label: "Padding Left" },
      ],
    },
  ],
  mainTitleTextStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#86889B" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  subTitleTextStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#BBBBBB" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  [v2_OBJECT_STYLE_SCHEMA_SECTIONS.frame]: [
    v2_OBJECT_TRANSFORM_GROUP,
    v2_OBJECT_FRAME_LAYOUT_GROUP,
  ],
  [v2_OBJECT_STYLE_SCHEMA_SECTIONS.image]: [
    v2_OBJECT_TRANSFORM_GROUP,
  ],
  [v2_OBJECT_STYLE_SCHEMA_SECTIONS.textContainer]: [
    v2_OBJECT_TRANSFORM_GROUP,
    v2_OBJECT_CONTAINER_LAYOUT_GROUP,
  ],
  [v2_OBJECT_STYLE_SCHEMA_SECTIONS.textStyle]: [
    v2_OBJECT_TEXT_STYLE_GROUP,
  ],
  [v2_OBJECT_STYLE_SCHEMA_SECTIONS.flexibleTextContainer]: [
    v2_OBJECT_TRANSFORM_GROUP,
    v2_OBJECT_CONTAINER_LAYOUT_GROUP,
  ],
  [v2_OBJECT_STYLE_SCHEMA_SECTIONS.flexibleTextWrapper]: [
    v2_OBJECT_CONTAINER_LAYOUT_GROUP,
  ],
  [v2_OBJECT_STYLE_SCHEMA_SECTIONS.flexibleTextStyle]: [
    v2_OBJECT_TEXT_STYLE_GROUP,
  ],
};
