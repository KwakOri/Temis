"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
} from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

import type { StudioPropertyItem } from "@/components/studio/editor-shell/studio-properties-panel";
import { StudioHexColorPicker } from "@/components/studio/inspector/studio-hex-color-picker";
import {
  StudioFitParentButton,
  StudioFontWeightField,
  StudioLineBreakField,
  StudioNumberField,
  StudioSelectField,
  StudioTextAlignmentField,
  StudioTextareaField,
} from "@/components/studio/inspector/studio-inspector-fields";
import type {
  StudioGraphNode,
  StudioImageFit,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  getStudioBindingInputId,
  isStudioImageNode,
  isStudioInputCompatibleWithNode,
  isStudioTextNode,
} from "@/utils/template-studio/binding-resolver";
import { getStudioInputTypeLabel } from "@/utils/template-studio/input-commands";
import type {
  StudioAlignAxis,
  StudioAlignment,
} from "@/utils/template-studio/align-commands";
import {
  getStudioSharedNumberValue,
  getStudioSharedStringValue,
} from "@/utils/template-studio/multi-selection";
import {
  getStudioTextAlignment,
  getStudioOpacityPercent,
  type StudioTextAlignment,
} from "@/utils/template-studio/node-style-commands";
import { hasStudioNodeInspectorSection } from "@/utils/template-studio/node-definitions";
import type { StudioGroupOverflowDiagnostic } from "@/utils/template-studio/graph-nodes";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";
import { isStudioFillParentLayout } from "@/utils/template-studio/object-layout";
import {
  getStudioTextStrokeStack,
  parseLegacyStudioTextShadow,
  resolveStudioTextAppearance,
} from "@/utils/template-studio/text-appearance";
import {
  STUDIO_TEXT_MAX_OUTSET,
  STUDIO_TEXT_MAX_STROKES,
} from "@/utils/template-studio/text-appearance-commands";
import {
  getStudioTextWrapMode,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
  type StudioTextWrapMode,
} from "@/utils/template-studio/text-wrap";
import { getStudioFontWeightOptions } from "@/utils/template-studio/web-fonts";
import {
  getStudioImageBorderRadius,
  getStudioImageObjectPosition,
} from "@/utils/thumbnail-studio/image-object-position";
import type { ThumbnailCanvasPreset } from "@/utils/thumbnail-studio/document-factory";

import type { ThumbnailNodeCommands } from "../_hooks/use-thumbnail-node-commands";

export interface ThumbnailInspectorParams {
  document: StudioTemplateDocument;
  /** 기본 폰트와 문서에 등록된 웹 폰트를 합친 후보 목록. */
  fontFamilies: string[];
  /** 조상이 함께 선택된 노드를 걷어낸 목록 */
  selectedNodes: StudioGraphNode[];
  /** 속성 패널이 기준으로 삼는 노드 */
  selectedNode: StudioGraphNode | null;
  openSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
  aspectRatioLocked: boolean;
  onAspectRatioLockedChange: (locked: boolean) => void;
  canvasPresets: ThumbnailCanvasPreset[];
  /** 캔버스 밖으로 나간 노드. 지우지 않고 알리기만 한다. */
  outsideCanvasNodeIds: string[];
  /** logical bounds는 안쪽이어도 effect visual bounds가 잘리는 노드. */
  clippedCanvasNodeIds: string[];
  /** overflow hidden/clip 그룹에서 잘릴 자식 진단. */
  groupOverflowDiagnostics: StudioGroupOverflowDiagnostic[];
  commands: ThumbnailNodeCommands;
  /** 연속 조작 한 묶음을 시작한다. 색 고르기가 부른다. */
  captureHistory: () => void;
  onFitCanvas: () => void;
  onCreateInput: (nodeId: string) => void;
  onOpenInput: (inputId: string) => void;
  onCropImage: (nodeId: string) => void;
}

const getNodeStyle = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
): StudioStyleRecord =>
  (node.styleId ? document.styles[node.styleId] : undefined) ?? {};

const ALIGN_BUTTONS: Array<{
  axis: StudioAlignAxis;
  alignment: StudioAlignment;
  title: string;
  icon: ReactNode;
}> = [
  {
    axis: "horizontal",
    alignment: "start",
    title: "Align left",
    icon: <AlignStartVertical className="h-3.5 w-3.5" />,
  },
  {
    axis: "horizontal",
    alignment: "center",
    title: "Align horizontal center",
    icon: <AlignCenterVertical className="h-3.5 w-3.5" />,
  },
  {
    axis: "horizontal",
    alignment: "end",
    title: "Align right",
    icon: <AlignEndVertical className="h-3.5 w-3.5" />,
  },
  {
    axis: "vertical",
    alignment: "start",
    title: "Align top",
    icon: <AlignStartHorizontal className="h-3.5 w-3.5" />,
  },
  {
    axis: "vertical",
    alignment: "center",
    title: "Align vertical center",
    icon: <AlignCenterHorizontal className="h-3.5 w-3.5" />,
  },
  {
    axis: "vertical",
    alignment: "end",
    title: "Align bottom",
    icon: <AlignEndHorizontal className="h-3.5 w-3.5" />,
  },
];

const ICON_BUTTON_CLASS =
  "flex h-8 items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40";

const IMAGE_FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
];

const OVERFLOW_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "clip", label: "Clip" },
];

