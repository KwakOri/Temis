"use client";

import { useCallback, useMemo } from "react";

import type {
  StudioGraphNodeType,
  StudioImageFit,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTextAppearance,
  StudioTextShadow,
  StudioTextStroke,
} from "@/types/template-studio";
import {
  applyStudioNodePositions,
  planStudioAlignNodes,
  planStudioDistributeNodes,
  type StudioAlignAxis,
  type StudioAlignment,
} from "@/utils/template-studio/align-commands";
import type { StudioCanvasPoint } from "@/utils/template-studio/canvas-viewport-geometry";
import {
  applyStudioDuplicateNodes,
  applyStudioGroupNodes,
  applyStudioLayerMove,
  applyStudioToggleNodeHidden,
  applyStudioToggleNodeLock,
  applyStudioUngroupNodes,
  getStudioLayerMoveMessage,
  getStudioNodeVisibilityMessage,
  planStudioDuplicateNodes,
  planStudioGroupNodes,
  planStudioLayerMove,
  planStudioToggleNodeHidden,
  planStudioToggleNodeLock,
  planStudioUngroupNodes,
  type StudioLayerMoveCommand,
} from "@/utils/template-studio/graph-commands";
import { getStudioTopLevelNodeIds } from "@/utils/template-studio/graph-nodes";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import { createStudioId } from "@/utils/template-studio/id";
import { getStudioCanvasNodeDragBlockedReason } from "@/utils/template-studio/layer-drag";
import {
  applyStudioDeleteNodes,
  planStudioDeleteNodes,
} from "@/utils/template-studio/node-commands";
import {
  applyStudioNodeFitParent,
  applyStudioNodeOffset,
  applyStudioNodeStyleValue,
  applyStudioNodeTextAlignment,
  ensureStudioNodeStyleId,
  planStudioNudgeNodes,
  resolveStudioDragTargetNodeIds,
  type StudioTextAlignment,
} from "@/utils/template-studio/node-style-commands";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";
import {
  getStudioTextOutermostConfiguredOutset,
  getStudioTextStrokeStack,
  rebuildStudioTextStrokeOutsetsFromPanelOrder,
} from "@/utils/template-studio/text-appearance";
import {
  normalizeStudioCanvasSize,
  normalizeStudioRotationDeg,
  type StudioResizeGeometry,
} from "@/utils/template-studio/transform-commands";
import {
  createStudioThumbnailNode,
  planStudioNodeInsertion,
} from "@/utils/thumbnail-studio/node-defaults";
import {
  createDefaultStudioTextShadow,
  createDefaultStudioTextStroke,
  isStudioTextOpacity,
  isStudioTextOutset,
  materializeStudioTextAppearance,
  removeLegacyStudioTextAppearanceScalars,
  STUDIO_TEXT_DEFAULT_STROKE_THICKNESS,
  STUDIO_TEXT_MAX_OUTSET,
  STUDIO_TEXT_MAX_STROKES,
  validateStudioTextAppearance,
} from "@/utils/template-studio/text-appearance-commands";
import {
  applyThumbnailStudioBindNodeToInput,
  applyThumbnailStudioCreateInputForNode,
  applyThumbnailStudioMaterializeNodeBinding,
  applyThumbnailStudioRestoreNodeBindingFallback,
  applyThumbnailStudioSetSelectAssetMapping,
  applyThumbnailStudioSetSelectTextOutput,
  applyThumbnailStudioSetWeekDateFormatting,
} from "@/utils/thumbnail-studio/binding-commands";
import {
  cloneStudioTextEffectPreset,
  isStudioBuiltinTextEffectPresetVersionValid,
  pickStudioTextPresetTypography,
  type StudioTextEffectPreset,
} from "@/utils/thumbnail-studio/text-effect-presets";
import {
  createStudioCustomTextPreset,
  deleteStudioCustomTextPreset,
  duplicateStudioCustomTextPreset,
  renameStudioCustomTextPreset,
} from "@/utils/thumbnail-studio/text-preset-session";
import {
  formatStudioImageObjectPosition,
  parseStudioImageObjectPosition,
} from "@/utils/thumbnail-studio/image-object-position";
import { ensureThumbnailWeekDatesContract } from "@/utils/thumbnail-studio/week-dates";

/** 되돌리기 한 단위를 이 변경이 시작하는지. 끌고 있는 중이면 시작하지 않는다. */
export interface ThumbnailUpdateOptions {
  history?: boolean;
}

export interface ThumbnailNodeCommandsOptions {
  /** 콜백 안에서 최신 문서를 읽는다. */
  getDocument: () => StudioTemplateDocument;
  getSelectedNodeIds: () => string[];
  getSelectedNodeId: () => string | null;
  /** 지금 보고 있는 캔버스 좌표의 중앙. 뷰포트만 아는 값이다. */
  getViewportCenter: () => StudioCanvasPoint | null;
  updateDocument: (
    mutate: (draft: StudioTemplateDocument) => void,
    options?: ThumbnailUpdateOptions,
  ) => void;
  /** 되돌리기 한 단위를 시작한다. 끌기와 연속 조작이 직접 부른다. */
  captureHistory: () => void;
  applySelection: (nodeIds: string[], primaryNodeId?: string | null) => void;
  selectSingleNode: (nodeId: string | null) => void;
  onStatusMessage: (message: string) => void;
  getPreviewValues?: () => StudioRuntimeValues;
  getCustomTextPresets?: () => StudioTextEffectPreset[];
  setCustomTextPresets?: (
    value:
      | StudioTextEffectPreset[]
      | ((current: StudioTextEffectPreset[]) => StudioTextEffectPreset[]),
  ) => void;
}

