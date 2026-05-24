import type { V2TemplateTimetableCardStatusKey } from "./template-render-config";

export {
  v2_RUNTIME_HIGHLIGHT_TARGETS as v2_TEMPLATE_HIGHLIGHT_TARGETS,
  type V2RuntimeHighlightTarget as V2TemplateHighlightTarget,
} from "./template-runtime-ui";

export interface V2TemplateEditorTimetableComponentScope {
  componentId: string;
  status: V2TemplateTimetableCardStatusKey;
}

export type V2TemplateStatefulSceneFeatureKey = "topObject" | "artist" | "memo";
export type V2TemplateStatefulSceneStatus = "on" | "off";

export interface V2TemplateEditorStatefulSceneScope {
  feature: V2TemplateStatefulSceneFeatureKey;
  status: V2TemplateStatefulSceneStatus;
}

export interface V2TemplateEditorSceneUnitScope {
  layerId: string;
  label: string;
}

export type V2TemplateEditorScopedPreviewMode = "isolated" | "full";
