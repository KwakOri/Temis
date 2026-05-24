import type {
  V2TemplateEditorOptions,
  V2TemplateLayerComponentKey,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateStructureCapabilities,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import type {
  V2TemplateEditorStatefulSceneScope,
  V2TemplateStatefulSceneFeatureKey,
  V2TemplateStatefulSceneStatus,
} from "@/types/time-table/template-editor-ui";

type V2StatefulSceneGroupDefinition = {
  feature: V2TemplateStatefulSceneFeatureKey;
  groupId: string;
  legacyGroupIds: string[];
  label: string;
  layerId: string;
  componentKey: V2TemplateLayerComponentKey;
  childIds: string[];
  excludedChildIds?: string[];
  nodeIdPrefix: string;
  editorOptionKey?: keyof Pick<V2TemplateEditorOptions, "isArtist" | "isMemo">;
  capabilityObjectKey?: keyof V2TemplateStructureCapabilities["objects"];
  visibilityByStatus: Record<
    V2TemplateStatefulSceneStatus,
    Extract<
      V2TemplateVisibilityMode,
      | "topObjectOnOnly"
      | "topObjectOffOnly"
      | "artistOnOnly"
      | "artistOffOnly"
      | "memoOnOnly"
      | "memoOffOnly"
    >
  >;
};

export const v2_STATEFUL_SCENE_STATUS_LABEL: Record<
  V2TemplateStatefulSceneStatus,
  string
> = {
  on: "ON",
  off: "OFF",
};

export const v2_STATEFUL_SCENE_GROUP_DEFINITIONS: Record<
  V2TemplateStatefulSceneFeatureKey,
  V2StatefulSceneGroupDefinition
> = {
  topObject: {
    feature: "topObject",
    groupId: "scene-top-object-group",
    legacyGroupIds: [],
    label: "TopObject",
    layerId: "top-object",
    componentKey: "topObject",
    childIds: ["scene-top-object-on", "scene-top-object-off"],
    nodeIdPrefix: "scene-top-object",
    capabilityObjectKey: "topObject",
    visibilityByStatus: {
      on: "topObjectOnOnly",
      off: "topObjectOffOnly",
    },
  },
  artist: {
    feature: "artist",
    groupId: "scene-artist-group",
    legacyGroupIds: ["scene-artist"],
    label: "Artist",
    layerId: "artist",
    componentKey: "artist",
    childIds: [
      "scene-artist-text",
      "scene-artist-object",
      "scene-artist-object-off",
    ],
    excludedChildIds: ["scene-frame", "scene-profile"],
    nodeIdPrefix: "scene-artist",
    editorOptionKey: "isArtist",
    visibilityByStatus: {
      on: "artistOnOnly",
      off: "artistOffOnly",
    },
  },
  memo: {
    feature: "memo",
    groupId: "scene-memo",
    legacyGroupIds: [],
    label: "Memo",
    layerId: "memo",
    componentKey: "memo",
    childIds: ["scene-memo-object", "scene-memo-text"],
    nodeIdPrefix: "scene-memo",
    editorOptionKey: "isMemo",
    visibilityByStatus: {
      on: "memoOnOnly",
      off: "memoOffOnly",
    },
  },
};

export const v2_STATEFUL_SCENE_FEATURE_KEYS = Object.keys(
  v2_STATEFUL_SCENE_GROUP_DEFINITIONS
) as V2TemplateStatefulSceneFeatureKey[];

export const v2_STATEFUL_SCENE_VISIBILITY_MODES =
  v2_STATEFUL_SCENE_FEATURE_KEYS.flatMap((feature) =>
    (["on", "off"] as const).map(
      (status) =>
        v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature].visibilityByStatus[status]
    )
  );

const v2_STATEFUL_SCENE_FEATURE_BY_LAYER_ID = new Map(
  v2_STATEFUL_SCENE_FEATURE_KEYS.map((feature) => [
    v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature].layerId,
    feature,
  ])
);

const v2_STATEFUL_SCENE_SCOPE_BY_VISIBILITY_MODE = new Map<
  V2TemplateVisibilityMode,
  V2TemplateEditorStatefulSceneScope
>();

v2_STATEFUL_SCENE_FEATURE_KEYS.forEach((feature) => {
  const definition = v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature];
  Object.entries(definition.visibilityByStatus).forEach(([status, mode]) => {
    v2_STATEFUL_SCENE_SCOPE_BY_VISIBILITY_MODE.set(mode, {
      feature,
      status: status as V2TemplateStatefulSceneStatus,
    });
  });
});

export const v2_getStatefulSceneFeatureByLayerId = (
  layerId: string | undefined
): V2TemplateStatefulSceneFeatureKey | null => {
  if (!layerId) return null;
  return v2_STATEFUL_SCENE_FEATURE_BY_LAYER_ID.get(layerId) ?? null;
};

export const v2_getStatefulSceneFeatureLayerId = (
  feature: V2TemplateStatefulSceneFeatureKey
): string => v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature].layerId;

export const v2_getStatefulSceneFeatureLabel = (
  feature: V2TemplateStatefulSceneFeatureKey
): string => v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature].label;

export const v2_getStatefulSceneStatusLabel = (
  status: V2TemplateStatefulSceneStatus
): string => v2_STATEFUL_SCENE_STATUS_LABEL[status];

export const v2_getStatefulSceneVisibilityMode = ({
  feature,
  status,
}: V2TemplateEditorStatefulSceneScope): V2TemplateVisibilityMode =>
  v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature].visibilityByStatus[status];

export const v2_getStatefulSceneScopeFromVisibilityMode = (
  mode: V2TemplateVisibilityMode | undefined
): V2TemplateEditorStatefulSceneScope | null => {
  if (!mode) return null;
  return v2_STATEFUL_SCENE_SCOPE_BY_VISIBILITY_MODE.get(mode) ?? null;
};

export const v2_isLayerVisibleForStatefulSceneScope = ({
  scope,
  node,
}: {
  scope: V2TemplateEditorStatefulSceneScope;
  node: V2TemplateLayerNode;
}): boolean => {
  const modeScope = v2_getStatefulSceneScopeFromVisibilityMode(
    node.visibilityMode
  );
  if (!modeScope) return true;
  return modeScope.feature === scope.feature && modeScope.status === scope.status;
};

export const v2_isSceneNodeEnabledByStatefulFeatureFlags = ({
  nodeId,
  renderConfig,
}: {
  nodeId: string;
  renderConfig: V2TemplateRenderConfig;
}): boolean => {
  const feature = v2_STATEFUL_SCENE_FEATURE_KEYS.find((candidate) =>
    nodeId.startsWith(v2_STATEFUL_SCENE_GROUP_DEFINITIONS[candidate].nodeIdPrefix)
  );
  if (!feature) return true;
  const optionKey = v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature].editorOptionKey;
  if (optionKey) {
    return Boolean(renderConfig.editorOptions[optionKey]);
  }
  const capabilityObjectKey =
    v2_STATEFUL_SCENE_GROUP_DEFINITIONS[feature].capabilityObjectKey;
  if (capabilityObjectKey) {
    const capability =
      renderConfig.structureCapabilities?.objects?.[capabilityObjectKey];
    if (!capability) return true;
    return Boolean(
      capability.enabled &&
        (!("mode" in capability) || capability.mode === "statefulAsset")
    );
  }
  return true;
};
