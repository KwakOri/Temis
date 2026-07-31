"use client";

import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Lock,
} from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import type { StudioPropertyItem } from "@/components/studio/editor-shell/studio-properties-panel";
import {
  StudioFitParentButton,
  StudioFontWeightField,
  StudioLineBreakField,
  StudioNumberField,
  StudioTextAlignmentField,
} from "@/components/studio/inspector/studio-inspector-fields";
import { cn } from "@/lib/utils";
import type {
  StudioBuiltinFieldId,
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  getStudioBindingInputId,
  isStudioBuiltinFieldCompatibleWithNode,
  isStudioImageNode,
  isStudioInputCompatibleWithNode,
  isStudioTextNode,
} from "@/utils/template-studio/binding-resolver";
import {
  getStudioAvailableBuiltinFields,
  getStudioBuiltinField,
  normalizeStudioDayLabelFormat,
} from "@/utils/template-studio/builtin-fields";
import {
  getStudioInputScopeLabel,
  STUDIO_INPUT_SCOPE_OPTIONS,
} from "@/utils/template-studio/input-scope";
import { getStudioInputTypeLabel } from "@/utils/template-studio/input-commands";
import {
  getStudioOpacityPercent,
  getStudioTextAlignment,
  type StudioTextAlignment,
} from "@/utils/template-studio/node-style-commands";
import {
  isStudioFillParentLayout,
  resolveStudioGraphNodeGeometry,
} from "@/utils/template-studio/object-layout";
import { isStudioStatusCardBackgroundNode } from "@/utils/template-studio/status-card-background";
import {
  getStudioTextWrapMode,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
} from "@/utils/template-studio/text-wrap";
import { getStudioFontWeightOptions } from "@/utils/template-studio/web-fonts";

import { StudioDayLabelFormatField } from "./studio-day-label-format-field";
import { StudioHexColorPicker } from "./studio-hex-color-picker";

/** 카드 노드 인스펙터가 쓰는 섹션 키. */
export type StudioCardNodeInspectorSectionKey =
  | "position"
  | "layout"
  | "appearance"
  | "statusAssets"
  | "binding"
  | "typography";

export interface StudioCardNodeInspectorModel {
  document: StudioTemplateDocument;
  /** 고른 노드. 없으면 안내만 보여준다. */
  selectedNode: StudioGraphNode | null;
  /** 폰트 후보. 문서의 웹 폰트와 기본 폰트를 합친 목록이다. */
  fontFamilies: string[];
  isSectionOpen: (sectionKey: StudioCardNodeInspectorSectionKey) => boolean;
  onToggleSection: (sectionKey: StudioCardNodeInspectorSectionKey) => void;
  /**
   * 상태 카드 배경 노드의 에셋 자리.
   *
   * 시간표 도메인이 소유하는 UI라 여기서 만들지 않고 받아서 놓는다.
   */
  renderStatusBackgroundAssetSlot: (node: StudioGraphNode) => React.ReactNode;
  updateNode: (
    nodeId: string,
    updater: (
      node: StudioGraphNode,
      nextDocument: StudioTemplateDocument,
    ) => void,
  ) => void;
  updateStyle: (key: string, value: string | number | undefined) => void;
  updateTextAlignment: (textAlign: StudioTextAlignment) => void;
  toggleFitParent: () => void;
  setStaticBinding: () => void;
  bindToInput: (inputId: string) => void;
  bindToBuiltinField: (fieldId: StudioBuiltinFieldId) => void;
}

/** 아직 동작을 붙이지 않은 정렬 버튼들. 자리와 순서만 유지한다. */
const STUDIO_CARD_ALIGN_ACTIONS = [
  { title: "Align left", Icon: AlignHorizontalJustifyStart },
  { title: "Align center", Icon: AlignHorizontalJustifyCenter },
  { title: "Align right", Icon: AlignHorizontalJustifyEnd },
  { title: "Align top", Icon: AlignVerticalJustifyStart },
  { title: "Align middle", Icon: AlignVerticalJustifyCenter },
  { title: "Align bottom", Icon: AlignVerticalJustifyEnd },
];

