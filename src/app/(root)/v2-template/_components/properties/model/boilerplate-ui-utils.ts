import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Braces,
  Columns3,
  Grid3X3,
  Hash,
  Layers,
  LayoutGrid,
  LucideIcon,
  Move,
  Palette,
  RotateCw,
  Rows3,
  Ruler,
  Square,
  SlidersHorizontal,
  Text,
  Type,
} from "lucide-react";

export type V2BoilerplateFieldType = "number" | "text" | "select";

export interface V2BoilerplateFieldConfig {
  key: string;
  label: string;
  type?: V2BoilerplateFieldType;
  options?: ReadonlyArray<{ label: string; value: string }>;
  placeholder?: string;
  step?: string;
}

export interface V2BoilerplateGroupConfig {
  id: string;
  label: string;
  fields: V2BoilerplateFieldConfig[];
}

const v2_BOILERPLATE_GROUP_ICON_MAP: Record<string, LucideIcon> = {
  transform: Move,
  transformMisc: Move,
  position: Move,
  size: Ruler,
  layer: Layers,
  motion: RotateCw,
  layout: LayoutGrid,
  spacing: SlidersHorizontal,
  typography: Type,
  fill: Palette,
  stroke: Square,
  effects: SlidersHorizontal,
};

const v2_BOILERPLATE_FIELD_ICON_MAP: Record<string, LucideIcon> = {
  position: Move,
  top: ArrowUp,
  right: ArrowRight,
  bottom: ArrowDown,
  left: ArrowLeft,
  width: Ruler,
  minWidth: Ruler,
  maxWidth: Ruler,
  height: Ruler,
  minHeight: Ruler,
  maxHeight: Ruler,
  marginTop: ArrowUp,
  marginRight: ArrowRight,
  marginBottom: ArrowDown,
  marginLeft: ArrowLeft,
  paddingTop: ArrowUp,
  paddingRight: ArrowRight,
  paddingBottom: ArrowDown,
  paddingLeft: ArrowLeft,
  rowGap: Rows3,
  columnGap: Columns3,
  gap: SlidersHorizontal,
  columns: Columns3,
  gridTemplateColumns: Grid3X3,
  display: LayoutGrid,
  justifyContent: AlignHorizontalJustifyCenter,
  alignItems: AlignVerticalJustifyCenter,
  textAlign: AlignHorizontalJustifyCenter,
  fontFamily: Type,
  fontSize: Text,
  fontWeight: Hash,
  lineHeight: Rows3,
  letterSpacing: Columns3,
  color: Palette,
  backgroundColor: Palette,
  borderWidth: Square,
  borderStyle: Square,
  borderColor: Square,
  borderRadius: Square,
  boxShadow: SlidersHorizontal,
  filter: SlidersHorizontal,
  backdropFilter: SlidersHorizontal,
  opacity: SlidersHorizontal,
  zIndex: Layers,
  rotateDeg: RotateCw,
  transform: RotateCw,
  transformOrigin: Move,
  whiteSpace: Braces,
  wordBreak: Braces,
};

export const v2_getBoilerplateFieldIcon = (
  field: V2BoilerplateFieldConfig,
  groupId: string
): LucideIcon => {
  const mapped = v2_BOILERPLATE_FIELD_ICON_MAP[field.key];
  if (mapped) return mapped;
  return v2_BOILERPLATE_GROUP_ICON_MAP[groupId] ?? SlidersHorizontal;
};

export const v2_getBoilerplateGroupIcon = (groupId: string): LucideIcon => {
  return v2_BOILERPLATE_GROUP_ICON_MAP[groupId] ?? SlidersHorizontal;
};

export const v2_STYLE_GROUP_DISPLAY_LABEL: Record<string, string> = {
  transform: "Position",
  transformMisc: "Transform",
  position: "Position",
  size: "Size",
  layer: "Layer",
  motion: "Transform",
  layout: "Auto layout",
  spacing: "Spacing",
  typography: "Appearance",
  fill: "Fill",
  stroke: "Stroke",
  effects: "Effects",
};

