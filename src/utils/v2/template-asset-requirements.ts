import {
  v2_TEMPLATE_DAY_KEYS,
  V2TemplateAssetRef,
  V2TemplateAssetRequirement,
  V2TemplateDayKey,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_resolveStructureCapabilities } from "@/utils/v2/template-render-config";

const v2_toBuiltinAssetRequirement = ({
  id,
  label,
  required = false,
  owner,
  key,
  state,
  dayKey,
}: {
  id: string;
  label: string;
  required?: boolean;
  owner: V2TemplateAssetRequirement["owner"];
  key: Extract<V2TemplateAssetRef, { source: "builtin" }>["key"];
  state?: "on" | "off";
  dayKey?: V2TemplateDayKey;
}): V2TemplateAssetRequirement => ({
  id,
  label,
  required,
  owner,
  ...(state ? { state } : {}),
  ...(dayKey ? { dayKey } : {}),
  themeScoped: true,
  assetRef: {
    source: "builtin",
    key,
  },
});

const v2_toExtraAssetRequirement = ({
  id,
  label,
  required = false,
  owner,
  key,
  state,
}: {
  id: string;
  label: string;
  required?: boolean;
  owner: V2TemplateAssetRequirement["owner"];
  key: string;
  state?: "on" | "off";
}): V2TemplateAssetRequirement => ({
  id,
  label,
  required,
  owner,
  ...(state ? { state } : {}),
  themeScoped: true,
  assetRef: {
    source: "extra",
    key,
  },
});

export interface V2TemplateAssetRequirementGroup {
  id: string;
  label: string;
  description: string;
  owner: V2TemplateAssetRequirement["owner"];
  category?: "template" | "development";
  mode: "single" | "stateful" | "common" | "byDay";
  requirements: V2TemplateAssetRequirement[];
}

const v2_toRequirementGroup = ({
  id,
  label,
  description,
  owner,
  category,
  mode,
  requirements,
}: V2TemplateAssetRequirementGroup): V2TemplateAssetRequirementGroup => ({
  id,
  label,
  description,
  owner,
  category: category ?? "template",
  mode,
  requirements,
});

const v2_createTimetableDayRequirements = ({
  ownerKey,
  idPrefix,
  labelPrefix,
  keyPrefix,
}: {
  ownerKey: string;
  idPrefix: string;
  labelPrefix: string;
  keyPrefix: "online" | "multi" | "offline" | "offlineMemo";
}): V2TemplateAssetRequirement[] =>
  v2_TEMPLATE_DAY_KEYS.map((dayKey) =>
    v2_toBuiltinAssetRequirement({
      id: `${idPrefix}.${dayKey}`,
      label: `${labelPrefix} (${dayKey})`,
      owner: { type: "timetable", key: ownerKey },
      key: `${keyPrefix}_${dayKey}` as Extract<
        V2TemplateAssetRef,
        { source: "builtin" }
      >["key"],
      dayKey,
    })
  );

const v2_createTimetableAssetGroup = ({
  id,
  label,
  description,
  ownerKey,
  commonKey,
  useByDay,
  dayKeyPrefix,
}: {
  id: string;
  label: string;
  description: string;
  ownerKey: string;
  commonKey: Extract<V2TemplateAssetRef, { source: "builtin" }>["key"];
  useByDay: boolean;
  dayKeyPrefix: "online" | "multi" | "offline" | "offlineMemo";
}): V2TemplateAssetRequirementGroup => {
  const commonRequirement = v2_toBuiltinAssetRequirement({
    id: `${id}.default`,
    label,
    owner: { type: "timetable", key: ownerKey },
    key: commonKey,
  });
  const dayRequirements = useByDay
    ? v2_createTimetableDayRequirements({
        ownerKey,
        idPrefix: id,
        labelPrefix: label,
        keyPrefix: dayKeyPrefix,
      })
    : [];

  return v2_toRequirementGroup({
    id,
    label,
    description,
    owner: { type: "timetable", key: ownerKey },
    mode: useByDay ? "byDay" : "common",
    requirements: [commonRequirement, ...dayRequirements],
  });
};

export const v2_getTemplateAssetRequirements = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateAssetRequirement[] =>
  v2_getTemplateAssetRequirementGroups(renderConfig).flatMap(
    (group) => group.requirements
  );

