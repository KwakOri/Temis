import {
  useTemplateRuntimeData,
  useTemplateRuntimeUIContext,
} from "@/contexts/v2/template-runtime-ui-context";
import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import type { TDefaultCard, TEntry } from "@/types/time-table/data";
import type {
  V2TemplateEditorScopedPreviewMode,
  V2TemplateEditorSceneUnitScope,
  V2TemplateEditorStatefulSceneScope,
  V2TemplateEditorTimetableComponentScope,
} from "@/types/time-table/template-editor-ui";
import type {
  V2TemplateDayKey,
  V2TemplateTimetableCardStatusKey,
} from "@/types/time-table/template-render-config";
import { v2_getTimetableComponentStateForStatus } from "@/utils/v2/timetable-component-layer-tree";
import { v2_getRuntimeSceneNodes } from "@/utils/v2/template-graph-runtime";
import { v2_getStatefulSceneFeatureLayerId } from "@/utils/v2/stateful-scene-variants";
import { useGesture } from "@use-gesture/react";
import { useEffect, useMemo, useRef, useState } from "react";
import V2TimeTableCell from "../scene/card-cell";
import V2TimeTableContent from "../scene/preview-scene";
import V2SceneRenderer from "../scene/scene-renderer";
import {
  v2_PREVIEW_SCALE_MAX_MOBILE,
  v2_PREVIEW_SCALE_MIN,
  v2_clampPreviewScale,
} from "../shared/preview-scale";

interface V2TimeTablePreviewProps {
  timetableGridEditScope?: boolean;
  timetableComponentEditScope?: V2TemplateEditorTimetableComponentScope | null;
  sceneUnitEditScope?: V2TemplateEditorSceneUnitScope | null;
  statefulSceneEditScope?: V2TemplateEditorStatefulSceneScope | null;
  scopePreviewMode?: V2TemplateEditorScopedPreviewMode;
  selectedCanvasTarget?: V2CanvasEditorTarget | null;
  onMoveCanvasObject?: (payload: {
    target: V2CanvasEditorTarget;
    deltaX: number;
    deltaY: number;
  }) => void;
  onActivateCanvasTarget?: (target: V2CanvasEditorTarget) => void;
}

export type V2CanvasEditorDragKind =
  | "scene"
  | "cardObject"
  | "grid"
  | "timetableSlot";

export interface V2CanvasEditorTarget {
  layerId: string;
  highlightTarget?: string;
  dragKind: V2CanvasEditorDragKind;
  dayKey?: V2TemplateDayKey;
}

type V2PreviewDragMemo =
  | {
      mode: "pan";
      startX: number;
      startY: number;
    }
  | {
      mode: "object";
      target: V2CanvasEditorTarget;
      lastX: number;
      lastY: number;
    };

const v2_isTextEditingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, select, button, [contenteditable='true']")
  );
};

const V2StatefulSceneFeaturePreview: React.FC<{
  scope: V2TemplateEditorStatefulSceneScope;
}> = ({ scope }) => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const {
    state: { scale },
  } = useTemplateRuntimeUIContext();
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
  const featureLayerId = v2_getStatefulSceneFeatureLayerId(scope.feature);
  const featureNode = runtimeSceneNodes.find(
    (node) => (node.layerId ?? node.id) === featureLayerId
  );
  if (!featureNode) return null;

  return (
    <div
      id={`stateful-scene-${scope.feature}-preview`}
      className="relative origin-top-left overflow-visible"
      style={{
        transform: `scale(${scale})`,
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }}
    >
      <V2SceneRenderer
        sceneNodes={[featureNode]}
        artistVisibleOverride={
          scope.feature === "artist" ? scope.status === "on" : undefined
        }
        memoVisibleOverride={
          scope.feature === "memo" ? scope.status === "on" : undefined
        }
        topObjectVisibleOverride={
          scope.feature === "topObject" ? scope.status === "on" : undefined
        }
      />
    </div>
  );
};