export interface ThumbnailNodeCommands {
  addNode: (type: StudioGraphNodeType) => void;
  deleteNodes: () => void;
  duplicateNodes: () => void;
  groupNodes: () => void;
  ungroupNodes: () => void;
  moveLayer: (command: StudioLayerMoveCommand) => void;
  toggleLock: () => void;
  toggleHidden: () => void;
  renameNode: (nodeId: string, label: string) => void;
  nudgeNodes: (deltaX: number, deltaY: number) => void;
  /** 캔버스에서 끌기를 시작할 수 있는지. 막히면 이유를 알리고 false를 준다. */
  beginNodeMove: (nodeId: string) => boolean;
  moveNodeByDrag: (
    nodeId: string,
    delta: { deltaX: number; deltaY: number },
  ) => void;
  setStyleValue: (
    nodeId: string,
    key: string,
    value: string | number | undefined,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setGeometry: (
    nodeId: string,
    geometry: Partial<StudioResizeGeometry>,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setRotation: (
    nodeId: string,
    rotateDeg: number,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setTextAlignment: (nodeId: string, textAlign: StudioTextAlignment) => void;
  toggleFitParent: (nodeId: string) => void;
  setImageFit: (nodeId: string, fit: StudioImageFit) => void;
  setStaticText: (nodeId: string, value: string) => void;
  setImageAsset: (nodeId: string, assetId: string | null) => void;
  setStaticBinding: (
    nodeId: string,
    strategy?: "materialize" | "restore",
  ) => void;
  setWeekDateFormatting: (
    nodeId: string,
    value: { format: string; template: string },
  ) => void;
  addWeekDates: () => void;
  createInputFromNode: (nodeId: string) => string | null;
  bindNodeToInput: (nodeId: string, inputId: string) => void;
  setSelectTextOutput: (nodeId: string, output: "label" | "value") => void;
  setSelectAssetMapping: (
    nodeId: string,
    optionValue: string,
    assetId: string | null,
  ) => void;
  materializeTextAppearance: (nodeId: string) => void;
  setTextFill: (
    nodeId: string,
    patch: Partial<StudioTextAppearance["fill"]>,
    options?: ThumbnailUpdateOptions,
  ) => void;
  addTextStroke: (nodeId: string) => void;
  setTextStrokeThickness: (
    nodeId: string,
    strokeId: string,
    thickness: number,
    options?: ThumbnailUpdateOptions,
  ) => void;
  updateTextStroke: (
    nodeId: string,
    strokeId: string,
    patch: Partial<StudioTextStroke>,
    options?: ThumbnailUpdateOptions,
  ) => void;
  duplicateTextStroke: (nodeId: string, strokeId: string) => void;
  deleteTextStroke: (nodeId: string, strokeId: string) => void;
  moveTextStroke: (nodeId: string, strokeId: string, toIndex: number) => void;
  setTextShadow: (
    nodeId: string,
    patch: Partial<StudioTextShadow>,
    options?: ThumbnailUpdateOptions,
  ) => void;
  removeTextShadow: (nodeId: string) => void;
  applyTextPreset: (nodeId: string, preset: StudioTextEffectPreset) => void;
  createTextPreset: (nodeId: string, label?: string) => void;
  duplicateTextPreset: (presetId: string) => void;
  renameTextPreset: (presetId: string, label: string) => void;
  deleteTextPreset: (presetId: string) => void;
  alignNodes: (axis: StudioAlignAxis, alignment: StudioAlignment) => void;
  distributeNodes: (axis: StudioAlignAxis) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setCanvasBackground: (
    background: string,
    options?: ThumbnailUpdateOptions,
  ) => void;
  setCanvasName: (name: string) => void;
  selectAll: () => void;
}

type StudioTextAppearanceMutator = (
  appearance: StudioTextAppearance,
  style: Record<string, string | number | undefined>,
) => void;

/**
 * 썸네일 편집기의 문서 명령.
 *
 * 무엇을 바꿀 수 있는지는 공통 순수 함수가 판단하고, 이 훅은 그 계획을 문서에 적고
 * 선택과 안내를 맞추는 배선만 한다. 시간표에서 쓰는 명령을 그대로 쓰는 것이 규칙이다.
 * 같은 일을 하는 함수를 썸네일에 새로 쓰면 두 편집기의 규칙이 갈라진다.
 */
export function useThumbnailNodeCommands({
  getDocument,
  getSelectedNodeIds,
  getSelectedNodeId,
  getViewportCenter,
  updateDocument,
  captureHistory,
  applySelection,
  selectSingleNode,
  onStatusMessage,
  getPreviewValues,
  getCustomTextPresets,
  setCustomTextPresets,
}: ThumbnailNodeCommandsOptions): ThumbnailNodeCommands {
  const applyTextAppearanceMutation = useCallback(
    (
      nodeId: string,
      mutate: StudioTextAppearanceMutator,
      options?: ThumbnailUpdateOptions,
    ) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      if (!node || (node.type !== "text" && node.type !== "flexibleText")) {
        onStatusMessage("Text appearance requires one text node");
        return false;
      }
      if (node.locked) {
        onStatusMessage("Locked text cannot change appearance");
        return false;
      }

      const currentStyle = node.styleId
        ? document.styles[node.styleId]
        : undefined;
      const current = materializeStudioTextAppearance(node, currentStyle);
      if (!current.ok) {
        onStatusMessage(
          current.diagnostics[0]?.message ?? "Text appearance is invalid",
        );
        return false;
      }

      const nextStyle = { ...current.style };
      const nextAppearance = JSON.parse(
        JSON.stringify(current.appearance),
      ) as StudioTextAppearance;
      mutate(nextAppearance, nextStyle);
      const diagnostics = validateStudioTextAppearance(nextAppearance);
      if (diagnostics.length > 0) {
        onStatusMessage(
          diagnostics[0]?.message ?? "Text appearance is invalid",
        );
        return false;
      }

      updateDocument((draft) => {
        const draftNode = draft.graph.nodes[nodeId];
        if (!draftNode) return;
        const styleId = ensureStudioNodeStyleId(draft, draftNode);
        const draftStyle = removeLegacyStudioTextAppearanceScalars({
          ...(draft.styles[styleId] ?? {}),
          ...nextStyle,
        });
        draftNode.textAppearance = nextAppearance;
        draft.styles[styleId] = draftStyle;
      }, options);
      return true;
    },
    [getDocument, onStatusMessage, updateDocument],
  );

  const materializeTextAppearance = useCallback(
    (nodeId: string) => {
      applyTextAppearanceMutation(nodeId, () => {});
    },
    [applyTextAppearanceMutation],
  );

  const setTextFill = useCallback(
    (
      nodeId: string,
      patch: Partial<StudioTextAppearance["fill"]>,
      options?: ThumbnailUpdateOptions,
    ) => {
      applyTextAppearanceMutation(
        nodeId,
        (appearance) => {
          if (typeof patch.color === "string") {
            appearance.fill.color = patch.color;
          }
          if (typeof patch.opacity === "number") {
            appearance.fill.opacity = patch.opacity;
          }
        },
        options,
      );
    },
    [applyTextAppearanceMutation],
  );

  const addTextStroke = useCallback(
    (nodeId: string) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      const style = node?.styleId ? document.styles[node.styleId] : undefined;
      const current = node
        ? materializeStudioTextAppearance(node, style)
        : { ok: false as const, diagnostics: [] };
      if (!current.ok) {
        onStatusMessage(
          current.diagnostics[0]?.message ?? "Text appearance is invalid",
        );
        return;
      }
      if (current.appearance.strokes.length >= STUDIO_TEXT_MAX_STROKES) {
        onStatusMessage(
          `Text supports at most ${STUDIO_TEXT_MAX_STROKES} strokes.`,
        );
        return;
      }

      const outermostOutset = getStudioTextOutermostConfiguredOutset(
        current.appearance.strokes,
      );
      const availableOutset = STUDIO_TEXT_MAX_OUTSET - outermostOutset;
      if (availableOutset <= 0) {
        onStatusMessage("Total stroke outset cannot exceed 64px.");
        return;
      }
      const nextThickness = Math.min(
        STUDIO_TEXT_DEFAULT_STROKE_THICKNESS,
        availableOutset,
      );

      applyTextAppearanceMutation(nodeId, (appearance) => {
        // Storage remains back→front. The new default band is the outermost layer,
        // so it is rendered first and shown last in the panel.
        appearance.strokes.unshift(
          createDefaultStudioTextStroke(
            createStudioId("stroke"),
            outermostOutset + nextThickness,
          ),
        );
      });
    },
    [applyTextAppearanceMutation, getDocument, onStatusMessage],
  );

  const setTextStrokeThickness = useCallback(
    (
      nodeId: string,
      strokeId: string,
      thickness: number,
      options?: ThumbnailUpdateOptions,
    ) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      const style = node?.styleId ? document.styles[node.styleId] : undefined;
      const current = node
        ? materializeStudioTextAppearance(node, style)
        : { ok: false as const, diagnostics: [] };
      if (!current.ok) {
        onStatusMessage(
          current.diagnostics[0]?.message ?? "Text appearance is invalid",
        );
        return;
      }

      const stack = getStudioTextStrokeStack(current.appearance.strokes);
      const targetIndex = stack.findIndex(
        ({ stroke }) => stroke.id === strokeId,
      );
      if (targetIndex < 0) return;

      const otherThickness = stack.reduce(
        (total, entry, index) =>
          index === targetIndex ? total : total + entry.thickness,
        0,
      );
      const availableThickness = Math.max(
        0,
        STUDIO_TEXT_MAX_OUTSET - otherThickness,
      );
      if (
        !Number.isFinite(thickness) ||
        thickness < 0 ||
        thickness > availableThickness
      ) {
        onStatusMessage(
          thickness > availableThickness
            ? "Total stroke outset cannot exceed 64px."
            : `Stroke thickness must be between 0 and ${availableThickness}px.`,
        );
        return;
      }

      applyTextAppearanceMutation(
        nodeId,
        (appearance) => {
          const nextStack = getStudioTextStrokeStack(appearance.strokes);
          const panelStrokes = nextStack.map(({ stroke }) => stroke);
          const thicknesses = nextStack.map(({ thickness: value }) => value);
          thicknesses[targetIndex] = thickness;
          appearance.strokes = rebuildStudioTextStrokeOutsetsFromPanelOrder(
            panelStrokes,
            thicknesses,
          );
        },
        options,
      );
    },
    [applyTextAppearanceMutation, getDocument, onStatusMessage],
  );

