"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import type { StudioPropertyItem } from "@/components/studio/editor-shell/studio-properties-panel";
import {
  StudioFitParentButton,
  StudioNumberField,
  StudioTextField,
} from "@/components/studio/inspector/studio-inspector-fields";
import type {
  StudioInputDefinition,
  StudioTemplateDocument,
  StudioTimetableComponentDefinition,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
  StudioTimetableRuntimeEntry,
} from "@/types/template-studio";
import { getStudioInputScopeLabel } from "@/utils/template-studio/input-scope";
import { applyStudioObjectHidden } from "@/utils/template-studio/object-style";
import type { StudioTimetableGraphRecipe } from "@/utils/template-studio/timetable-graph-commands";
import type { StudioAssetSlotKind } from "@/utils/template-studio/timetable-asset-slot-specs";
import type { StudioTimetableGraphSelection as StudioTimetableSelection } from "@/utils/template-studio/timetable-graph-selection";
import type { StudioTimetableGraphNode } from "@/types/studio-timetable-graph";

import { StudioDayLabelFormatField } from "./studio-day-label-format-field";
import {
  StudioTimetableOpacityField,
  StudioTimetableVisibilityField,
} from "./studio-timetable-object-controls";
import {
  StudioTimetableArtistProfileTextAssetLayoutControls,
  StudioTimetableObjectVariantControls,
  StudioTimetableProfileMaskControls,
  StudioTimetableTextTypographyControls,
} from "./studio-timetable-object-inspector-controls";
import {
  StudioDayCardsLayoutDay,
  StudioTimetableDayCardsLayoutControls,
} from "./studio-timetable-day-cards-layout-controls";

/** 시간표 인스펙터가 쓰는 섹션 키. */
export type StudioTimetableInspectorSectionKey =
  | "componentSet"
  | "settings"
  | "input"
  | "runtime"
  | "layout"
  | "appearance"
  | "position"
  | "typography";

/** 화면에 보여줄 레이어의 자리와 크기. */
export interface StudioTimetableLayerGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StudioTimetableInspectorModel {
  /** 고른 레이어에서 계산한 값 묶음. */
  selection: StudioTimetableSelection;
  selectedLayerId: string | null;
  /** 지금 무엇을 편집하는지 알려줄 이름. */
  selectedLayerLabel: string;
  layerGeometry: StudioTimetableLayerGeometry | null;
  selectedLayerRotation: number;
  /** 폰트 굵기 후보를 찾는 데 쓴다. */
  document: StudioTemplateDocument;
  fontFamilies: string[];
  /** 요일에 붙일 수 있는 Component Set 목록. */
  componentOptions: StudioTimetableComponentDefinition[];
  /** 요일별 일정 카드 크기. Component Set에 따라 달라진다. */
  getEntryCardSize: (dayId: StudioTimetableDayId) => {
    width: number;
    height: number;
  };
  /** 요일 카드 배치. 요일 카드 묶음을 골랐을 때만 쓴다. */
  dayCardsLayout: StudioTimetableDayCardsLayout | null;
  days: StudioDayCardsLayoutDay[];
  /** 미리보기가 지금 보여주는 요일과 일정. */
  activeRuntimeDayLabel: string | null;
  activeRuntimeEntry: StudioTimetableRuntimeEntry | null;
  activeRuntimeEntryIndex: number;

  isSectionOpen: (sectionKey: StudioTimetableInspectorSectionKey) => boolean;
  onToggleSection: (sectionKey: StudioTimetableInspectorSectionKey) => void;

  onAssignComponentSet: (componentId: string) => void;
  onEditDayCard: (dayId: StudioTimetableDayId) => void;
  onSelectLayer: (layerId: string) => void;
  onSelectEditingVariant: (objectId: string, value: string) => void;
  onUpdateLayerPosition: (
    layerId: string,
    patch: Partial<StudioTimetableLayerGeometry & { rotateDeg: number }>,
  ) => void;
  onToggleFitParent: (objectId: string) => void;
  onUpdateObject: (
    objectId: string,
    recipe: StudioTimetableGraphRecipe,
  ) => void;
  onUpdateDayCardsLayout: (
    recipe: (layout: StudioTimetableDayCardsLayout) => void,
  ) => void;