const V2TimetableGridPreview: React.FC = () => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const {
    state: { scale },
  } = useTemplateRuntimeUIContext();
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
  const gridNode = runtimeSceneNodes.find(
    (node) => (node.layerId ?? node.id) === "grid"
  );
  if (!gridNode) return null;

  return (
    <div
      id="timetable-grid-preview"
      className="relative origin-top-left overflow-visible"
      style={{
        transform: `scale(${scale})`,
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }}
    >
      <V2SceneRenderer sceneNodes={[gridNode]} />
    </div>
  );
};

const V2SceneUnitPreview: React.FC<{
  scope: V2TemplateEditorSceneUnitScope;
}> = ({ scope }) => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const {
    state: { scale },
  } = useTemplateRuntimeUIContext();
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
  const sceneNode = useMemo(() => {
    const stack = [...runtimeSceneNodes];
    while (stack.length > 0) {
      const node = stack.shift();
      if (!node) continue;
      if ((node.layerId ?? node.id) === scope.layerId) return node;
      if (node.kind === "group" && node.children.length > 0) {
        stack.unshift(...node.children);
      }
    }
    return null;
  }, [runtimeSceneNodes, scope.layerId]);
  if (!sceneNode) return null;

  return (
    <div
      id={`scene-unit-${scope.layerId}-preview`}
      className="relative origin-top-left overflow-visible"
      style={{
        transform: `scale(${scale})`,
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }}
    >
      <V2SceneRenderer sceneNodes={[sceneNode]} />
    </div>
  );
};

const v2_CREATE_PREVIEW_ENTRY = (entryIndex: number): TEntry => ({
  time: entryIndex === 0 ? "09:00" : `${10 + entryIndex}:00`,
  mainTitle: entryIndex === 0 ? "Main Title" : `Main Title ${entryIndex + 1}`,
  subTitle: entryIndex === 0 ? "Sub Title" : `Sub Title ${entryIndex + 1}`,
  isGuerrilla: false,
});

const v2_getPreviewEntries = ({
  baseCard,
  status,
  entryCount,
}: {
  baseCard: TDefaultCard | undefined;
  status: V2TemplateTimetableCardStatusKey;
  entryCount: number;
}): TEntry[] => {
  const safeEntryCount = status === "multi" ? Math.max(2, entryCount) : 1;
  const sourceEntries = Array.isArray(baseCard?.entries) ? baseCard.entries : [];
  return Array.from({ length: safeEntryCount }, (_, index) => {
    const sourceEntry = sourceEntries[index] ?? sourceEntries[0];
    return {
      ...v2_CREATE_PREVIEW_ENTRY(index),
      ...(sourceEntry ?? {}),
    };
  });
};

const V2TimetableComponentPreview: React.FC<{
  scope: V2TemplateEditorTimetableComponentScope;
}> = ({ scope }) => {
  const { data, currentTheme } = useTemplateRuntimeContext();
  const { weekDates } = useTemplateRuntimeData();
  const {
    state: { scale },
  } = useTemplateRuntimeUIContext();
  const { renderConfig } = useTemplateRenderConfigContext();
  const component = renderConfig.timetable.components[scope.componentId] ?? null;
  const state = v2_getTimetableComponentStateForStatus({
    component,
    status: scope.status,
  });
  if (!component || !state) return null;

  const width =
    state.size?.width ??
    (scope.status === "offline"
      ? renderConfig.cardSizes.offline.width
      : renderConfig.cardSizes.online.width);
  const height =
    state.size?.height ??
    (scope.status === "offline"
      ? renderConfig.cardSizes.offline.height
      : renderConfig.cardSizes.online.height);
  const baseCard = data[0];
  const previewCard: TDefaultCard = {
    ...(baseCard ?? {
      day: 1,
      isOffline: false,
      entries: [],
    }),
    day: 1,
    isOffline: scope.status === "offline" || scope.status === "offlineMemo",
    offlineMemo:
      scope.status === "offlineMemo"
        ? baseCard?.offlineMemo || "Offline memo"
        : "",
    entries: v2_getPreviewEntries({
      baseCard,
      status: scope.status,
      entryCount: renderConfig.timetable.multiEntryCount,
    }),
  };

  return (
    <div
      id="timetable-card-component-preview"
      className="relative origin-top-left overflow-visible"
      style={{
        transform: `scale(${scale})`,
        width,
        height,
      }}
    >
      <V2TimeTableCell
        time={previewCard}
        weekDate={weekDates[0] ?? new Date()}
        index={0}
        dayKeyOverride="mon"
        currentTheme={currentTheme}
        cardStructure={state.card}
        cardContainerSizeOverride={{ width, height }}
        disableNodeVisibilityFilter
        enableEditorObjectHandles
      />
    </div>
  );
};