/**
 * 카드 그래프 노드의 우측 속성 섹션을 만든다.
 *
 * 공통 속성 패널은 받은 순서대로 렌더만 하므로 표시 조건과 순서를 여기서 정한다.
 * 바인딩 후보 같은 파생 값은 문서와 고른 노드에서 직접 계산하므로 호출한 쪽이
 * 미리 만들어 넘기지 않는다.
 */
export const buildStudioCardNodeInspectorSections = ({
  document,
  selectedNode,
  fontFamilies,
  isSectionOpen,
  onToggleSection,
  renderStatusBackgroundAssetSlot,
  updateNode,
  updateStyle,
  updateTextAlignment,
  toggleFitParent,
  setStaticBinding,
  bindToInput,
  bindToBuiltinField,
}: StudioCardNodeInspectorModel): StudioPropertyItem[] => {
  const buildSection = (
    sectionKey: StudioCardNodeInspectorSectionKey,
    title: string,
    content: React.ReactNode,
    badge?: string,
    action?: React.ReactNode,
  ): StudioPropertyItem => ({
    id: `${sectionKey}:${title}`,
    title,
    badge,
    action,
    content,
    open: isSectionOpen(sectionKey),
    onToggle: () => onToggleSection(sectionKey),
  });

  const styleRecord = selectedNode?.styleId
    ? (document.styles[selectedNode.styleId] ?? {})
    : {};

  if (!selectedNode) {
    return [
      {
        kind: "block",
        id: "cards:emptySelection",
        content: (
          <p className="p-4 text-sm font-medium text-[var(--fg2)]">
            Select an object from the canvas or layer tree.
          </p>
        ),
      },
    ];
  }

  const assets = Object.values(document.assets);
  const compatibleInputs = Object.values(document.inputs).filter((input) =>
    isStudioInputCompatibleWithNode(input, selectedNode),
  );
  const compatibleBuiltinFields = getStudioAvailableBuiltinFields(
    document,
  ).filter((field) =>
    isStudioBuiltinFieldCompatibleWithNode(field, selectedNode),
  );
  const compatibleInputGroups = STUDIO_INPUT_SCOPE_OPTIONS.map((scope) => ({
    scope,
    inputs: compatibleInputs.filter((input) => input.scope === scope),
  })).filter((group) => group.inputs.length > 0);
  const compatibleBuiltinFieldGroups = STUDIO_INPUT_SCOPE_OPTIONS.map(
    (scope) => ({
      scope,
      fields: compatibleBuiltinFields.filter((field) => field.scope === scope),
    }),
  ).filter((group) => group.fields.length > 0);

  const bindingInputId = getStudioBindingInputId(selectedNode.binding);
  const selectedNodeBoundInput = bindingInputId
    ? (document.inputs[bindingInputId] ?? null)
    : null;
  const selectedNodeBuiltinField =
    selectedNode.binding?.kind === "builtinField"
      ? getStudioBuiltinField(selectedNode.binding.fieldId)
      : null;

  const selectedFontFamily = String(styleRecord.fontFamily ?? "Inter");
  const selectedStatusBackground =
    isStudioStatusCardBackgroundNode(selectedNode);
  const selectedStatusBackgroundColor = String(
    styleRecord.backgroundColor ?? "transparent",
  );
  const isSelectedNodeFitParent = isStudioFillParentLayout(
    selectedNode.layoutMode,
  );
  const selectedNodeGeometry = resolveStudioGraphNodeGeometry(
    document,
    selectedNode.id,
  );
  const selectedFontWeightOptions = getStudioFontWeightOptions(
    document,
    selectedFontFamily,
  );
  const selectedTextWrapMode = getStudioTextWrapMode(styleRecord);

  const bindingBuiltinFieldId =
    selectedNode.binding?.kind === "builtinField"
      ? selectedNode.binding.fieldId
      : null;
  const isBoundBinding = Boolean(bindingInputId || bindingBuiltinFieldId);
  const compatibleBindingCount =
    compatibleBuiltinFields.length + compatibleInputs.length;
  const bindingSourceValue = bindingBuiltinFieldId
    ? `builtin:${bindingBuiltinFieldId}`
    : bindingInputId
      ? `input:${bindingInputId}`
      : "";
  const opacityPercent = getStudioOpacityPercent(styleRecord.opacity);

  const sections: (StudioPropertyItem | null)[] = [
    buildSection(
      "position",
      "Position",
      <div className="grid gap-2">
        <div className="mb-1 grid grid-cols-6 gap-0.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
          {STUDIO_CARD_ALIGN_ACTIONS.map(({ title, Icon }) => (
            <button
              className="flex h-6 items-center justify-center rounded text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              key={title}
              title={title}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StudioNumberField
            disabled={isSelectedNodeFitParent}
            label="X"
            value={selectedNodeGeometry.left}
            onChange={(value) => updateStyle("left", value)}
          />
          <StudioNumberField
            disabled={isSelectedNodeFitParent}
            label="Y"
            value={selectedNodeGeometry.top}
            onChange={(value) => updateStyle("top", value)}
          />
          <StudioNumberField
            label="Rotate"
            value={Number(styleRecord.rotateDeg ?? 0)}
            onChange={(value) => updateStyle("rotateDeg", value)}
          />
        </div>
      </div>,
      undefined,
      <StudioFitParentButton
        active={isSelectedNodeFitParent}
        onClick={toggleFitParent}
      />,
    ),

    buildSection(
      "layout",
      "Layout",
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <StudioNumberField
          disabled={isSelectedNodeFitParent}
          label="W"
          value={selectedNodeGeometry.width}
          onChange={(value) => updateStyle("width", value)}
        />
        <StudioNumberField
          disabled={isSelectedNodeFitParent}
          label="H"
          value={selectedNodeGeometry.height}
          onChange={(value) => updateStyle("height", value)}
        />
        <button
          className="mt-[21px] flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:text-[var(--fg)]"
          title="Lock aspect ratio"
          type="button"
        >
          <Lock className="h-3.5 w-3.5" />
        </button>
      </div>,
    ),

    buildSection(
      "appearance",
      "Appearance",
      <div className="grid grid-cols-2 gap-2">
        <StudioNumberField
          label="Opacity"
          value={opacityPercent}
          onChange={(value) =>
            updateStyle("opacity", Math.min(Math.max(value, 0), 100) / 100)
          }
        />
        <StudioNumberField
          label="Radius"
          value={Number(styleRecord.borderRadius ?? 0)}
          onChange={(value) => updateStyle("borderRadius", value)}
        />
        {selectedStatusBackground ? (
          <div className="col-span-2 grid gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--fg2)]">
              Base Color
            </span>
            <StudioHexColorPicker
              allowTransparent
              ariaLabel="Background base color"
              fallbackColor="#FFFFFF"
              value={selectedStatusBackgroundColor}
              onChange={(backgroundColor) =>
                updateStyle("backgroundColor", backgroundColor)
              }
            />
            <span className="text-[9px] font-semibold leading-relaxed text-[var(--fg3)]">
              Drawn behind the selected background asset.
            </span>
          </div>
        ) : null}
      </div>,
    ),

    selectedStatusBackground
      ? buildSection(
          "statusAssets",
          "Background Asset",
          renderStatusBackgroundAssetSlot(selectedNode),
        )
      : null,

    isStudioTextNode(selectedNode) || isStudioImageNode(selectedNode)
      ? buildSection(
          "binding",
          "Binding",
          <div className="grid min-w-0 gap-3">
            <div className="grid w-full min-w-0 grid-cols-2 gap-0.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
              <button
                className={cn(
                  "h-7 rounded-[5px] text-[11.5px] font-semibold transition",
                  !isBoundBinding
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                )}
                type="button"
                onClick={setStaticBinding}
              >
                Static
              </button>
              <button
                className={cn(
                  "h-7 rounded-[5px] text-[11.5px] font-semibold transition",
                  isBoundBinding
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                  compatibleBindingCount === 0 &&
                    "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-[var(--fg2)]",
                )}
                disabled={compatibleBindingCount === 0}
                type="button"
                onClick={() => {
                  if (compatibleBuiltinFields[0]) {
                    bindToBuiltinField(compatibleBuiltinFields[0].id);
                  } else if (compatibleInputs[0]) {
                    bindToInput(compatibleInputs[0].id);
                  }
                }}
              >
                Bound
              </button>
            </div>

            {!isBoundBinding ? (
              <>
                {isStudioTextNode(selectedNode) && (
                  <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                    <span>Static text</span>
                    <textarea
                      className="min-h-20 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                      value={
                        selectedNode.binding?.kind === "staticText"
                          ? selectedNode.binding.value
                          : ""
                      }
                      onChange={(event) =>
                        updateNode(selectedNode.id, (node) => {
                          node.binding = {
                            kind: "staticText",
                            value: event.currentTarget.value,
                          };
                        })
                      }
                    />
                  </label>
                )}

                {isStudioImageNode(selectedNode) && (
                  <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                    <span>Static asset</span>
                    <select
                      className="h-8 w-full min-w-0 max-w-full rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
                      disabled={assets.length === 0}
                      value={
                        selectedNode.binding?.kind === "staticAsset"
                          ? selectedNode.binding.assetId
                          : (assets[0]?.id ?? "")
                      }
                      onChange={(event) =>
                        updateNode(selectedNode.id, (node) => {
                          node.binding = {
                            kind: "staticAsset",
                            assetId: event.currentTarget.value,
                          };
                        })
                      }
                    >
                      {assets.length === 0 ? (
                        <option value="">No asset</option>
                      ) : null}
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <>
                <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                  <span>Binding Source</span>
                  <select
                    className="h-8 w-full min-w-0 max-w-full rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
                    disabled={compatibleBindingCount === 0}
                    value={bindingSourceValue}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      if (value.startsWith("builtin:")) {
                        bindToBuiltinField(
                          value.replace(
                            /^builtin:/,
                            "",
                          ) as StudioBuiltinFieldId,
                        );
                        return;
                      }

                      if (value.startsWith("input:")) {
                        bindToInput(value.replace(/^input:/, ""));
                      }
                    }}
                  >
                    {compatibleBindingCount === 0 ? (
                      <option value="">No compatible binding</option>
                    ) : null}
                    {compatibleBuiltinFieldGroups.map((group) => (
                      <optgroup
                        key={`builtin:${group.scope}`}
                        label={`Built-in · ${getStudioInputScopeLabel(group.scope)}`}
                      >
                        {group.fields.map((field) => (
                          <option key={field.id} value={`builtin:${field.id}`}>
                            {field.label} · Built-in ·{" "}
                            {getStudioInputScopeLabel(field.scope)} ·{" "}
                            {field.type}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {compatibleInputGroups.map((group) => (
                      <optgroup
                        key={`input:${group.scope}`}
                        label={`Custom · ${getStudioInputScopeLabel(group.scope)}`}
                      >
                        {group.inputs.map((input) => (
                          <option key={input.id} value={`input:${input.id}`}>
                            {input.label} · Custom ·{" "}
                            {getStudioInputScopeLabel(input.scope)} ·{" "}
                            {getStudioInputTypeLabel(input.type)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                {selectedNodeBuiltinField ? (
                  <>
                    <div className="grid min-w-0 gap-1.5 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                        Built-in Source
                      </span>
                      <span className="truncate text-xs font-semibold text-[var(--fg)]">
                        {selectedNodeBuiltinField.label}
                      </span>
                      <span className="truncate text-[11px] font-medium text-[var(--fg3)]">
                        {getStudioInputScopeLabel(
                          selectedNodeBuiltinField.scope,
                        )}{" "}
                        · {selectedNodeBuiltinField.type} ·{" "}
                        {selectedNodeBuiltinField.id}
                      </span>
                    </div>
                    {selectedNode.binding?.kind === "builtinField" ? (
                      <StudioDayLabelFormatField
                        fieldId={selectedNode.binding.fieldId}
                        value={selectedNode.binding.dayLabelFormat}
                        onChange={(dayLabelFormat) =>
                          updateNode(selectedNode.id, (node) => {
                            if (node.binding?.kind !== "builtinField") return;

                            const normalizedFormat =
                              normalizeStudioDayLabelFormat(dayLabelFormat);
                            node.binding =
                              normalizedFormat === "default"
                                ? {
                                    kind: "builtinField",
                                    fieldId: node.binding.fieldId,
                                  }
                                : {
                                    ...node.binding,
                                    dayLabelFormat: normalizedFormat,
                                  };
                          })
                        }
                      />
                    ) : null}
                  </>
                ) : selectedNodeBoundInput ? (
                  <div className="grid min-w-0 gap-1.5 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                      Custom Input Source
                    </span>
                    <span className="truncate text-xs font-semibold text-[var(--fg)]">
                      {selectedNodeBoundInput.label}
                    </span>
                    <span className="truncate text-[11px] font-medium text-[var(--fg3)]">
                      {getStudioInputScopeLabel(selectedNodeBoundInput.scope)} ·{" "}
                      {getStudioInputTypeLabel(selectedNodeBoundInput.type)} ·{" "}
                      {selectedNodeBoundInput.id}
                    </span>
                  </div>
                ) : null}

                {selectedNode.binding?.kind === "selectText" && (
                  <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                    <span>Select Output</span>
                    <select
                      className="h-8 w-full min-w-0 max-w-full rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                      value={selectedNode.binding.output}
                      onChange={(event) =>
                        updateNode(selectedNode.id, (node) => {
                          if (node.binding?.kind !== "selectText") return;
                          node.binding.output = event.currentTarget.value as
                            "label" | "value";
                        })
                      }
                    >
                      <option value="label">Label</option>
                      <option value="value">Value</option>
                    </select>
                  </label>
                )}

                {selectedNode.binding?.kind === "selectAsset" &&
                  (() => {
                    const input = document.inputs[selectedNode.binding.inputId];
                    if (!input || input.type !== "select") return null;

                    return (
                      <div className="grid min-w-0 gap-2">
                        {input.options.map((option) => (
                          <label
                            className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]"
                            key={option.value}
                          >
                            <span>{option.label}</span>
                            <select
                              className="h-8 w-full min-w-0 max-w-full rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                              value={
                                selectedNode.binding?.kind === "selectAsset"
                                  ? (selectedNode.binding.assetByOption[
                                      option.value
                                    ] ?? "")
                                  : ""
                              }
                              onChange={(event) =>
                                updateNode(selectedNode.id, (node) => {
                                  if (node.binding?.kind !== "selectAsset")
                                    return;
                                  node.binding.assetByOption[option.value] =
                                    event.currentTarget.value || null;
                                })
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
                    );
                  })()}
              </>
            )}
          </div>,
          "Dynamic",
        )
      : null,

    isStudioTextNode(selectedNode)
      ? buildSection(
          "typography",
          "Typography",
          <div className="grid gap-2">
            <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Font</span>
              <select
                className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                value={selectedFontFamily}
                onChange={(event) =>
                  updateStyle("fontFamily", event.currentTarget.value)
                }
              >
                {fontFamilies.map((fontFamily) => (
                  <option key={fontFamily} value={fontFamily}>
                    {fontFamily}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-[1.3fr_1fr] gap-2">
              <StudioNumberField
                label="Size"
                value={Number(styleRecord.fontSize ?? 16)}
                onChange={(value) => updateStyle("fontSize", value)}
              />
              <StudioFontWeightField
                options={selectedFontWeightOptions}
                value={styleRecord.fontWeight ?? 700}
                onChange={(value) => updateStyle("fontWeight", value)}
              />
            </div>
            <StudioTextAlignmentField
              value={getStudioTextAlignment(styleRecord)}
              onChange={updateTextAlignment}
            />
            {selectedNode.type === "flexibleText" ? (
              <StudioLineBreakField
                value={selectedTextWrapMode}
                onChange={(mode) =>
                  updateStyle(STUDIO_TEXT_WRAP_MODE_STYLE_KEY, mode)
                }
              />
            ) : null}
            <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Color</span>
              <StudioHexColorPicker
                ariaLabel="Card text color"
                value={String(styleRecord.color ?? "#111827")}
                onChange={(color) => updateStyle("color", color)}
              />
            </label>
          </div>,
        )
      : null,

    isStudioImageNode(selectedNode)
      ? {
          kind: "block",
          id: "cards:imageFit",
          content: (
            <div className="px-4 pb-4">
              <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                <span>Fit</span>
                <select
                  className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  value={selectedNode.fit ?? "cover"}
                  onChange={(event) =>
                    updateNode(selectedNode.id, (node) => {
                      node.fit = event.currentTarget.value as
                        "cover" | "contain" | "fill";
                    })
                  }
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                </select>
              </label>
            </div>
          ),
        }
      : null,
  ];

  return sections.filter(
    (section): section is StudioPropertyItem => section !== null,
  );
};
