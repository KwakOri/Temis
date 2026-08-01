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
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";
import { isStudioFillParentLayout } from "@/utils/template-studio/object-layout";
import {
  getStudioTextWrapMode,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
  type StudioTextWrapMode,
} from "@/utils/template-studio/text-wrap";
import { getStudioFontWeightOptions } from "@/utils/template-studio/web-fonts";
import type { ThumbnailCanvasPreset } from "@/utils/thumbnail-studio/document-factory";

import type { ThumbnailNodeCommands } from "../_hooks/use-thumbnail-node-commands";

export interface ThumbnailInspectorParams {
  document: StudioTemplateDocument;
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
  commands: ThumbnailNodeCommands;
  /** 연속 조작 한 묶음을 시작한다. 색 고르기가 부른다. */
  captureHistory: () => void;
  onFitCanvas: () => void;
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
];

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
  selectedNodes,
  selectedNode,
  openSections,
  onToggleSection,
  aspectRatioLocked,
  onAspectRatioLockedChange,
  canvasPresets,
  outsideCanvasNodeIds,
  commands,
  captureHistory,
  onFitCanvas,
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
    const color = getStudioSharedStringValue(
      styles.map((style) => style.color),
      "#111827",
    );
    const primaryStyle = styles[0] ?? {};
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
            label="Content"
            placeholder="Text shown on the thumbnail"
            rows={3}
            value={textValue}
            onChange={(value) => commands.setStaticText(selectedNode.id, value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <StudioNumberField
              disabled={isLocked}
              label="Size"
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
            <span>Color</span>
            <StudioHexColorPicker
              ariaLabel="Text color"
              value={color.value}
              onChange={(value) =>
                selectedNodes.forEach((node) =>
                  commands.setStyleValue(node.id, "color", value, {
                    history: false,
                  }),
                )
              }
              onChangeStart={captureHistory}
            />
          </div>
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

    sections.push(
      section(
        "image",
        "Image",
        <div className="grid gap-2">
          <StudioSelectField
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
            label="Fit"
            options={IMAGE_FIT_OPTIONS}
            value={selectedNode.fit ?? "cover"}
            onChange={(fit) =>
              commands.setImageFit(selectedNode.id, fit as StudioImageFit)
            }
          />
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

  if (hasStudioNodeInspectorSection(selectedNode.type, "binding")) {
    sections.push(
      section(
        "binding",
        "Binding",
        <p className="text-[11px] font-medium leading-5 text-[var(--fg3)]">
          User inputs arrive with the thumbnail runtime. Text and images use the
          value stored in this document for now.
        </p>,
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