  /** 이미지 자리 편집. 파일 올리기와 잘라내기 배선이 필요해 받아서 놓는다. */
  renderAssetSlot: (
    object: StudioTimetableGraphNode,
    kind: StudioAssetSlotKind,
  ) => React.ReactNode;
  /** 묶인 입력 편집. 입력 패널과 같은 UI를 쓴다. */
  renderInputSourceSlot: (input: StudioInputDefinition) => React.ReactNode;
  /** 미리보기 입력 값 편집. */
  renderPreviewInputs: () => React.ReactNode;
}

import { StudioBuiltinFieldFormatControls } from "@/components/studio/inspector/studio-binding-format-controls";
import { applyStudioBindingFormatPatch } from "@/utils/template-studio/binding-format";

const READ_ONLY_FIELD_CLASS =
  "flex h-8 w-full min-w-0 items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg3)]";

const CONTEXT_ROW_CLASS =
  "rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2";

/** 크기를 직접 못 바꾸는 레이어는 계산된 값만 보여준다. */
function StudioTimetableReadOnlySize({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span>{label}</span>
      <div className={READ_ONLY_FIELD_CLASS}>
        <span className="min-w-0 truncate">{Math.round(value)}</span>
      </div>
    </div>
  );
}

/**
 * 시간표 작업 공간의 우측 속성 섹션을 만든다.
 *
 * 공통 속성 패널은 받은 순서대로 렌더만 하므로 표시 조건과 순서를 여기서 정한다.
 * 무엇을 골랐는지는 순수 함수가 판단한 결과를 받는다.
 */