const V2TimeTablePreview: React.FC<V2TimeTablePreviewProps> = ({
  timetableGridEditScope = false,
  timetableComponentEditScope = null,
  sceneUnitEditScope = null,
  statefulSceneEditScope = null,
  scopePreviewMode = "isolated",
  selectedCanvasTarget = null,
  onMoveCanvasObject,
  onActivateCanvasTarget,
}) => {
  const { state, actions } = useTemplateRuntimeUIContext();
  const { renderConfig } = useTemplateRenderConfigContext();
  const { scale, isMobile, captureSize } = state;
  const { updateScale } = actions;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);
  const shouldShowFullPreview =
    scopePreviewMode === "full" ||
    (!timetableGridEditScope &&
      !timetableComponentEditScope &&
      !sceneUnitEditScope &&
      !statefulSceneEditScope);
  const scopedArtistVisibleOverride =
    statefulSceneEditScope?.feature === "artist"
      ? statefulSceneEditScope.status === "on"
      : undefined;
  const scopedMemoVisibleOverride =
    statefulSceneEditScope?.feature === "memo"
      ? statefulSceneEditScope.status === "on"
      : undefined;
  const scopedTopObjectVisibleOverride =
    statefulSceneEditScope?.feature === "topObject"
      ? statefulSceneEditScope.status === "on"
      : undefined;
  const componentPreviewSize = useMemo(() => {
    if (shouldShowFullPreview) return null;
    if (timetableGridEditScope || sceneUnitEditScope || statefulSceneEditScope) {
      return {
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      };
    }
    if (!timetableComponentEditScope) return null;
    const component =
      renderConfig.timetable.components[timetableComponentEditScope.componentId];
    const state = v2_getTimetableComponentStateForStatus({
      component,
      status: timetableComponentEditScope.status,
    });
    if (!state) return null;
    return {
      width:
        state.size?.width ??
        (timetableComponentEditScope.status === "offline"
          ? renderConfig.cardSizes.offline.width
          : renderConfig.cardSizes.online.width),
      height:
        state.size?.height ??
        (timetableComponentEditScope.status === "offline"
          ? renderConfig.cardSizes.offline.height
          : renderConfig.cardSizes.online.height),
    };
  }, [
    renderConfig,
    shouldShowFullPreview,
    timetableGridEditScope,
    sceneUnitEditScope,
    statefulSceneEditScope,
    timetableComponentEditScope,
  ]);

  // 동적으로 템플릿 크기 사용 (기본값으로 1280x720 사용)
  const templateWidth = componentPreviewSize?.width ?? captureSize?.width ?? 1280;
  const templateHeight = componentPreviewSize?.height ?? captureSize?.height ?? 720;
  
  const containerWidth = templateWidth * scale;
  const containerHeight = templateHeight * scale;

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], first, memo, touches }) => {
        if (touches > 1) return memo;

        if (first) {
          const shouldPan = isMobile || isSpacePressedRef.current;
          if (!shouldPan && selectedCanvasTarget) {
            onActivateCanvasTarget?.(selectedCanvasTarget);
            memo = {
              mode: "object",
              target: selectedCanvasTarget,
              lastX: 0,
              lastY: 0,
            } satisfies V2PreviewDragMemo;
          } else if (shouldPan) {
            memo = {
              mode: "pan",
              startX: position.x,
              startY: position.y,
            } satisfies V2PreviewDragMemo;
          } else {
            return null;
          }
        }

        if (!memo) {
          return memo;
        }

        const dragMemo = memo as V2PreviewDragMemo;
        if (dragMemo.mode === "pan") {
          const newX = dragMemo.startX + mx;
          const newY = dragMemo.startY + my;

          setPosition({ x: newX, y: newY });
          return dragMemo;
        }

        const deltaX = (mx - dragMemo.lastX) / scale;
        const deltaY = (my - dragMemo.lastY) / scale;
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          onMoveCanvasObject?.({
            target: dragMemo.target,
            deltaX,
            deltaY,
          });
        }

        return {
          ...dragMemo,
          lastX: mx,
          lastY: my,
        } satisfies V2PreviewDragMemo;
      },
      onPinch: ({ offset: [scale_offset], first, memo, touches }) => {
        if (!isMobile || touches < 2) return memo;

        if (first) {
          memo = {
            scale: scale,
            position: { x: position.x, y: position.y },
          };
        }

        if (!memo) {
          memo = {
            scale: scale,
            position: { x: position.x, y: position.y },
          };
        }

        if (updateScale && Math.abs(scale_offset) > 0.001) {
          const newScale = v2_clampPreviewScale({
            value: memo.scale + scale_offset * 0.01,
            isMobile: true,
          });
          updateScale(newScale);
        }

        return memo;
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 1,
        pointer: { touch: true },
      },
      pinch: {
        scaleBounds: {
          min: v2_PREVIEW_SCALE_MIN,
          max: v2_PREVIEW_SCALE_MAX_MOBILE,
        },
        rubberband: true,
        threshold: 0.1,
        pointer: { touch: true },
      },
    }
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || v2_isTextEditingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      isSpacePressedRef.current = true;
      setIsSpacePressed(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
    };
    const handleBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isMobile]);

  const isDraggable = isMobile || isSpacePressed;

  useEffect(() => {
    const handleResize = () => {
      if (isMobile) {
        setPosition({ x: 0, y: 0 });
      }
    };

    if (isMobile) {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isMobile]);

  const viewportStyle = useMemo(
    () => ({
      height: isMobile ? "30vh" : "100%",
      flex: isMobile ? "none" : "1",
    }),
    [isMobile]
  );

  const alphaMatteStyle = useMemo(
    () => ({
      backgroundColor: "#0f141c",
      backgroundImage:
        "linear-gradient(45deg, #1c2330 25%, transparent 25%), linear-gradient(-45deg, #1c2330 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1c2330 75%), linear-gradient(-45deg, transparent 75%, #1c2330 75%)",
      backgroundSize: "24px 24px",
      backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
    }),
    []
  );

  const draggableStyle = useMemo(
    () => ({
      width: containerWidth,
      height: containerHeight,
      transform: `translate(${position.x}px, ${position.y}px)`,
      cursor: isDraggable ? "grab" : selectedCanvasTarget ? "move" : "default",
      transition: "width 0.1s ease, height 0.1s ease",
      touchAction: "none" as const,
    }),
    [
      containerHeight,
      containerWidth,
      isDraggable,
      position.x,
      position.y,
      selectedCanvasTarget,
    ]
  );

  return (
    <div
      className="flex justify-center items-center h-full overflow-hidden pt-4 md:p-0 "
      style={{
        ...viewportStyle,
        ...alphaMatteStyle,
      }}
    >
      <div
        className="relative shadow-lg rounded-sm"
        data-v2-preview-canvas-root="true"
        style={draggableStyle}
        {...bind()}
      >
        {shouldShowFullPreview ? (
          <V2TimeTableContent
            artistVisibleOverride={scopedArtistVisibleOverride}
            memoVisibleOverride={scopedMemoVisibleOverride}
            topObjectVisibleOverride={scopedTopObjectVisibleOverride}
          />
        ) : timetableComponentEditScope ? (
          <V2TimetableComponentPreview scope={timetableComponentEditScope} />
        ) : timetableGridEditScope ? (
          <V2TimetableGridPreview />
        ) : sceneUnitEditScope ? (
          <V2SceneUnitPreview scope={sceneUnitEditScope} />
        ) : statefulSceneEditScope ? (
          <V2StatefulSceneFeaturePreview scope={statefulSceneEditScope} />
        ) : (
          <V2TimeTableContent />
        )}
      </div>
    </div>
  );
};

export default V2TimeTablePreview;