  const updateTextStroke = useCallback(
    (
      nodeId: string,
      strokeId: string,
      patch: Partial<StudioTextStroke>,
      options?: ThumbnailUpdateOptions,
    ) => {
      if (patch.outset !== undefined && !isStudioTextOutset(patch.outset)) {
        onStatusMessage(
          `Stroke outset must be between 0 and ${STUDIO_TEXT_MAX_OUTSET}.`,
        );
        return;
      }
      if (patch.opacity !== undefined && !isStudioTextOpacity(patch.opacity)) {
        onStatusMessage("Stroke opacity must be between 0 and 1.");
        return;
      }
      applyTextAppearanceMutation(
        nodeId,
        (appearance) => {
          const stroke = appearance.strokes.find(({ id }) => id === strokeId);
          if (!stroke) return;
          if (typeof patch.label === "string") stroke.label = patch.label;
          if (typeof patch.enabled === "boolean")
            stroke.enabled = patch.enabled;
          if (typeof patch.color === "string") stroke.color = patch.color;
          if (typeof patch.outset === "number") {
            stroke.outset = patch.outset;
          }
          if (typeof patch.opacity === "number") {
            stroke.opacity = patch.opacity;
          }
        },
        options,
      );
    },
    [applyTextAppearanceMutation, onStatusMessage],
  );