export const v2_STYLE_EXTENSION_GROUP_IDS = new Set(["fill", "stroke", "effects"]);

export const v2_STYLE_EXTENSION_DEFAULT_VALUES: Record<
  string,
  Record<string, string | number>
> = {
  fill: {
    backgroundColor: "#FFFFFF",
  },
  stroke: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#000000",
  },
  effects: {
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
};

const v2_FIELD_CATEGORY_ORDER = {
  position: ["position", "top", "bottom", "left", "right", "rotateDeg"],
  size: [
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
  ],
  layer: ["opacity"],
  motion: ["rotate", "transformOrigin", "transform"],
  layout: [
    "display",
    "columns",
    "gridTemplateColumns",
    "rowGap",
    "columnGap",
    "gap",
    "justifyContent",
    "alignItems",
  ],
  spacing: [
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "padding",
  ],
} as const;

const v2_sortFieldsByOrder = (
  fields: V2BoilerplateFieldConfig[],
  order: readonly string[]
) => {
  return [...fields].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

const v2_partitionFields = (
  fields: V2BoilerplateFieldConfig[],
  keys: readonly string[]
) => {
  const keySet = new Set(keys);
  return {
    picked: fields.filter((field) => keySet.has(field.key)),
    rest: fields.filter((field) => !keySet.has(field.key)),
  };
};

const v2_POSITION_CATEGORY_KEY_SET = new Set<string>(
  v2_FIELD_CATEGORY_ORDER.position
);
const v2_SIZE_CATEGORY_KEY_SET = new Set<string>(v2_FIELD_CATEGORY_ORDER.size);
const v2_LAYER_CATEGORY_KEY_SET = new Set<string>(v2_FIELD_CATEGORY_ORDER.layer);
const v2_MOTION_CATEGORY_KEY_SET = new Set<string>(
  v2_FIELD_CATEGORY_ORDER.motion
);

export const v2_expandDisplayGroups = (
  groups: V2BoilerplateGroupConfig[]
): V2BoilerplateGroupConfig[] => {
  return groups.flatMap((group) => {
    if (group.id === "transform") {
      const position = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_POSITION_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.position
      );
      const size = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_SIZE_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.size
      );
      const layer = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_LAYER_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.layer
      );
      const motion = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_MOTION_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.motion
      );

      const categorizedKeys = new Set<string>([
        ...v2_FIELD_CATEGORY_ORDER.position,
        ...v2_FIELD_CATEGORY_ORDER.size,
        ...v2_FIELD_CATEGORY_ORDER.layer,
        ...v2_FIELD_CATEGORY_ORDER.motion,
      ]);
      const rest = group.fields.filter((field) => !categorizedKeys.has(field.key));

      return [
        ...(position.length > 0
          ? [{ id: "position", label: "Position", fields: position }]
          : []),
        ...(size.length > 0 ? [{ id: "size", label: "Size", fields: size }] : []),
        ...(layer.length > 0
          ? [{ id: "layer", label: "Layer", fields: layer }]
          : []),
        ...(motion.length > 0
          ? [{ id: "motion", label: "Transform", fields: motion }]
          : []),
        ...(rest.length > 0
          ? [{ id: "transformMisc", label: "Transform", fields: rest }]
          : []),
      ];
    }

    if (group.id === "layout") {
      const { picked: spacing, rest: layoutRaw } = v2_partitionFields(
        group.fields,
        v2_FIELD_CATEGORY_ORDER.spacing
      );
      const layout = v2_sortFieldsByOrder(
        layoutRaw,
        v2_FIELD_CATEGORY_ORDER.layout
      );
      const spacingSorted = v2_sortFieldsByOrder(
        spacing,
        v2_FIELD_CATEGORY_ORDER.spacing
      );

      return [
        ...(layout.length > 0
          ? [{ id: "layout", label: "Auto layout", fields: layout }]
          : []),
        ...(spacingSorted.length > 0
          ? [{ id: "spacing", label: "Spacing", fields: spacingSorted }]
          : []),
      ];
    }

    return [group];
  });
};