const MIXED_FONT_FAMILY_VALUE = "__studio_mixed_font_family__";

/**
 * 썸네일 편집기의 우측 속성 섹션.
 *
 * 어떤 섹션을 보여줄지는 노드 정의표가 정한다. 화면에서 종류를 다시 따져 물으면 정의표에
 * 종류를 더할 때 인스펙터만 빠뜨리게 된다.
 *
 * 고른 것이 없으면 캔버스 속성을 보여준다. 편집할 대상이 없을 때 빈 패널을 두면 캔버스
 * 크기와 배경을 바꾸러 갈 곳이 없다.
 */
export const buildThumbnailInspectorSections = ({
  document,
  fontFamilies,
  selectedNodes,
  selectedNode,
  openSections,
  onToggleSection,
  aspectRatioLocked,
  onAspectRatioLockedChange,
  canvasPresets,
  outsideCanvasNodeIds,
  clippedCanvasNodeIds,
  groupOverflowDiagnostics,
  commands,
  captureHistory,
  onFitCanvas,
  onCreateInput,
  onOpenInput,
  onCropImage,
}: ThumbnailInspectorParams): StudioPropertyItem[] => {
  const section = (
    id: string,
    title: string,
    content: ReactNode,
    action?: ReactNode,
    badge?: string,
  ): StudioPropertyItem => ({
    id,
    title,
    action,
    badge,
    open: openSections[id] ?? true,
    onToggle: () => onToggleSection(id),
    content,
  });

  if (!selectedNode || selectedNodes.length === 0) {
    return buildCanvasSections({
      document,
      section,
      canvasPresets,
      outsideCanvasNodeIds,
      clippedCanvasNodeIds,
      groupOverflowDiagnostics,
      commands,
      captureHistory,
      onFitCanvas,
    });
  }

  const styles = selectedNodes.map((node) => getNodeStyle(document, node));
  const geometries = selectedNodes.map((node) =>
    resolveStudioGraphNodeGeometry(document, node.id),
  );
  const isLocked = selectedNodes.some((node) => node.locked);
  const isFillParent = selectedNodes.some((node) =>
    isStudioFillParentLayout(node.layoutMode),
  );
  const left = getStudioSharedNumberValue(geometries.map((box) => box.left));
  const top = getStudioSharedNumberValue(geometries.map((box) => box.top));
  const width = getStudioSharedNumberValue(geometries.map((box) => box.width));
  const height = getStudioSharedNumberValue(
    geometries.map((box) => box.height),
  );
  const rotation = getStudioSharedNumberValue(
    styles.map((style) => style.rotateDeg),
  );
  const opacity = getStudioSharedNumberValue(
    styles.map((style) => getStudioOpacityPercent(style.opacity)),
    100,
  );

  /** 적어 넣은 칸만 고른 것 전부에 적용한다. */
  const applyGeometry =
    (key: "left" | "top" | "width" | "height") => (value: number) =>
      selectedNodes.forEach((node) =>
        commands.setGeometry(node.id, { [key]: value }),
      );

  const applyStyleValue = (key: string, value: string | number | undefined) =>
    selectedNodes.forEach((node) =>
      commands.setStyleValue(node.id, key, value),
    );

  const sections: StudioPropertyItem[] = [];

  sections.push(
    section(
      "transform",
      "Transform",
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <StudioNumberField
            disabled={isLocked || isFillParent}
            label="X"
            mixed={left.mixed}
            value={left.value}
            onChange={applyGeometry("left")}
          />
          <StudioNumberField
            disabled={isLocked || isFillParent}
            label="Y"
            mixed={top.mixed}
            value={top.value}
            onChange={applyGeometry("top")}
          />
          <StudioNumberField
            disabled={isLocked || isFillParent}
            label="W"
            mixed={width.mixed}
            value={width.value}
            onChange={(nextWidth) => {
              applyGeometry("width")(nextWidth);
              if (!aspectRatioLocked) return;
              // 비율을 잠갔으면 노드마다 자기 비율로 세로를 맞춘다. 한 비율로 몰아
              // 맞추면 크기가 다른 객체가 서로 다른 모양으로 찌그러진다.
              selectedNodes.forEach((node, index) => {
                const box = geometries[index];
                if (!box.width) return;
                commands.setGeometry(node.id, {
                  height: (box.height / box.width) * nextWidth,
                });
              });
            }}
          />
          <StudioNumberField
            disabled={isLocked || isFillParent}
            label="H"
            mixed={height.mixed}
            value={height.value}
            onChange={(nextHeight) => {
              applyGeometry("height")(nextHeight);
              if (!aspectRatioLocked) return;
              selectedNodes.forEach((node, index) => {
                const box = geometries[index];
                if (!box.height) return;
                commands.setGeometry(node.id, {
                  width: (box.width / box.height) * nextHeight,
                });
              });
            }}
          />
          <StudioNumberField
            disabled={isLocked}
            label="Rotation"
            mixed={rotation.mixed}
            value={rotation.value}
            onChange={(value) =>
              selectedNodes.forEach((node) =>
                commands.setRotation(node.id, value),
              )
            }
          />
          <StudioNumberField
            disabled={isLocked}
            label="Opacity %"
            mixed={opacity.mixed}
            value={opacity.value}
            onChange={(percent) =>
              applyStyleValue(
                "opacity",
                Math.min(Math.max(percent, 0), 100) / 100,
              )
            }
          />
        </div>
        <button
          aria-pressed={aspectRatioLocked}
          className={ICON_BUTTON_CLASS}
          type="button"
          onClick={() => onAspectRatioLockedChange(!aspectRatioLocked)}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.05em]">
            {aspectRatioLocked ? "Aspect ratio locked" : "Lock aspect ratio"}
          </span>
        </button>
      </div>,
      <StudioFitParentButton
        active={isFillParent}
        onClick={() => commands.toggleFitParent(selectedNode.id)}
      />,
      isLocked ? "Locked" : undefined,
    ),
  );

  sections.push(
    section(
      "layout",
      "Layout",
      <div className="grid gap-2">
        <div className="grid grid-cols-6 gap-1">
          {ALIGN_BUTTONS.map(({ axis, alignment, title, icon }) => (
            <button
              className={ICON_BUTTON_CLASS}
              disabled={isLocked}
              key={`${axis}:${alignment}`}
              title={title}
              type="button"
              onClick={() => commands.alignNodes(axis, alignment)}
            >
              {icon}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            className={ICON_BUTTON_CLASS}
            disabled={isLocked || selectedNodes.length < 3}
            title="Distribute horizontally"
            type="button"
            onClick={() => commands.distributeNodes("horizontal")}
          >
            <AlignHorizontalSpaceAround className="h-3.5 w-3.5" />
          </button>
          <button
            className={ICON_BUTTON_CLASS}
            disabled={isLocked || selectedNodes.length < 3}
            title="Distribute vertically"
            type="button"
            onClick={() => commands.distributeNodes("vertical")}
          >
            <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] font-medium leading-4 text-[var(--fg3)]">
          Objects inside a group align within that group.
        </p>
      </div>,
    ),
  );

  if (isStudioTextNode(selectedNode) || isStudioImageNode(selectedNode)) {
    const compatibleInputs = Object.values(document.inputs).filter(
      (input) =>
        input.scope === "global" &&
        isStudioInputCompatibleWithNode(input, selectedNode),
    );
    const bindingInputId = getStudioBindingInputId(selectedNode.binding);
    const selectedBoundInput = bindingInputId
      ? (document.inputs[bindingInputId] ?? null)
      : null;
    const isBoundBinding = Boolean(bindingInputId);
    const bindingSourceValue = bindingInputId ? `input:${bindingInputId}` : "";
    const assets = Object.values(document.assets);
    const selectedAssetBinding =
      selectedNode.binding?.kind === "selectAsset"
        ? selectedNode.binding
        : null;

    sections.push(
      section(
        "binding",
        "Binding",
        <div className="grid min-w-0 gap-3">
          <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
            <button
              className={`h-7 rounded-[5px] text-[11px] font-semibold transition ${!isBoundBinding ? "bg-[var(--accent)] text-white" : "text-[var(--fg2)] hover:bg-[var(--hover)]"}`}
              disabled={isLocked}
              type="button"
              onClick={() => commands.setStaticBinding(selectedNode.id)}
            >
              Static
            </button>
            <button
              className={`h-7 rounded-[5px] text-[11px] font-semibold transition ${isBoundBinding ? "bg-[var(--accent)] text-white" : "text-[var(--fg2)] hover:bg-[var(--hover)]"}`}
              disabled={isLocked || compatibleInputs.length === 0}
              type="button"
              onClick={() => {
                if (compatibleInputs[0]) {
                  commands.bindNodeToInput(
                    selectedNode.id,
                    compatibleInputs[0].id,
                  );
                }
              }}
            >
              Bound
            </button>
          </div>

          {!isBoundBinding ? (
            <>
              {isStudioTextNode(selectedNode) ? (
                <StudioTextareaField
                  disabled={isLocked}
                  label="Static text"
                  placeholder="Text shown on the thumbnail"
                  rows={3}
                  value={
                    selectedNode.binding?.kind === "staticText"
                      ? selectedNode.binding.value
                      : ""
                  }
                  onChange={(value) =>
                    commands.setStaticText(selectedNode.id, value)
                  }
                />
              ) : (
                <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                  <span>Static asset</span>
                  <select
                    className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                    disabled={isLocked || assets.length === 0}
                    value={
                      selectedNode.binding?.kind === "staticAsset"
                        ? selectedNode.binding.assetId
                        : ""
                    }
                    onChange={(event) =>
                      commands.setImageAsset(
                        selectedNode.id,
                        event.currentTarget.value || null,
                      )
                    }
                  >
                    <option value="">Select an asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="h-8 rounded-lg border border-dashed border-[var(--field-border)] text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={isLocked}
                type="button"
                onClick={() => onCreateInput(selectedNode.id)}
              >
                Create input from current value
              </button>
            </>
          ) : (
            <>
              <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                <span>Global input source</span>
                <select
                  className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  disabled={isLocked || compatibleInputs.length === 0}
                  value={bindingSourceValue}
                  onChange={(event) =>
                    commands.bindNodeToInput(
                      selectedNode.id,
                      event.currentTarget.value.replace(/^input:/, ""),
                    )
                  }
                >
                  {compatibleInputs.map((input) => (
                    <option key={input.id} value={`input:${input.id}`}>
                      {input.label} · {getStudioInputTypeLabel(input.type)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedBoundInput ? (
                <div className="grid min-w-0 gap-1 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                    Global source
                  </span>
                  <span className="truncate text-xs font-semibold text-[var(--fg)]">
                    {selectedBoundInput.label}
                  </span>
                  <span className="truncate text-[10px] font-medium text-[var(--fg3)]">
                    {getStudioInputTypeLabel(selectedBoundInput.type)} ·{" "}
                    {selectedBoundInput.id}
                  </span>
                  <button
                    className="justify-self-start text-[10px] font-semibold text-[var(--accent)] hover:underline"
                    type="button"
                    onClick={() => onOpenInput(selectedBoundInput.id)}
                  >
                    Open in Inputs
                  </button>
                </div>
              ) : null}
              {selectedNode.binding?.kind === "selectText" ? (
                <StudioSelectField
                  disabled={isLocked}
                  label="Select output"
                  options={[
                    { value: "label", label: "Label" },
                    { value: "value", label: "Value" },
                  ]}
                  value={selectedNode.binding.output}
                  onChange={(value) =>
                    commands.setSelectTextOutput(
                      selectedNode.id,
                      value as "label" | "value",
                    )
                  }
                />
              ) : null}
              {selectedNode.binding?.kind === "selectAsset" &&
              selectedBoundInput?.type === "select" ? (
                <div className="grid min-w-0 gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                    Asset mapping
                  </span>
                  {selectedBoundInput.options.map((option) => (
                    <label
                      className="grid min-w-0 gap-1 text-[10px] font-semibold text-[var(--fg2)]"
                      key={option.value}
                    >
                      <span>{option.label}</span>
                      <select
                        className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                        disabled={isLocked}
                        value={
                          selectedAssetBinding?.assetByOption[option.value] ??
                          ""
                        }
                        onChange={(event) =>
                          commands.setSelectAssetMapping(
                            selectedNode.id,
                            option.value,
                            event.currentTarget.value || null,
                          )
                        }
                      >
                        <option value="">None</option>
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : null}
            </>
          )}

          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--field-border)] pt-2">
            {selectedNode.meta?.bindingFallback ? (
              <button
                className="rounded-md border border-[var(--field-border)] px-2 py-1 text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)] disabled:opacity-40"
                disabled={isLocked}
                type="button"
                onClick={() =>
                  commands.setStaticBinding(selectedNode.id, "restore")
                }
              >
                Restore original
              </button>
            ) : null}
            {isBoundBinding ? (
              <button
                className="rounded-md border border-[var(--field-border)] px-2 py-1 text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)] disabled:opacity-40"
                disabled={isLocked}
                type="button"
                onClick={() => commands.setStaticBinding(selectedNode.id)}
              >
                Use current preview
              </button>
            ) : null}
            <span className="text-[10px] leading-4 text-[var(--fg3)]">
              Static keeps the current or original value; bound uses a global
              input.
            </span>
          </div>
        </div>,
        undefined,
        isLocked ? "Locked" : isBoundBinding ? "Dynamic" : undefined,
      ),
    );
  }

  if (hasStudioNodeInspectorSection(selectedNode.type, "text")) {
    const fontSize = getStudioSharedNumberValue(
      styles.map((style) => style.fontSize),
      16,
    );
    const lineHeight = getStudioSharedNumberValue(
      styles.map((style) => style.lineHeight),
      1.2,
    );
    const letterSpacing = getStudioSharedNumberValue(
      styles.map((style) => style.letterSpacing),
    );
    const fontFamily = getStudioSharedStringValue(
      styles.map((style) => style.fontFamily),
    );
    const fontFamilyOptions = [
      ...(fontFamily.mixed
        ? [{ value: MIXED_FONT_FAMILY_VALUE, label: "Mixed" }]
        : []),
      { value: "", label: "Default (Pretendard)" },
      ...Array.from(
        new Set([
          ...fontFamilies,
          ...styles
            .map((style) => style.fontFamily)
            .filter(
              (value): value is string =>
                typeof value === "string" && Boolean(value.trim()),
            ),
        ]),
      ).map((value) => ({ value, label: value })),
    ];
    const color = getStudioSharedStringValue(
      styles.map((style) => style.color),
      "#111827",
    );
    const primaryStyle = styles[0] ?? {};
    const isSingleTextNode =
      selectedNodes.length === 1 &&
      (selectedNode.type === "text" || selectedNode.type === "flexibleText");
    const resolvedTextAppearance = isSingleTextNode
      ? resolveStudioTextAppearance(selectedNode, primaryStyle)
      : null;
    const legacyTextShadow = isSingleTextNode
      ? parseLegacyStudioTextShadow(primaryStyle)
      : null;
    const inspectorAppearance = isSingleTextNode
      ? (selectedNode.textAppearance ?? {
          fill: {
            type: "solid" as const,
            color: resolvedTextAppearance?.fill.color ?? color.value,
            opacity: resolvedTextAppearance?.fill.opacity ?? 1,
          },
          strokes: resolvedTextAppearance?.strokes ?? [],
          ...(resolvedTextAppearance?.shadow
            ? { shadow: resolvedTextAppearance.shadow }
            : {}),
        })
      : null;
    const inspectorStrokes = inspectorAppearance?.strokes ?? [];
    const inspectorStrokeStack = getStudioTextStrokeStack(inspectorStrokes);
    const inspectorOutermostOutset = inspectorStrokeStack.reduce(
      (maximum, entry) => Math.max(maximum, entry.effectiveOutset),
      0,
    );
    const inspectorShadow =
      inspectorAppearance?.shadow ?? legacyTextShadow ?? undefined;
    const textValue =
      selectedNode.binding?.kind === "staticText"
        ? selectedNode.binding.value
        : "";

    sections.push(
      section(
        "text",
        "Text",
        <div className="grid gap-2">
          <StudioTextareaField
            disabled={isLocked}
            label="Content"
            placeholder="Text shown on the thumbnail"
            rows={3}
            value={textValue}
            onChange={(value) => commands.setStaticText(selectedNode.id, value)}
          />
          <StudioSelectField
            disabled={isLocked}
            label="Font"
            options={fontFamilyOptions}
            value={
              fontFamily.mixed ? MIXED_FONT_FAMILY_VALUE : fontFamily.value
            }
            onChange={(value) => {
              if (value !== MIXED_FONT_FAMILY_VALUE) {
                applyStyleValue("fontFamily", value || undefined);
              }
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <StudioNumberField
              disabled={isLocked}
              label={
                isSingleTextNode && selectedNode.type === "flexibleText"
                  ? "Max size"
                  : "Size"
              }
              mixed={fontSize.mixed}
              value={fontSize.value}
              onChange={(value) => applyStyleValue("fontSize", value)}
            />
            <StudioFontWeightField
              options={getStudioFontWeightOptions(document, fontFamily.value)}
              value={primaryStyle.fontWeight}
              onChange={(value) => applyStyleValue("fontWeight", value)}
            />
            <StudioNumberField
              disabled={isLocked}
              label="Line height"
              mixed={lineHeight.mixed}
              value={lineHeight.value}
              onChange={(value) => applyStyleValue("lineHeight", value)}
            />
            <StudioNumberField
              disabled={isLocked}
              label="Letter spacing"
              mixed={letterSpacing.mixed}
              value={letterSpacing.value}
              onChange={(value) => applyStyleValue("letterSpacing", value)}
            />
          </div>
          <StudioTextAlignmentField
            value={getStudioTextAlignment(primaryStyle) as StudioTextAlignment}
            onChange={(textAlign) =>
              selectedNodes.forEach((node) =>
                commands.setTextAlignment(node.id, textAlign),
              )
            }
          />
          {selectedNode.type === "flexibleText" ? (
            <StudioLineBreakField
              value={getStudioTextWrapMode(primaryStyle)}
              onChange={(mode: StudioTextWrapMode) =>
                applyStyleValue(STUDIO_TEXT_WRAP_MODE_STYLE_KEY, mode)
              }
            />
          ) : null}
          <div className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>{isSingleTextNode ? "Fill" : "Color"}</span>
            <StudioHexColorPicker
              ariaLabel={isSingleTextNode ? "Text fill" : "Text color"}
              disabled={isLocked}
              value={
                isSingleTextNode
                  ? (inspectorAppearance?.fill.color ?? color.value)
                  : color.value
              }
              onChange={(value) =>
                isSingleTextNode
                  ? commands.setTextFill(
                      selectedNode.id,
                      { color: value },
                      { history: false },
                    )
                  : selectedNodes.forEach((node) =>
                      commands.setStyleValue(node.id, "color", value, {
                        history: false,
                      }),
                    )
              }
              onChangeStart={captureHistory}
            />
          </div>
          {isSingleTextNode && inspectorAppearance ? (
            <StudioNumberField
              disabled={isLocked}
              label="Fill opacity %"
              value={inspectorAppearance.fill.opacity * 100}
              onChange={(value) =>
                commands.setTextFill(selectedNode.id, { opacity: value / 100 })
              }
            />
          ) : null}
          {isSingleTextNode && inspectorAppearance ? (
            <div className="grid gap-2 rounded-xl border border-[var(--field-border)] p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--fg2)]">
                  Strokes
                </span>
                <button
                  className="rounded-md border border-[var(--field-border)] px-2 py-1 text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    isLocked ||
                    inspectorStrokes.length >= STUDIO_TEXT_MAX_STROKES ||
                    inspectorOutermostOutset >= STUDIO_TEXT_MAX_OUTSET
                  }
                  type="button"
                  onClick={() => commands.addTextStroke(selectedNode.id)}
                >
                  Add
                </button>
              </div>
              {inspectorStrokes.length === 0 ? (
                <p className="text-[10px] text-[var(--fg3)]">No strokes</p>
              ) : (
                inspectorStrokeStack.map(
                  (
                    { stroke, thickness, effectiveOutset, visibleBand, hidden },
                    index,
                  ) => (
                    <div
                      className="grid gap-2 rounded-lg bg-[var(--field)] p-2"
                      data-thumbnail-text-stroke-id={stroke.id}
                      draggable={!isLocked}
                      key={stroke.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const draggedStrokeId = event.dataTransfer.getData(
                          "text/x-studio-text-stroke",
                        );
                        if (draggedStrokeId) {
                          commands.moveTextStroke(
                            selectedNode.id,
                            draggedStrokeId,
                            index,
                          );
                        }
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "text/x-studio-text-stroke",
                          stroke.id,
                        );
                        event.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          aria-label={`${stroke.label ?? "Stroke"} enabled`}
                          checked={stroke.enabled}
                          disabled={isLocked}
                          type="checkbox"
                          onChange={(event) =>
                            commands.updateTextStroke(
                              selectedNode.id,
                              stroke.id,
                              {
                                enabled: event.currentTarget.checked,
                              },
                            )
                          }
                        />
                        <input
                          aria-label={`${stroke.label ?? "Stroke"} name`}
                          className="h-6 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-[10px] font-semibold text-[var(--fg2)] outline-none focus:border-[var(--accent)]"
                          disabled={isLocked}
                          value={stroke.label ?? `Stroke ${index + 1}`}
                          onChange={(event) =>
                            commands.updateTextStroke(
                              selectedNode.id,
                              stroke.id,
                              {
                                label: event.currentTarget.value,
                              },
                            )
                          }
                        />
                        <button
                          className={ICON_BUTTON_CLASS}
                          disabled={isLocked || index === 0}
                          title="Move stroke back"
                          type="button"
                          onClick={() =>
                            commands.moveTextStroke(
                              selectedNode.id,
                              stroke.id,
                              index - 1,
                            )
                          }
                        >
                          ↑
                        </button>
                        <button
                          className={ICON_BUTTON_CLASS}
                          disabled={
                            isLocked || index === inspectorStrokes.length - 1
                          }
                          title="Move stroke front"
                          type="button"
                          onClick={() =>
                            commands.moveTextStroke(
                              selectedNode.id,
                              stroke.id,
                              index + 1,
                            )
                          }
                        >
                          ↓
                        </button>
                      </div>
                      <StudioHexColorPicker
                        ariaLabel={`${stroke.label ?? "Stroke"} color`}
                        disabled={isLocked}
                        value={stroke.color}
                        onChange={(value) =>
                          commands.updateTextStroke(
                            selectedNode.id,
                            stroke.id,
                            { color: value },
                            { history: false },
                          )
                        }
                        onChangeStart={captureHistory}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <StudioNumberField
                          disabled={isLocked}
                          label={`Thickness (0–${Math.max(
                            0,
                            STUDIO_TEXT_MAX_OUTSET -
                              inspectorStrokeStack.reduce(
                                (total, entry, entryIndex) =>
                                  entryIndex === index
                                    ? total
                                    : total + entry.thickness,
                                0,
                              ),
                          )})`}
                          value={thickness}
                          onChange={(value) =>
                            commands.setTextStrokeThickness(
                              selectedNode.id,
                              stroke.id,
                              value,
                            )
                          }
                        />
                        <StudioNumberField
                          disabled={isLocked}
                          label={`Opacity ${Math.round(stroke.opacity * 100)}%`}
                          value={stroke.opacity * 100}
                          onChange={(value) =>
                            commands.updateTextStroke(
                              selectedNode.id,
                              stroke.id,
                              {
                                opacity: value / 100,
                              },
                            )
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--fg3)]">
                        <span className="grid gap-0.5">
                          <span>Effective outset {effectiveOutset}px</span>
                          <span>
                            {hidden
                              ? "Covered by another stroke"
                              : `Visible band ${Math.max(
                                  0,
                                  visibleBand,
                                ).toFixed(1)}px`}
                          </span>
                        </span>
                        <span className="flex gap-1">
                          <button
                            className="rounded border border-[var(--field-border)] px-1.5 py-0.5 font-semibold hover:border-[var(--accent)] disabled:opacity-40"
                            disabled={
                              isLocked ||
                              inspectorStrokes.length >= STUDIO_TEXT_MAX_STROKES
                            }
                            type="button"
                            onClick={() =>
                              commands.duplicateTextStroke(
                                selectedNode.id,
                                stroke.id,
                              )
                            }
                          >
                            Duplicate
                          </button>
                          <button
                            className="rounded border border-[var(--field-border)] px-1.5 py-0.5 font-semibold hover:border-[var(--accent)] disabled:opacity-40"
                            disabled={isLocked}
                            type="button"
                            onClick={() =>
                              commands.deleteTextStroke(
                                selectedNode.id,
                                stroke.id,
                              )
                            }
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          ) : null}
          {isSingleTextNode && inspectorAppearance ? (
            <div className="grid gap-2 rounded-xl border border-[var(--field-border)] p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--fg2)]">
                  Shadow
                </span>
                {inspectorShadow ? (
                  <button
                    className="rounded-md border border-[var(--field-border)] px-2 py-1 text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)]"
                    disabled={isLocked}
                    type="button"
                    onClick={() => commands.removeTextShadow(selectedNode.id)}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    className="rounded-md border border-[var(--field-border)] px-2 py-1 text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)] disabled:opacity-40"
                    disabled={isLocked}
                    type="button"
                    onClick={() => commands.setTextShadow(selectedNode.id, {})}
                  >
                    Add
                  </button>
                )}
              </div>
              <p className="text-[10px] leading-snug text-[var(--fg3)]">
                Shadow follows the outermost visible stroke.
              </p>
              {inspectorShadow ? (
                <>
                  <label className="flex items-center gap-2 text-[10px] font-semibold text-[var(--fg2)]">
                    <input
                      checked={inspectorShadow.enabled}
                      disabled={isLocked}
                      type="checkbox"
                      onChange={(event) =>
                        commands.setTextShadow(selectedNode.id, {
                          enabled: event.currentTarget.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                  <StudioHexColorPicker
                    ariaLabel="Text shadow color"
                    disabled={isLocked}
                    value={inspectorShadow.color}
                    onChange={(value) =>
                      commands.setTextShadow(
                        selectedNode.id,
                        { color: value },
                        { history: false },
                      )
                    }
                    onChangeStart={captureHistory}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <StudioNumberField
                      disabled={isLocked}
                      label="X"
                      value={inspectorShadow.offsetX}
                      onChange={(value) =>
                        commands.setTextShadow(selectedNode.id, {
                          offsetX: value,
                        })
                      }
                    />
                    <StudioNumberField
                      disabled={isLocked}
                      label="Y"
                      value={inspectorShadow.offsetY}
                      onChange={(value) =>
                        commands.setTextShadow(selectedNode.id, {
                          offsetY: value,
                        })
                      }
                    />
                    <StudioNumberField
                      disabled={isLocked}
                      label="Blur"
                      value={inspectorShadow.blur}
                      onChange={(value) =>
                        commands.setTextShadow(selectedNode.id, { blur: value })
                      }
                    />
                    <StudioNumberField
                      disabled={isLocked}
                      label={`Opacity ${Math.round(inspectorShadow.opacity * 100)}%`}
                      value={inspectorShadow.opacity * 100}
                      onChange={(value) =>
                        commands.setTextShadow(selectedNode.id, {
                          opacity: value / 100,
                        })
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>,
        undefined,
        color.mixed ? "Mixed" : undefined,
      ),
    );
  }

  if (hasStudioNodeInspectorSection(selectedNode.type, "image")) {
    const assetIds = Object.keys(document.assets);
    const currentAssetId =
      selectedNode.binding?.kind === "staticAsset"
        ? selectedNode.binding.assetId
        : "";
    const imageStyle = getNodeStyle(document, selectedNode);
    const imagePosition = getStudioImageObjectPosition(imageStyle);

    sections.push(
      section(
        "image",
        "Image",
        <div className="grid gap-2">
          <StudioSelectField
            disabled={isLocked}
            label="Asset"
            options={[
              { value: "", label: "None" },
              ...assetIds.map((assetId) => ({
                value: assetId,
                label: document.assets[assetId]?.label ?? assetId,
              })),
            ]}
            value={currentAssetId}
            onChange={(assetId) =>
              commands.setImageAsset(selectedNode.id, assetId || null)
            }
          />
          <StudioSelectField
            disabled={isLocked}
            label="Fit"
            options={IMAGE_FIT_OPTIONS}
            value={selectedNode.fit ?? "cover"}
            onChange={(fit) =>
              commands.setImageFit(selectedNode.id, fit as StudioImageFit)
            }
          />
          <button
            className="h-8 rounded-lg border border-dashed border-[var(--field-border)] text-[10px] font-semibold text-[var(--fg2)] hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              isLocked || !currentAssetId || !document.assets[currentAssetId]
            }
            type="button"
            onClick={() => onCropImage(selectedNode.id)}
          >
            Crop image
          </button>
          <div className="grid grid-cols-2 gap-2">
            <StudioNumberField
              disabled={isLocked}
              label="Focus X %"
              value={imagePosition.x}
              onChange={(value) =>
                commands.setStyleValue(
                  selectedNode.id,
                  "objectPosition",
                  `${value}% ${imagePosition.y}%`,
                )
              }
            />
            <StudioNumberField
              disabled={isLocked}
              label="Focus Y %"
              value={imagePosition.y}
              onChange={(value) =>
                commands.setStyleValue(
                  selectedNode.id,
                  "objectPosition",
                  `${imagePosition.x}% ${value}%`,
                )
              }
            />
            <StudioNumberField
              disabled={isLocked}
              label="Border radius"
              value={getStudioImageBorderRadius(imageStyle)}
              onChange={(value) =>
                commands.setStyleValue(
                  selectedNode.id,
                  "borderRadius",
                  Math.max(0, value),
                )
              }
            />
          </div>
          <p className="text-[10px] font-medium leading-4 text-[var(--fg3)]">
            Uploading and cropping arrive with the asset library.
          </p>
        </div>,
      ),
    );
  }

  if (hasStudioNodeInspectorSection(selectedNode.type, "shape")) {
    const fill = getStudioSharedStringValue(
      styles.map((style) => style.backgroundColor),
      "#4f8cff",
    );
    const borderColor = getStudioSharedStringValue(
      styles.map((style) => style.borderColor),
      "#111827",
    );
    const borderWidth = getStudioSharedNumberValue(
      styles.map((style) => style.borderWidth),
    );

    sections.push(
      section(
        "shape",
        "Shape",
        <div className="grid gap-2">
          <div className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>Fill</span>
            <StudioHexColorPicker
              allowTransparent
              ariaLabel="Shape fill"
              value={fill.value}
              onChange={(value) =>
                selectedNodes.forEach((node) =>
                  commands.setStyleValue(node.id, "backgroundColor", value, {
                    history: false,
                  }),
                )
              }
              onChangeStart={captureHistory}
            />
          </div>
          <div className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>Border color</span>
            <StudioHexColorPicker
              allowTransparent
              ariaLabel="Shape border color"
              value={borderColor.value}
              onChange={(value) =>
                selectedNodes.forEach((node) =>
                  commands.setStyleValue(node.id, "borderColor", value, {
                    history: false,
                  }),
                )
              }
              onChangeStart={captureHistory}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StudioNumberField
              disabled={isLocked}
              label="Border width"
              mixed={borderWidth.mixed}
              value={borderWidth.value}
              onChange={(value) => {
                applyStyleValue("borderWidth", value);
                // 두께만 넣으면 CSS가 테두리를 그리지 않는다. 종류를 함께 정한다.
                applyStyleValue("borderStyle", value > 0 ? "solid" : undefined);
              }}
            />
            <StudioNumberField
              disabled={isLocked}
              label="Radius"
              mixed={
                getStudioSharedNumberValue(
                  styles.map((style) => style.borderRadius),
                ).mixed
              }
              value={
                getStudioSharedNumberValue(
                  styles.map((style) => style.borderRadius),
                ).value
              }
              onChange={(value) => applyStyleValue("borderRadius", value)}
            />
          </div>
        </div>,
      ),
    );
  }

  if (hasStudioNodeInspectorSection(selectedNode.type, "group")) {
    const background = getStudioSharedStringValue(
      styles.map((style) => style.backgroundColor),
      "transparent",
    );
    const overflow = getStudioSharedStringValue(
      styles.map((style) => style.overflow),
      "visible",
    );

    sections.push(
      section(
        "group",
        "Group",
        <div className="grid gap-2">
          <div className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>Background</span>
            <StudioHexColorPicker
              allowTransparent
              ariaLabel="Group background"
              value={background.value}
              onChange={(value) =>
                selectedNodes.forEach((node) =>
                  commands.setStyleValue(node.id, "backgroundColor", value, {
                    history: false,
                  }),
                )
              }
              onChangeStart={captureHistory}
            />
          </div>
          <StudioSelectField
            label="Overflow"
            options={OVERFLOW_OPTIONS}
            value={overflow.value}
            onChange={(value) => applyStyleValue("overflow", value)}
          />
        </div>,
      ),
    );
  }

  return sections;
};

const buildCanvasSections = ({
  document,
  section,
  canvasPresets,
  outsideCanvasNodeIds,
  clippedCanvasNodeIds,
  groupOverflowDiagnostics,
  commands,
  captureHistory,
  onFitCanvas,
}: {
  document: StudioTemplateDocument;
  section: (
    id: string,
    title: string,
    content: ReactNode,
    action?: ReactNode,
    badge?: string,
  ) => StudioPropertyItem;
  canvasPresets: ThumbnailCanvasPreset[];
  outsideCanvasNodeIds: string[];
  clippedCanvasNodeIds: string[];
  groupOverflowDiagnostics: StudioGroupOverflowDiagnostic[];
  commands: ThumbnailNodeCommands;
  captureHistory: () => void;
  onFitCanvas: () => void;
}): StudioPropertyItem[] => [
  section(
    "canvas",
    "Canvas",
    <div className="grid gap-2">
      <StudioTextareaField
        label="Name"
        rows={1}
        value={document.metadata.name}
        onChange={commands.setCanvasName}
      />
      <div className="grid grid-cols-2 gap-2">
        <StudioNumberField
          label="Width"
          value={document.canvas.width}
          onChange={(width) =>
            commands.setCanvasSize({ width, height: document.canvas.height })
          }
        />
        <StudioNumberField
          label="Height"
          value={document.canvas.height}
          onChange={(height) =>
            commands.setCanvasSize({ width: document.canvas.width, height })
          }
        />
      </div>
      <div className="grid gap-1">
        {canvasPresets.map((preset) => (
          <button
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            key={preset.id}
            type="button"
            onClick={() =>
              commands.setCanvasSize({
                width: preset.width,
                height: preset.height,
              })
            }
          >
            {preset.label} · {preset.width} × {preset.height}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
        <span>Background</span>
        <StudioHexColorPicker
          allowTransparent
          ariaLabel="Canvas background"
          value={document.canvas.background}
          onChange={(value) =>
            commands.setCanvasBackground(value, { history: false })
          }
          onChangeStart={captureHistory}
        />
      </div>
      <button className={ICON_BUTTON_CLASS} type="button" onClick={onFitCanvas}>
        <span className="text-[10px] font-bold uppercase tracking-[0.05em]">
          Fit canvas to view
        </span>
      </button>
      {outsideCanvasNodeIds.length > 0 ? (
        <p
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[10px] font-semibold leading-4 text-amber-200"
          data-thumbnail-outside-canvas-warning="true"
        >
          {outsideCanvasNodeIds.length} object(s) sit outside the canvas. They
          are kept, not deleted.
        </p>
      ) : null}
      {clippedCanvasNodeIds.length > 0 ? (
        <p
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[10px] font-semibold leading-4 text-amber-200"
          data-thumbnail-canvas-clipping-warning="true"
        >
          {clippedCanvasNodeIds.length} object(s) have visual effects clipped by
          the canvas edge.
        </p>
      ) : null}
      {groupOverflowDiagnostics.length > 0 ? (
        <p
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[10px] font-semibold leading-4 text-amber-200"
          data-thumbnail-group-overflow-warning="true"
        >
          {groupOverflowDiagnostics.reduce(
            (count, diagnostic) => count + diagnostic.childIds.length,
            0,
          )}{" "}
          child visual bounds overflow a hidden or clipped group.
        </p>
      ) : null}
    </div>,
  ),
  {
    kind: "block",
    id: "thumbnail:emptySelection",
    content: (
      <p className="p-4 text-sm font-medium text-[var(--fg2)]">
        Select an object from the canvas or layer tree.
      </p>
    ),
  },
];