  const duplicateTextStroke = useCallback(
    (nodeId: string, strokeId: string) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      const style = node?.styleId ? document.styles[node.styleId] : undefined;
      const current = node
        ? materializeStudioTextAppearance(node, style)
        : { ok: false as const, diagnostics: [] };
      if (!current.ok) {
        onStatusMessage(
          current.diagnostics[0]?.message ?? "Text appearance is invalid",
        );
        return;
      }
      if (current.appearance.strokes.length >= STUDIO_TEXT_MAX_STROKES) {
        onStatusMessage(
          `Text supports at most ${STUDIO_TEXT_MAX_STROKES} strokes.`,
        );
        return;
      }

      const stack = getStudioTextStrokeStack(current.appearance.strokes);
      const targetIndex = stack.findIndex(
        ({ stroke }) => stroke.id === strokeId,
      );
      if (targetIndex < 0) return;
      const targetThickness = stack[targetIndex]?.thickness ?? 0;
      const totalThickness = stack.reduce(
        (total, entry) => total + entry.thickness,
        0,
      );
      if (totalThickness + targetThickness > STUDIO_TEXT_MAX_OUTSET) {
        onStatusMessage("Total stroke outset cannot exceed 64px.");
        return;
      }

      applyTextAppearanceMutation(nodeId, (appearance) => {
        const nextStack = getStudioTextStrokeStack(appearance.strokes);
        const panelStrokes = nextStack.map(({ stroke }) => stroke);
        const thicknesses = nextStack.map(({ thickness }) => thickness);
        const copy = {
          ...panelStrokes[targetIndex],
          id: createStudioId("stroke"),
        };
        panelStrokes.splice(targetIndex + 1, 0, copy);
        thicknesses.splice(targetIndex + 1, 0, targetThickness);
        appearance.strokes = rebuildStudioTextStrokeOutsetsFromPanelOrder(
          panelStrokes,
          thicknesses,
        );
      });
    },
    [applyTextAppearanceMutation, getDocument, onStatusMessage],
  );

  const deleteTextStroke = useCallback(
    (nodeId: string, strokeId: string) => {
      applyTextAppearanceMutation(nodeId, (appearance) => {
        const stack = getStudioTextStrokeStack(appearance.strokes);
        const targetIndex = stack.findIndex(
          ({ stroke }) => stroke.id === strokeId,
        );
        if (targetIndex < 0) return;
        const panelStrokes = stack
          .filter((_, index) => index !== targetIndex)
          .map(({ stroke }) => stroke);
        const thicknesses = stack
          .filter((_, index) => index !== targetIndex)
          .map(({ thickness }) => thickness);
        appearance.strokes = rebuildStudioTextStrokeOutsetsFromPanelOrder(
          panelStrokes,
          thicknesses,
        );
      });
    },
    [applyTextAppearanceMutation],
  );

  const moveTextStroke = useCallback(
    (nodeId: string, strokeId: string, toIndex: number) => {
      applyTextAppearanceMutation(nodeId, (appearance) => {
        const stack = getStudioTextStrokeStack(appearance.strokes);
        const fromIndex = stack.findIndex(
          ({ stroke }) => stroke.id === strokeId,
        );
        if (fromIndex < 0) return;
        const panelStrokes = stack.map(({ stroke }) => stroke);
        const thicknesses = stack.map(({ thickness }) => thickness);
        const [stroke] = panelStrokes.splice(fromIndex, 1);
        const [thickness] = thicknesses.splice(fromIndex, 1);
        const nextIndex = Math.max(
          0,
          Math.min(panelStrokes.length, Math.trunc(toIndex)),
        );
        panelStrokes.splice(nextIndex, 0, stroke);
        thicknesses.splice(nextIndex, 0, thickness);
        appearance.strokes = rebuildStudioTextStrokeOutsetsFromPanelOrder(
          panelStrokes,
          thicknesses,
        );
      });
    },
    [applyTextAppearanceMutation],
  );

  const setTextShadow = useCallback(
    (
      nodeId: string,
      patch: Partial<StudioTextShadow>,
      options?: ThumbnailUpdateOptions,
    ) => {
      if (
        (patch.offsetX !== undefined &&
          (typeof patch.offsetX !== "number" ||
            !Number.isFinite(patch.offsetX))) ||
        (patch.offsetY !== undefined &&
          (typeof patch.offsetY !== "number" ||
            !Number.isFinite(patch.offsetY))) ||
        (patch.blur !== undefined &&
          (typeof patch.blur !== "number" ||
            !Number.isFinite(patch.blur) ||
            patch.blur < 0))
      ) {
        onStatusMessage(
          "Text shadow offsets must be finite and blur non-negative.",
        );
        return;
      }
      if (patch.opacity !== undefined && !isStudioTextOpacity(patch.opacity)) {
        onStatusMessage("Text shadow opacity must be between 0 and 1.");
        return;
      }
      applyTextAppearanceMutation(
        nodeId,
        (appearance) => {
          const shadow = appearance.shadow ?? createDefaultStudioTextShadow();
          if (typeof patch.enabled === "boolean")
            shadow.enabled = patch.enabled;
          if (typeof patch.color === "string") shadow.color = patch.color;
          if (typeof patch.offsetX === "number") {
            shadow.offsetX = patch.offsetX;
          }
          if (typeof patch.offsetY === "number") {
            shadow.offsetY = patch.offsetY;
          }
          if (typeof patch.blur === "number") {
            shadow.blur = patch.blur;
          }
          if (typeof patch.opacity === "number") {
            shadow.opacity = patch.opacity;
          }
          appearance.shadow = shadow;
        },
        options,
      );
    },
    [applyTextAppearanceMutation, onStatusMessage],
  );

  const removeTextShadow = useCallback(
    (nodeId: string) => {
      applyTextAppearanceMutation(nodeId, (appearance) => {
        delete appearance.shadow;
      });
    },
    [applyTextAppearanceMutation],
  );

  const applyTextPreset = useCallback(
    (nodeId: string, preset: StudioTextEffectPreset) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      if (!node || (node.type !== "text" && node.type !== "flexibleText")) {
        onStatusMessage("Text preset requires one text node");
        return;
      }
      if (node.locked) {
        onStatusMessage("Locked text cannot apply a preset");
        return;
      }
      if (
        (preset.source === "builtin" &&
          !isStudioBuiltinTextEffectPresetVersionValid(preset)) ||
        (preset.source === "custom" &&
          (!Number.isInteger(preset.version) || preset.version < 1))
      ) {
        onStatusMessage("Text preset version is invalid");
        return;
      }
      const currentStyle = node.styleId
        ? document.styles[node.styleId]
        : undefined;
      const current = materializeStudioTextAppearance(node, currentStyle);
      if (!current.ok) {
        onStatusMessage(
          current.diagnostics[0]?.message ?? "Text appearance is invalid",
        );
        return;
      }
      const copied = cloneStudioTextEffectPreset(preset);
      const diagnostics = validateStudioTextAppearance(copied.appearance);
      if (diagnostics.length > 0) {
        onStatusMessage(
          diagnostics[0]?.message ?? "Text preset appearance is invalid",
        );
        return;
      }

      updateDocument((draft) => {
        const draftNode = draft.graph.nodes[nodeId];
        if (!draftNode) return;
        const styleId = ensureStudioNodeStyleId(draft, draftNode);
        const nextStyle = removeLegacyStudioTextAppearanceScalars({
          ...(draft.styles[styleId] ?? {}),
          ...(current.style ?? {}),
        });
        Object.assign(
          nextStyle,
          pickStudioTextPresetTypography(copied.typography),
        );
        const nextAppearance = copied.appearance;
        nextAppearance.strokes = nextAppearance.strokes.map((stroke) => ({
          ...stroke,
          id: createStudioId("stroke"),
        }));
        nextAppearance.presetRef = {
          source: copied.source,
          presetId: copied.id,
          presetVersion: copied.version,
        };
        draftNode.textAppearance = nextAppearance;
        draft.styles[styleId] = nextStyle;
      });
      onStatusMessage(`Applied text preset: ${preset.label}`);
    },
    [getDocument, onStatusMessage, updateDocument],
  );

  const createTextPreset = useCallback(
    (nodeId: string, label?: string) => {
      if (!getCustomTextPresets || !setCustomTextPresets) {
        onStatusMessage("Custom text presets are unavailable in this session");
        return;
      }
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      if (!node || (node.type !== "text" && node.type !== "flexibleText")) {
        onStatusMessage("Custom preset requires one text node");
        return;
      }
      if (node.locked) {
        onStatusMessage("Locked text cannot create a preset");
        return;
      }
      const style = node.styleId ? document.styles[node.styleId] : undefined;
      const current = materializeStudioTextAppearance(node, style);
      if (!current.ok) {
        onStatusMessage(
          current.diagnostics[0]?.message ?? "Text appearance is invalid",
        );
        return;
      }
      const previewText =
        node.binding?.kind === "staticText" && node.binding.value.trim() !== ""
          ? node.binding.value
          : node.label || "Aa";
      const preset = createStudioCustomTextPreset({
        id: createStudioId("text-preset"),
        label: label?.trim() || node.label || "Custom Text",
        previewText,
        typography: pickStudioTextPresetTypography(style ?? {}),
        appearance: current.appearance,
      });
      setCustomTextPresets((presets) => [...presets, preset]);
      onStatusMessage(`Saved text preset: ${preset.label}`);
    },
    [getCustomTextPresets, getDocument, onStatusMessage, setCustomTextPresets],
  );

  const duplicateTextPreset = useCallback(
    (presetId: string) => {
      if (!getCustomTextPresets || !setCustomTextPresets) {
        onStatusMessage("Custom text presets are unavailable in this session");
        return;
      }
      const source = getCustomTextPresets().find(
        (preset) => preset.source === "custom" && preset.id === presetId,
      );
      if (!source) {
        onStatusMessage("Only custom text presets can be duplicated");
        return;
      }
      const copy = duplicateStudioCustomTextPreset(
        source,
        createStudioId("text-preset"),
      );
      setCustomTextPresets((presets) => [...presets, copy]);
    },
    [getCustomTextPresets, onStatusMessage, setCustomTextPresets],
  );

  const renameTextPreset = useCallback(
    (presetId: string, label: string) => {
      if (!getCustomTextPresets || !setCustomTextPresets) return;
      setCustomTextPresets((presets) =>
        presets.map((preset) =>
          preset.source === "custom" && preset.id === presetId
            ? renameStudioCustomTextPreset(preset, label)
            : preset,
        ),
      );
    },
    [getCustomTextPresets, setCustomTextPresets],
  );

  const deleteTextPreset = useCallback(
    (presetId: string) => {
      if (!getCustomTextPresets || !setCustomTextPresets) return;
      setCustomTextPresets((presets) =>
        deleteStudioCustomTextPreset(presets, presetId),
      );
    },
    [getCustomTextPresets, setCustomTextPresets],
  );
  const addNode = useCallback(
    (type: StudioGraphNodeType) => {
      const document = getDocument();
      const selectedNodeId = getSelectedNodeId();
      const selectedNode = selectedNodeId
        ? document.graph.nodes[selectedNodeId]
        : null;
      const plan = planStudioNodeInsertion({
        document,
        type,
        selectedNode,
        viewportCenter: getViewportCenter(),
      });
      const nodeId = createStudioId("node");
      const styleId = createStudioId("style");
      const { node, style } = createStudioThumbnailNode({
        nodeId,
        styleId,
        type,
        label: `New ${getStudioGraphNodeTypeLabel(type)}`,
        plan,
      });

      updateDocument((draft) => {
        draft.styles[styleId] = style;
        draft.graph.nodes[nodeId] = node;

        // 형제 목록의 끝이 가장 앞에 그려진다. 새로 넣은 것은 보여야 한다.
        const siblings = plan.parentId
          ? draft.graph.nodes[plan.parentId]?.childIds
          : draft.graph.rootNodeIds;
        siblings?.push(nodeId);
      });
      selectSingleNode(nodeId);
      onStatusMessage(`Added ${getStudioGraphNodeTypeLabel(type)}`);
    },
    [
      getDocument,
      getSelectedNodeId,
      getViewportCenter,
      onStatusMessage,
      selectSingleNode,
      updateDocument,
    ],
  );

  const addWeekDates = useCallback(() => {
    const document = getDocument();
    const selectedNodeId = getSelectedNodeId();
    const selectedNode = selectedNodeId
      ? document.graph.nodes[selectedNodeId]
      : null;
    const plan = planStudioNodeInsertion({
      document,
      type: "text",
      selectedNode,
      viewportCenter: getViewportCenter(),
    });
    const nodeId = createStudioId("node");
    const styleId = createStudioId("style");
    const { node, style } = createStudioThumbnailNode({
      nodeId,
      styleId,
      type: "text",
      label: "Week Dates",
      plan,
    });

    node.binding = {
      kind: "builtinField",
      fieldId: "week.date_range",
      dateRangeFormat: "long",
      dateRangeTemplate:
        "${start.YYYY}.${start.MM}.${start.DD} - ${end.MM}.${end.DD}",
    };
    node.meta = { semantic: { type: "weekDates" } };
    style.width = plan.width;
    style.height = plan.height;

    updateDocument((draft) => {
      ensureThumbnailWeekDatesContract(draft);
      draft.styles[styleId] = style;
      draft.graph.nodes[nodeId] = node;

      const siblings = plan.parentId
        ? draft.graph.nodes[plan.parentId]?.childIds
        : draft.graph.rootNodeIds;
      siblings?.push(nodeId);
    });
    selectSingleNode(nodeId);
    onStatusMessage("Added Week Dates");
  }, [
    getDocument,
    getSelectedNodeId,
    getViewportCenter,
    onStatusMessage,
    selectSingleNode,
    updateDocument,
  ]);

  const deleteNodes = useCallback(() => {
    const plan = planStudioDeleteNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioDeleteNodes(draft, plan.nodeIds));
    selectSingleNode(plan.fallbackSelectionId);
    onStatusMessage(`Deleted ${plan.nodeIds.length} object(s)`);
  }, [
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    selectSingleNode,
    updateDocument,
  ]);

  const duplicateNodes = useCallback(() => {
    const plan = planStudioDuplicateNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    const duplicated: { nodeIds: string[] } = { nodeIds: [] };
    updateDocument((draft) => {
      duplicated.nodeIds = applyStudioDuplicateNodes(draft, plan);
    });

    if (duplicated.nodeIds.length === 0) {
      onStatusMessage("Duplicate failed");
      return;
    }

    applySelection(duplicated.nodeIds, duplicated.nodeIds.at(-1) ?? null);
    onStatusMessage(`Duplicated ${duplicated.nodeIds.length} object(s)`);
  }, [
    applySelection,
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    updateDocument,
  ]);

  const groupNodes = useCallback(() => {
    const plan = planStudioGroupNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioGroupNodes(draft, plan));
    selectSingleNode(plan.groupNodeId);
    onStatusMessage(`Grouped ${plan.orderedNodeIds.length} objects`);
  }, [
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    selectSingleNode,
    updateDocument,
  ]);

  const ungroupNodes = useCallback(() => {
    const plan = planStudioUngroupNodes(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    const released: { nodeIds: string[] } = { nodeIds: [] };
    updateDocument((draft) => {
      released.nodeIds = applyStudioUngroupNodes(draft, plan.groupNodeIds);
    });

    applySelection(released.nodeIds, released.nodeIds.at(-1) ?? null);
    onStatusMessage(`Ungrouped ${plan.groupNodeIds.length} group(s)`);
  }, [
    applySelection,
    getDocument,
    getSelectedNodeIds,
    onStatusMessage,
    updateDocument,
  ]);

  const moveLayer = useCallback(
    (command: StudioLayerMoveCommand) => {
      const plan = planStudioLayerMove(
        getDocument(),
        getSelectedNodeId(),
        command,
      );
      if (!plan.ok) {
        onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) => applyStudioLayerMove(draft, plan));
      onStatusMessage(getStudioLayerMoveMessage(command));
    },
    [getDocument, getSelectedNodeId, onStatusMessage, updateDocument],
  );

  const toggleLock = useCallback(() => {
    const plan = planStudioToggleNodeLock(getDocument(), getSelectedNodeIds());
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioToggleNodeLock(draft, plan));
    onStatusMessage(plan.nextLocked ? "Locked" : "Unlocked");
  }, [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument]);

  const toggleHidden = useCallback(() => {
    const plan = planStudioToggleNodeHidden(
      getDocument(),
      getSelectedNodeIds(),
    );
    if (!plan.ok) {
      onStatusMessage(plan.reason);
      return;
    }

    updateDocument((draft) => applyStudioToggleNodeHidden(draft, plan));
    onStatusMessage(getStudioNodeVisibilityMessage(plan.nextHidden));
  }, [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument]);

  const renameNode = useCallback(
    (nodeId: string, label: string) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (node) node.label = label;
      });
    },
    [updateDocument],
  );

  const nudgeNodes = useCallback(
    (deltaX: number, deltaY: number) => {
      const plan = planStudioNudgeNodes(getDocument(), getSelectedNodeIds());
      if (!plan.ok) {
        if (plan.reason) onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) =>
        applyStudioNodeOffset(draft, plan.nodeIds, { deltaX, deltaY }),
      );
    },
    [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument],
  );

  const beginNodeMove = useCallback(
    (nodeId: string) => {
      const document = getDocument();
      const targetNodeIds = resolveStudioDragTargetNodeIds(
        document,
        getSelectedNodeIds(),
        nodeId,
      );
      const blockedReason = getStudioCanvasNodeDragBlockedReason(
        document,
        targetNodeIds,
      );

      if (blockedReason) {
        onStatusMessage(blockedReason);
        return false;
      }

      // 한 번의 끌기가 되돌리기 한 단위다. 여기서 시작하고 끌고 있는 동안은 쌓지 않는다.
      captureHistory();
      return true;
    },
    [captureHistory, getDocument, getSelectedNodeIds, onStatusMessage],
  );

  const moveNodeByDrag = useCallback(
    (nodeId: string, delta: { deltaX: number; deltaY: number }) => {
      const targetNodeIds = resolveStudioDragTargetNodeIds(
        getDocument(),
        getSelectedNodeIds(),
        nodeId,
      );

      updateDocument(
        (draft) =>
          applyStudioNodeOffset(draft, targetNodeIds, delta, {
            round: true,
            skipFillParent: true,
          }),
        { history: false },
      );
    },
    [getDocument, getSelectedNodeIds, updateDocument],
  );

  const setStyleValue = useCallback(
    (
      nodeId: string,
      key: string,
      value: string | number | undefined,
      options?: ThumbnailUpdateOptions,
    ) => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;

      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node || node.locked) return;

        const nextValue =
          node.type === "image" &&
          key === "objectPosition" &&
          value !== undefined
            ? formatStudioImageObjectPosition(
                parseStudioImageObjectPosition(value),
              )
            : value;
        applyStudioNodeStyleValue(draft, node, key, nextValue);
      }, options);
    },
    [getDocument, updateDocument],
  );

  const setGeometry = useCallback(
    (
      nodeId: string,
      geometry: Partial<StudioResizeGeometry>,
      options?: ThumbnailUpdateOptions,
    ) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;

        Object.entries(geometry).forEach(([key, value]) => {
          if (typeof value !== "number" || !Number.isFinite(value)) return;
          applyStudioNodeStyleValue(draft, node, key, Number(value.toFixed(2)));
        });
      }, options);
    },
    [updateDocument],
  );

  const setRotation = useCallback(
    (nodeId: string, rotateDeg: number, options?: ThumbnailUpdateOptions) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;
        applyStudioNodeStyleValue(
          draft,
          node,
          "rotateDeg",
          normalizeStudioRotationDeg(rotateDeg),
        );
      }, options);
    },
    [updateDocument],
  );

  const setTextAlignment = useCallback(
    (nodeId: string, textAlign: StudioTextAlignment) => {
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node) return;
        applyStudioNodeTextAlignment(draft, node, textAlign);
      });
    },
    [updateDocument],
  );

  const toggleFitParent = useCallback(
    (nodeId: string) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      if (!node) return;

      const shouldFillParent = node.layoutMode !== "fillParent";
      const geometry = resolveStudioGraphNodeGeometry(document, nodeId);

      updateDocument((draft) => {
        const draftNode = draft.graph.nodes[nodeId];
        if (!draftNode) return;
        applyStudioNodeFitParent(draft, draftNode, shouldFillParent, geometry);
      });
    },
    [getDocument, updateDocument],
  );

  const setImageFit = useCallback(
    (nodeId: string, fit: StudioImageFit) => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (node && !node.locked) node.fit = fit;
      });
    },
    [getDocument, updateDocument],
  );

  const setStaticText = useCallback(
    (nodeId: string, value: string) => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node || node.locked) return;
        node.binding = { kind: "staticText", value };
      });
    },
    [getDocument, updateDocument],
  );

  const setImageAsset = useCallback(
    (nodeId: string, assetId: string | null) => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      updateDocument((draft) => {
        const node = draft.graph.nodes[nodeId];
        if (!node || node.locked) return;
        node.binding = assetId ? { kind: "staticAsset", assetId } : undefined;
      });
    },
    [getDocument, updateDocument],
  );

  const setStaticBinding = useCallback(
    (nodeId: string, strategy: "materialize" | "restore" = "materialize") => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      const values = getPreviewValues?.() ?? {
        global: {},
        days: {},
        entries: {},
        timetable: {
          weekStartDate: undefined,
          entriesByDay: {},
          offlineMemoByDay: {},
        },
      };
      updateDocument((draft) => {
        if (strategy === "restore") {
          applyThumbnailStudioRestoreNodeBindingFallback(draft, nodeId);
        } else {
          applyThumbnailStudioMaterializeNodeBinding(draft, values, nodeId);
        }
      });
    },
    [getDocument, getPreviewValues, updateDocument],
  );

  const setWeekDateFormatting = useCallback(
    (nodeId: string, value: { format: string; template: string }) => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      updateDocument((draft) => {
        applyThumbnailStudioSetWeekDateFormatting(
          draft,
          nodeId,
          value.format,
          value.template,
        );
      });
    },
    [getDocument, updateDocument],
  );

  const createInputFromNode = useCallback(
    (nodeId: string): string | null => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return null;
      const values = getPreviewValues?.() ?? {
        global: {},
        days: {},
        entries: {},
        timetable: {
          weekStartDate: undefined,
          entriesByDay: {},
          offlineMemoByDay: {},
        },
      };
      let createdId: string | null = null;
      updateDocument((draft) => {
        createdId = applyThumbnailStudioCreateInputForNode(
          draft,
          values,
          nodeId,
        );
      });
      return createdId;
    },
    [getDocument, getPreviewValues, updateDocument],
  );

  const bindNodeToInput = useCallback(
    (nodeId: string, inputId: string) => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      updateDocument((draft) => {
        applyThumbnailStudioBindNodeToInput(draft, nodeId, inputId);
      });
    },
    [getDocument, updateDocument],
  );

  const setSelectTextOutput = useCallback(
    (nodeId: string, output: "label" | "value") => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      updateDocument((draft) => {
        applyThumbnailStudioSetSelectTextOutput(draft, nodeId, output);
      });
    },
    [getDocument, updateDocument],
  );

  const setSelectAssetMapping = useCallback(
    (nodeId: string, optionValue: string, assetId: string | null) => {
      const currentNode = getDocument().graph.nodes[nodeId];
      if (!currentNode || currentNode.locked) return;
      updateDocument((draft) => {
        applyThumbnailStudioSetSelectAssetMapping(
          draft,
          nodeId,
          optionValue,
          assetId,
        );
      });
    },
    [getDocument, updateDocument],
  );

  const alignNodes = useCallback(
    (axis: StudioAlignAxis, alignment: StudioAlignment) => {
      const plan = planStudioAlignNodes(
        getDocument(),
        getSelectedNodeIds(),
        axis,
        alignment,
      );
      if (!plan.ok) {
        onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) =>
        applyStudioNodePositions(draft, plan.positions),
      );
      onStatusMessage(`Aligned ${plan.positions.length} object(s)`);
    },
    [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument],
  );

  const distributeNodes = useCallback(
    (axis: StudioAlignAxis) => {
      const plan = planStudioDistributeNodes(
        getDocument(),
        getSelectedNodeIds(),
        axis,
      );
      if (!plan.ok) {
        onStatusMessage(plan.reason);
        return;
      }

      updateDocument((draft) =>
        applyStudioNodePositions(draft, plan.positions),
      );
      onStatusMessage(`Distributed ${plan.positions.length} objects`);
    },
    [getDocument, getSelectedNodeIds, onStatusMessage, updateDocument],
  );

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      // 노드 좌표는 그대로 둔다. 캔버스 밖으로 나간 노드도 지우지 않는다. 지우면
      // 되돌릴 수 없는 손실이 된다.
      const normalized = normalizeStudioCanvasSize(size);
      updateDocument((draft) => {
        draft.canvas.width = normalized.width;
        draft.canvas.height = normalized.height;
      });
    },
    [updateDocument],
  );

  const setCanvasBackground = useCallback(
    (background: string, options?: ThumbnailUpdateOptions) => {
      updateDocument((draft) => {
        draft.canvas.background = background;
      }, options);
    },
    [updateDocument],
  );

  const setCanvasName = useCallback(
    (name: string) => {
      updateDocument((draft) => {
        draft.metadata.name = name;
      });
    },
    [updateDocument],
  );

  const selectAll = useCallback(() => {
    const document = getDocument();
    const nodeIds = getStudioTopLevelNodeIds(
      document,
      document.graph.rootNodeIds,
    );
    if (nodeIds.length === 0) {
      onStatusMessage("Nothing to select");
      return;
    }

    applySelection(nodeIds, nodeIds.at(-1) ?? null);
    onStatusMessage(`Selected ${nodeIds.length} object(s)`);
  }, [applySelection, getDocument, onStatusMessage]);

  return useMemo(
    () => ({
      addNode,
      deleteNodes,
      duplicateNodes,
      groupNodes,
      ungroupNodes,
      moveLayer,
      toggleLock,
      toggleHidden,
      renameNode,
      nudgeNodes,
      beginNodeMove,
      moveNodeByDrag,
      setStyleValue,
      setGeometry,
      setRotation,
      setTextAlignment,
      toggleFitParent,
      setImageFit,
      setStaticText,
      setImageAsset,
      setStaticBinding,
      setWeekDateFormatting,
      addWeekDates,
      createInputFromNode,
      bindNodeToInput,
      setSelectTextOutput,
      setSelectAssetMapping,
      materializeTextAppearance,
      setTextFill,
      addTextStroke,
      setTextStrokeThickness,
      updateTextStroke,
      duplicateTextStroke,
      deleteTextStroke,
      moveTextStroke,
      setTextShadow,
      removeTextShadow,
      applyTextPreset,
      createTextPreset,
      duplicateTextPreset,
      renameTextPreset,
      deleteTextPreset,
      alignNodes,
      distributeNodes,
      setCanvasSize,
      setCanvasBackground,
      setCanvasName,
      selectAll,
    }),
    [
      addNode,
      alignNodes,
      beginNodeMove,
      deleteNodes,
      distributeNodes,
      duplicateNodes,
      groupNodes,
      moveLayer,
      moveNodeByDrag,
      nudgeNodes,
      renameNode,
      selectAll,
      setCanvasBackground,
      setCanvasName,
      setCanvasSize,
      setGeometry,
      setImageAsset,
      setImageFit,
      setRotation,
      setStaticText,
      setStaticBinding,
      setWeekDateFormatting,
      addWeekDates,
      createInputFromNode,
      bindNodeToInput,
      setSelectTextOutput,
      setSelectAssetMapping,
      setStyleValue,
      setTextAlignment,
      setTextFill,
      addTextStroke,
      setTextStrokeThickness,
      updateTextStroke,
      duplicateTextStroke,
      deleteTextStroke,
      moveTextStroke,
      setTextShadow,
      removeTextShadow,
      materializeTextAppearance,
      applyTextPreset,
      createTextPreset,
      duplicateTextPreset,
      renameTextPreset,
      deleteTextPreset,
      toggleFitParent,
      toggleHidden,
      toggleLock,
      ungroupNodes,
    ],
  );
}