export const v2_getTemplateAssetRequirementGroups = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateAssetRequirementGroup[] => {
  const capabilities = v2_resolveStructureCapabilities(renderConfig);
  const developmentRequirements: V2TemplateAssetRequirement[] = [
    v2_toBuiltinAssetRequirement({
      id: "development.guide",
      label: "가이드 레이어",
      owner: { type: "scene", key: "guide" },
      key: "guideByTheme",
    }),
  ];
  const groups: V2TemplateAssetRequirementGroup[] = [
    v2_toRequirementGroup({
      id: "scene",
      label: "Scene",
      description: "배경, 보드, 그리드처럼 최종 템플릿에 필요한 장면 에셋",
      owner: { type: "scene", key: "scene" },
      mode: "single",
      requirements: [
        v2_toBuiltinAssetRequirement({
          id: "scene.background",
          label: "배경",
          owner: { type: "scene", key: "background" },
          key: "bgByTheme",
        }),
        v2_toBuiltinAssetRequirement({
          id: "scene.board",
          label: "보드 배경",
          owner: { type: "scene", key: "board" },
          key: "boardByTheme",
        }),
        v2_toBuiltinAssetRequirement({
          id: "scene.grid",
          label: "Grid 배경",
          owner: { type: "scene", key: "grid" },
          key: "gridBgByTheme",
        }),
      ],
    }),
  ];

  if (capabilities.objects.topObject.enabled) {
    if (capabilities.objects.topObject.mode === "statefulAsset") {
      groups.push(
        v2_toRequirementGroup({
          id: "object.topObject",
          label: "상단 오브젝트",
          description: "ON/OFF 상태에 따라 다른 상단 오브젝트를 사용합니다.",
          owner: { type: "object", key: "topObject" },
          mode: "stateful",
          requirements: [
            v2_toExtraAssetRequirement({
              id: "object.topObject.on",
              label: "상단 오브젝트 (ON)",
              owner: { type: "object", key: "topObject" },
              key: "topObject.on",
              state: "on",
            }),
            v2_toExtraAssetRequirement({
              id: "object.topObject.off",
              label: "상단 오브젝트 (OFF)",
              owner: { type: "object", key: "topObject" },
              key: "topObject.off",
              state: "off",
            }),
          ],
        })
      );
    } else if (capabilities.objects.topObject.mode === "singleAsset") {
      groups.push(
        v2_toRequirementGroup({
          id: "object.topObject",
          label: "상단 오브젝트",
          description: "상단 장식 또는 상태 오브젝트의 기본 이미지",
          owner: { type: "object", key: "topObject" },
          mode: "single",
          requirements: [
            v2_toBuiltinAssetRequirement({
              id: "object.topObject",
              label: "상단 오브젝트",
              owner: { type: "object", key: "topObject" },
              key: "topObjectByTheme",
            }),
          ],
        })
      );
    }
  }

  if (capabilities.objects.profile.enabled) {
    developmentRequirements.push(
      v2_toBuiltinAssetRequirement({
        id: "development.profile.artworkDummy",
        label: "프레임 아트워크 더미",
        required: capabilities.objects.profile.imageRequired,
        owner: { type: "object", key: "profile" },
        key: "profileBgByTheme",
      })
    );
    groups.push(
      v2_toRequirementGroup({
        id: "object.profile",
        label: "프로필",
        description: "프로필 프레임과 프레임 배경",
        owner: { type: "object", key: "profile" },
        mode: "single",
        requirements: [
          v2_toBuiltinAssetRequirement({
            id: "object.profile.frame",
            label: "프레임",
            required: capabilities.objects.profile.frameRequired,
            owner: { type: "object", key: "profile" },
            key: "frameByTheme",
          }),
          v2_toBuiltinAssetRequirement({
            id: "object.profile.frameBg",
            label: "프레임 배경",
            owner: { type: "object", key: "profile" },
            key: "frameBgByTheme",
          }),
        ],
      })
    );
  }

  if (capabilities.objects.artist.enabled) {
    if (capabilities.objects.artist.mode === "textWithAsset") {
      groups.push(
        v2_toRequirementGroup({
          id: "object.artist",
          label: "아티스트 오브젝트",
          description: "아티스트 영역에 사용하는 단일 오브젝트",
          owner: { type: "object", key: "artist" },
          mode: "single",
          requirements: [
            v2_toBuiltinAssetRequirement({
              id: "object.artist",
              label: "아티스트 오브젝트",
              owner: { type: "object", key: "artist" },
              key: "artist",
            }),
          ],
        })
      );
    } else if (capabilities.objects.artist.mode === "textWithStatefulAsset") {
      groups.push(
        v2_toRequirementGroup({
          id: "object.artist",
          label: "아티스트 오브젝트",
          description: "아티스트 표시 상태별 오브젝트",
          owner: { type: "object", key: "artist" },
          mode: "stateful",
          requirements: [
            v2_toBuiltinAssetRequirement({
              id: "object.artist.on",
              label: "아티스트 오브젝트 (ON)",
              owner: { type: "object", key: "artist" },
              key: "artistOnByTheme",
              state: "on",
            }),
            v2_toBuiltinAssetRequirement({
              id: "object.artist.off",
              label: "아티스트 오브젝트 (OFF)",
              owner: { type: "object", key: "artist" },
              key: "artistOffByTheme",
              state: "off",
            }),
          ],
        })
      );
    }
  }

  if (capabilities.objects.memo.enabled) {
    if (capabilities.objects.memo.mode === "textWithAsset") {
      groups.push(
        v2_toRequirementGroup({
          id: "object.memo",
          label: "메모 오브젝트",
          description: "주간 메모 영역에 사용하는 오브젝트",
          owner: { type: "object", key: "memo" },
          mode: "single",
          requirements: [
            v2_toBuiltinAssetRequirement({
              id: "object.memo",
              label: "메모 오브젝트",
              owner: { type: "object", key: "memo" },
              key: "memoByTheme",
            }),
          ],
        })
      );
    } else if (capabilities.objects.memo.mode === "statefulAssetWithText") {
      groups.push(
        v2_toRequirementGroup({
          id: "object.memo",
          label: "메모 오브젝트",
          description: "주간 메모 표시 상태별 오브젝트",
          owner: { type: "object", key: "memo" },
          mode: "stateful",
          requirements: [
            v2_toExtraAssetRequirement({
              id: "object.memo.on",
              label: "메모 오브젝트 (ON)",
              owner: { type: "object", key: "memo" },
              key: "memo.on",
              state: "on",
            }),
            v2_toExtraAssetRequirement({
              id: "object.memo.off",
              label: "메모 오브젝트 (OFF)",
              owner: { type: "object", key: "memo" },
              key: "memo.off",
              state: "off",
            }),
          ],
        })
      );
    }
  }

  groups.push(
    v2_createTimetableAssetGroup({
      id: "timetable.online",
      label: "온라인 카드",
      description: "온라인 상태 카드 배경",
      ownerKey: "online",
      commonKey: "onlineByTheme",
      useByDay: renderConfig.editorOptions.useOnlineAssetsByDay,
      dayKeyPrefix: "online",
    }),
    v2_createTimetableAssetGroup({
      id: "timetable.offline",
      label: "오프라인 카드",
      description: "오프라인 상태 카드 배경",
      ownerKey: "offline",
      commonKey: "offlineByTheme",
      useByDay: renderConfig.editorOptions.useOfflineAssetsByDay,
      dayKeyPrefix: "offline",
    })
  );

  if (
    capabilities.timetable.multipleEnabled &&
    renderConfig.editorOptions.useMultiAssetsByDay
  ) {
    groups.push(
      v2_createTimetableAssetGroup({
        id: "timetable.multi",
        label: "다회차 카드",
        description: "온라인 다회차 상태 카드 배경",
        ownerKey: "multi",
        commonKey: "multiByTheme",
        useByDay: true,
        dayKeyPrefix: "multi",
      })
    );
  } else if (capabilities.timetable.multipleEnabled) {
    groups.push(
      v2_createTimetableAssetGroup({
        id: "timetable.multi",
        label: "다회차 카드",
        description: "온라인 다회차 상태 카드 배경",
        ownerKey: "multi",
        commonKey: "multiByTheme",
        useByDay: false,
        dayKeyPrefix: "multi",
      })
    );
  }

  if (
    capabilities.timetable.offlineMemoEnabled &&
    renderConfig.editorOptions.useOfflineMemoAssetsByDay
  ) {
    groups.push(
      v2_createTimetableAssetGroup({
        id: "timetable.offlineMemo",
        label: "오프라인 메모 카드",
        description: "오프라인 메모 상태 카드 배경",
        ownerKey: "offlineMemo",
        commonKey: "offlineMemoByTheme",
        useByDay: true,
        dayKeyPrefix: "offlineMemo",
      })
    );
  } else if (capabilities.timetable.offlineMemoEnabled) {
    groups.push(
      v2_createTimetableAssetGroup({
        id: "timetable.offlineMemo",
        label: "오프라인 메모 카드",
        description: "오프라인 메모 상태 카드 배경",
        ownerKey: "offlineMemo",
        commonKey: "offlineMemoByTheme",
        useByDay: false,
        dayKeyPrefix: "offlineMemo",
      })
    );
  }

  if (developmentRequirements.length > 0) {
    groups.push(
      v2_toRequirementGroup({
        id: "development.support",
        label: "개발/검수 보조 에셋",
        description: "가이드, 더미 이미지처럼 제작 중 확인을 돕는 에셋",
        owner: { type: "scene", key: "development" },
        category: "development",
        mode: "single",
        requirements: developmentRequirements,
      })
    );
  }

  return groups;
};