export const buildStudioTimetableInspectorSections = ({
  selection,
  selectedLayerId,
  selectedLayerLabel,
  layerGeometry,
  selectedLayerRotation,
  document,
  fontFamilies,
  componentOptions,
  getEntryCardSize,
  dayCardsLayout,
  days,
  activeRuntimeDayLabel,
  activeRuntimeEntry,
  activeRuntimeEntryIndex,
  isSectionOpen,
  onToggleSection,
  onAssignComponentSet,
  onEditDayCard,
  onSelectLayer,
  onSelectEditingVariant,
  onUpdateLayerPosition,
  onToggleFitParent,
  onUpdateObject,
  onUpdateDayCardsLayout,
  renderAssetSlot,
  renderInputSourceSlot,
  renderPreviewInputs,
}: StudioTimetableInspectorModel): StudioPropertyItem[] => {
  const buildSection = (
    sectionKey: StudioTimetableInspectorSectionKey,
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

  const {
    object,
    style,
    extension,
    day,
    dayComponentResolution,
    textObject,
    boundInput,
    builtinField,
    textValue,
    features,
    editingState,
    isFitParent,
    isDayCards,
  } = selection;

  const updateSelectedObject = (recipe: StudioTimetableGraphRecipe) => {
    if (!object) return;
    onUpdateObject(object.id, recipe);
  };

  const isPlacedObject = features.resizable;
  const formatBinding = textObject ? textObject.binding : undefined;

  const sections: (StudioPropertyItem | null)[] = [
    layerGeometry && selectedLayerId
      ? buildSection(
          "position",
          "Position",
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <StudioNumberField
                disabled={isFitParent}
                label="X"
                value={layerGeometry.left}
                onChange={(value) =>
                  onUpdateLayerPosition(selectedLayerId, { left: value })
                }
              />
              <StudioNumberField
                disabled={isFitParent}
                label="Y"
                value={layerGeometry.top}
                onChange={(value) =>
                  onUpdateLayerPosition(selectedLayerId, { top: value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[var(--fg2)]">
              {isPlacedObject ? (
                <>
                  <StudioNumberField
                    disabled={isFitParent}
                    label="W"
                    value={layerGeometry.width}
                    onChange={(value) =>
                      onUpdateLayerPosition(selectedLayerId, { width: value })
                    }
                  />
                  <StudioNumberField
                    disabled={isFitParent}
                    label="H"
                    value={layerGeometry.height}
                    onChange={(value) =>
                      onUpdateLayerPosition(selectedLayerId, { height: value })
                    }
                  />
                </>
              ) : (
                <>
                  <StudioTimetableReadOnlySize
                    label="W"
                    value={layerGeometry.width}
                  />
                  <StudioTimetableReadOnlySize
                    label="H"
                    value={layerGeometry.height}
                  />
                </>
              )}
            </div>
            {isPlacedObject || isDayCards || Boolean(day) ? (
              <StudioNumberField
                label={
                  day ? "Card Rotate" : isDayCards ? "Group Rotate" : "Rotate"
                }
                value={selectedLayerRotation}
                onChange={(value) =>
                  onUpdateLayerPosition(selectedLayerId, { rotateDeg: value })
                }
              />
            ) : null}
          </div>,
          undefined,
          object && isPlacedObject ? (
            <StudioFitParentButton
              active={isFitParent}
              onClick={() => onToggleFitParent(object.id)}
            />
          ) : undefined,
        )
      : null,

    isDayCards && dayCardsLayout
      ? buildSection(
          "layout",
          "Layout",
          <StudioTimetableDayCardsLayoutControls
            days={days}
            getEntryCardSize={getEntryCardSize}
            layout={dayCardsLayout}
            onUpdateLayout={onUpdateDayCardsLayout}
          />,
        )
      : null,

    day && dayComponentResolution
      ? buildSection(
          "componentSet",
          "Component Set",
          <div className="grid gap-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-bold text-[var(--fg2)]">
                {day.label} layout
              </span>
              <select
                className="h-9 w-full rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                value={dayComponentResolution.componentId}
                onChange={(event) =>
                  onAssignComponentSet(event.currentTarget.value)
                }
              >
                {componentOptions.map((component) => (
                  <option key={component.id} value={component.id}>
                    {component.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2.5 py-2 text-[10px] font-semibold text-[var(--fg3)]">
              <span>
                {dayComponentResolution.source === "default"
                  ? "Default set"
                  : "Day override"}
              </span>
              <span>
                {getEntryCardSize(day.id).width} ×{" "}
                {getEntryCardSize(day.id).height}
              </span>
            </div>
            <p className="text-[10px] font-medium leading-relaxed text-[var(--fg3)]">
              Generated day instance. This set controls all status designs for
              the selected day.
            </p>
            <button
              type="button"
              className="h-8 rounded-md bg-[var(--accent)] px-3 text-xs font-semibold text-white"
              onClick={() => onEditDayCard(day.id)}
            >
              Edit card design
            </button>
          </div>,
          "Instance",
        )
      : null,

    textObject
      ? buildSection(
          "input",
          "Data & Format",
          <div className="grid gap-2">
            {builtinField ? (
              <>
                <div className="grid gap-1.5 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                    Built-in Source
                  </span>
                  <span className="truncate text-xs font-semibold text-[var(--fg)]">
                    {builtinField.label}
                  </span>
                  <span className="truncate text-[11px] font-medium text-[var(--fg3)]">
                    {getStudioInputScopeLabel(builtinField.scope)} ·{" "}
                    {builtinField.type} · {builtinField.id}
                  </span>
                </div>
                {features.dayLabelFormat &&
                textObject.binding?.kind === "builtinField" ? (
                  <StudioDayLabelFormatField
                    fieldId={textObject.binding.fieldId}
                    value={textObject.binding.dayLabelFormat}
                    onChange={(dayLabelFormat) =>
                      onUpdateObject(textObject.id, ({ node: target }) => {
                        if (target.binding?.kind !== "builtinField") return;

                        applyStudioBindingFormatPatch(target, {
                          dayLabelFormat,
                        });
                      })
                    }
                  />
                ) : null}
                {formatBinding?.kind === "builtinField" && textObject ? (
                  <StudioBuiltinFieldFormatControls
                    binding={formatBinding}
                    onChange={(patch) =>
                      onUpdateObject(textObject.id, ({ node: target }) => {
                        applyStudioBindingFormatPatch(target, patch);
                      })
                    }
                  />
                ) : null}
              </>
            ) : boundInput ? (
              renderInputSourceSlot(boundInput)
            ) : (
              <StudioTextField
                label="Content"
                value={textValue}
                onChange={(value) =>
                  onUpdateObject(textObject.id, ({ node: target }) => {
                    target.binding = { kind: "staticText", value };
                  })
                }
              />
            )}
          </div>,
        )
      : null,

    textObject
      ? buildSection(
          "typography",
          "Typography",
          <StudioTimetableTextTypographyControls
            document={document}
            fontFamilies={fontFamilies}
            object={textObject}
            style={style}
            extension={extension}
            onUpdateObject={(recipe) => onUpdateObject(textObject.id, recipe)}
          />,
        )
      : null,

    object
      ? buildSection(
          "appearance",
          "Style",
          <div className="grid gap-2">
            <StudioTimetableOpacityField
              opacity={style.opacity}
              onChange={(opacity) =>
                updateSelectedObject(({ style }) => {
                  style.opacity = opacity;
                })
              }
            />
            {features.assetSlots.map((kind) => (
              <React.Fragment key={kind}>
                {renderAssetSlot(object, kind)}
              </React.Fragment>
            ))}
            {features.mask ? (
              <StudioTimetableProfileMaskControls
                object={object}
                style={style}
                extension={extension}
                onUpdateObject={updateSelectedObject}
              />
            ) : null}
            {features.assetLayout ? (
              <StudioTimetableArtistProfileTextAssetLayoutControls
                object={object}
                style={style}
                extension={extension}
                onUpdateObject={updateSelectedObject}
              />
            ) : null}
          </div>,
        )
      : null,

    object || editingState
      ? buildSection(
          "settings",
          "Visibility & State",
          <div className="grid gap-3">
            {object ? (
              <StudioTimetableVisibilityField
                hidden={object.hidden}
                onChange={(visible) =>
                  updateSelectedObject(({ node }) => {
                    applyStudioObjectHidden(node, !visible);
                  })
                }
              />
            ) : null}
            {editingState ? (
              <>
                <p className="text-[10px] font-medium text-[var(--fg3)]">
                  Editing {editingState.owner.label} design. User preview values
                  are separate.
                </p>
                <StudioTimetableObjectVariantControls
                  object={editingState.owner}
                  style={
                    document.styles[editingState.owner.styleId ?? ""] ?? {}
                  }
                  extension={editingState.extension}
                  editingValue={editingState.value}
                  onSelectEditingValue={(value) => {
                    onSelectEditingVariant(editingState.owner.id, value);
                    onSelectLayer(editingState.owner.id);
                  }}
                  onUpdateObject={(recipe) => {
                    onUpdateObject(editingState.owner.id, recipe);
                    onSelectLayer(editingState.owner.id);
                  }}
                />
              </>
            ) : null}
          </div>,
        )
      : null,

    boundInput
      ? buildSection("runtime", "User Preview Values", renderPreviewInputs())
      : null,

    buildSection(
      "runtime",
      "Timetable Context",
      <div className="grid gap-2 text-xs font-semibold text-[var(--fg2)]">
        <div className={CONTEXT_ROW_CLASS}>
          Layer: <span className="text-[var(--fg)]">{selectedLayerLabel}</span>
        </div>
        <div className={CONTEXT_ROW_CLASS}>
          Day:{" "}
          <span className="text-[var(--fg)]">
            {activeRuntimeDayLabel ?? "None"}
          </span>
        </div>
        <div className={CONTEXT_ROW_CLASS}>
          Entry:{" "}
          <span className="text-[var(--fg)]">
            {activeRuntimeEntry
              ? `${activeRuntimeEntryIndex + 1} · ${activeRuntimeEntry.statusId}`
              : "None"}
          </span>
        </div>
      </div>,
    ),
  ];

  if (editingState) {
    sections.unshift({
      kind: "block",
      id: "editingState:context",
      content: (
        <div className="border-b border-[var(--border)] px-4 py-2 text-[11px] text-[var(--fg2)]">
          {editingState.owner.label} · Editing design:{" "}
          <strong>{editingState.label}</strong>
        </div>
      ),
    });
  }

  return sections.filter(
    (section): section is StudioPropertyItem => section !== null,
  );
};
