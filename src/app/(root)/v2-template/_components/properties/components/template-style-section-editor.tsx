"use client";

import React from "react";
import { Braces, ChevronDown, ChevronRight, Plus } from "lucide-react";

import {
  V2BoilerplateFieldConfig,
  V2BoilerplateFieldType,
  V2BoilerplateGroupConfig,
  v2_expandDisplayGroups,
  v2_getBoilerplateFieldIcon,
  v2_getBoilerplateGroupIcon,
  v2_STYLE_EXTENSION_GROUP_IDS,
  v2_STYLE_GROUP_DISPLAY_LABEL,
} from "../model/boilerplate-ui-utils";
import { v2_BOILERPLATE_SECTION_GROUPS } from "../model/boilerplate-section-groups";
import { v2_STYLE_EXTENSION_GROUPS } from "../model/boilerplate-presets";
import {
  v2_POSITION_MUTEX_MAP,
  v2_getGridEmptySlotsFromMap,
  v2_hasRenderableStyleValue,
  v2_parseFlex42Align,
  v2_parseFlex42ThreeRow,
  v2_parseGridLayoutMode,
} from "../model/layout-utils";

type V2GridLayoutMode = "grid3x3" | "flex4x2";
type V2Flex42Align = "left" | "center" | "right";
type V2Flex42ThreeRow = "top" | "bottom";

interface TemplateStyleSectionEditorProps {
  title: string;
  section: string;
  getStyleSectionMap: (section: string) => Record<string, string | number>;
  lockedStylePropertyKeys: Set<string>;
  isStyleGroupOpen: (params: {
    section: string;
    group: V2BoilerplateGroupConfig;
    sectionMap: Record<string, string | number>;
  }) => boolean;
  onToggleStyleGroupOpen: (section: string, groupId: string) => void;
  onSetSectionHoverHighlight: (section: string) => void;
  onClearSectionHoverHighlight: () => void;
  onSetSectionActiveHighlight: (section: string) => void;
  onApplyStyleExtensionGroupDefaults: (section: string, groupId: string) => void;
  onUpdateStylePropertyValue: (
    section: string,
    key: string,
    value: string
  ) => void;
  onRemoveStyleProperty: (section: string, key: string) => void;
  onAddStyleProperty: (section: string) => void;
  onUpdateGridLayoutMode: (mode: V2GridLayoutMode) => void;
  onPickGridEmptySlot: (slot: number) => void;
  onUpdateFlex42ThreeRow: (value: V2Flex42ThreeRow) => void;
  onUpdateFlex42Align: (value: V2Flex42Align) => void;
  getBoilerplateFieldType: (
    field: V2BoilerplateFieldConfig
  ) => V2BoilerplateFieldType;
  getBoilerplateFieldStep: (field: V2BoilerplateFieldConfig) => string;
}

const TemplateStyleSectionEditor: React.FC<TemplateStyleSectionEditorProps> = ({
  title,
  section,
  getStyleSectionMap,
  lockedStylePropertyKeys,
  isStyleGroupOpen,
  onToggleStyleGroupOpen,
  onSetSectionHoverHighlight,
  onClearSectionHoverHighlight,
  onSetSectionActiveHighlight,
  onApplyStyleExtensionGroupDefaults,
  onUpdateStylePropertyValue,
  onRemoveStyleProperty,
  onAddStyleProperty,
  onUpdateGridLayoutMode,
  onPickGridEmptySlot,
  onUpdateFlex42ThreeRow,
  onUpdateFlex42Align,
  getBoilerplateFieldType,
  getBoilerplateFieldStep,
}) => {
  const sectionMap = getStyleSectionMap(section);
  const isGridSection = section === "grid";
  const groups = [
    ...v2_expandDisplayGroups(v2_BOILERPLATE_SECTION_GROUPS[section] ?? []),
    ...v2_STYLE_EXTENSION_GROUPS,
  ];
  const gridPresetKeys = isGridSection
    ? [
        "layoutMode",
        "gridEmptySlotA",
        "gridEmptySlotB",
        "flex42ThreeRow",
        "flex42Align",
      ]
    : [];
  const presetKeys = new Set([
    ...groups.flatMap((group) => group.fields.map((field) => field.key)),
    ...gridPresetKeys,
  ]);
  const customEntries = Object.entries(sectionMap).filter(
    ([property]) =>
      !presetKeys.has(property) && !lockedStylePropertyKeys.has(property)
  );
  const gridLayoutMode = isGridSection
    ? v2_parseGridLayoutMode(sectionMap.layoutMode)
    : null;
  const gridEmptySlots = isGridSection ? v2_getGridEmptySlotsFromMap(sectionMap) : [];
  const flex42Align = isGridSection
    ? v2_parseFlex42Align(sectionMap.flex42Align)
    : "center";
  const flex42ThreeRow = isGridSection
    ? v2_parseFlex42ThreeRow(sectionMap.flex42ThreeRow)
    : "bottom";

  return (
    <div className="rounded border border-[#3a3d44] bg-[#1f2126] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-gray-100">{title}</h5>
      </div>

      {isGridSection && (
        <div className="rounded border border-[#343842] bg-[#1b1d22] p-3 space-y-3">
          <h6 className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">
            Layout Mode
          </h6>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateGridLayoutMode("grid3x3")}
              className={`rounded border px-2 py-1 text-xs ${
                gridLayoutMode === "grid3x3"
                  ? "border-blue-400 bg-blue-500/20 text-blue-200"
                  : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
              }`}
            >
              3 x 3 (Grid)
            </button>
            <button
              type="button"
              onClick={() => onUpdateGridLayoutMode("flex4x2")}
              className={`rounded border px-2 py-1 text-xs ${
                gridLayoutMode === "flex4x2"
                  ? "border-blue-400 bg-blue-500/20 text-blue-200"
                  : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
              }`}
            >
              4 x 2 (Flex)
            </button>
          </div>

          {gridLayoutMode === "grid3x3" ? (
            <div className="space-y-2">
              <span className="text-[11px] text-gray-400">비울 칸 선택</span>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((slot) => {
                  const isSelected = gridEmptySlots.includes(slot);

                  return (
                    <button
                      key={`grid-empty-slot-${slot}`}
                      type="button"
                      onClick={() => onPickGridEmptySlot(slot)}
                      className={`relative rounded border px-2 py-2 text-xs font-semibold transition ${
                        isSelected
                          ? "border-blue-400/80 bg-blue-500/20 text-blue-100"
                          : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                      }`}
                    >
                      <span>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[11px] text-gray-400">3칸 줄 위치</span>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: "윗줄 3칸", value: "top" },
                  { label: "아랫줄 3칸", value: "bottom" },
                ] as Array<{ label: string; value: V2Flex42ThreeRow }>).map(
                  (option) => (
                    <button
                      key={`flex42-three-row-${option.value}`}
                      type="button"
                      onClick={() => onUpdateFlex42ThreeRow(option.value)}
                      className={`rounded border px-2 py-1 text-xs ${
                        flex42ThreeRow === option.value
                          ? "border-blue-400 bg-blue-500/20 text-blue-200"
                          : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                )}
              </div>
              <span className="text-[11px] text-gray-400">3칸 줄 정렬</span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { label: "Left", value: "left" },
                  { label: "Center", value: "center" },
                  { label: "Right", value: "right" },
                ] as Array<{ label: string; value: V2Flex42Align }>).map((option) => (
                  <button
                    key={`flex42-align-${option.value}`}
                    type="button"
                    onClick={() => onUpdateFlex42Align(option.value)}
                    className={`rounded border px-2 py-1 text-xs ${
                      flex42Align === option.value
                        ? "border-blue-400 bg-blue-500/20 text-blue-200"
                        : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {groups.map((group) => {
        const visibleFields = group.fields.filter(
          (field) => !lockedStylePropertyKeys.has(field.key)
        );
        if (visibleFields.length === 0) return null;

        const GroupIcon = v2_getBoilerplateGroupIcon(group.id);
        const groupLabel = v2_STYLE_GROUP_DISPLAY_LABEL[group.id] ?? group.label;
        const isPositionGroup = group.id === "position";
        const isGroupOpen = isStyleGroupOpen({
          section,
          group,
          sectionMap,
        });
        const ChevronIcon = isGroupOpen ? ChevronDown : ChevronRight;
        const isExtensionGroup = v2_STYLE_EXTENSION_GROUP_IDS.has(group.id);
        const filledCount = visibleFields.filter((field) => {
          const value = sectionMap[field.key];
          if (value === undefined) return false;
          if (typeof value === "string") return value.trim() !== "";
          return true;
        }).length;

        return (
          <div
            key={`${section}-style-group-${group.id}`}
            className="border-t border-[#343842] pt-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onToggleStyleGroupOpen(section, group.id)}
                className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-300 inline-flex items-center justify-between gap-2"
              >
                <span className="inline-flex items-center gap-1">
                  <ChevronIcon className="h-3.5 w-3.5 text-gray-500" />
                  <GroupIcon className="h-3.5 w-3.5 text-gray-400" />
                  {groupLabel}
                </span>
                <span className="text-[10px] text-gray-500">{filledCount}</span>
              </button>
              {isExtensionGroup && (
                <button
                  type="button"
                  onClick={() => onApplyStyleExtensionGroupDefaults(section, group.id)}
                  className="h-6 w-6 shrink-0 rounded border border-[#3a3d44] bg-[#2a2d33] text-gray-300 hover:bg-[#323640] inline-flex items-center justify-center"
                  aria-label={`${groupLabel} 기본 항목 추가`}
                  title={`${groupLabel} 기본 항목 추가`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {isGroupOpen && (
              <div className="grid grid-cols-2 gap-2">
                {visibleFields.map((field) => {
                  const fieldType = getBoilerplateFieldType(field);
                  const value = sectionMap[field.key];
                  const valueString = value === undefined ? "" : String(value);
                  const hasValue =
                    value !== undefined && !(typeof value === "string" && value === "");
                  const selectOptions = field.options ?? [];
                  const FieldIcon = v2_getBoilerplateFieldIcon(field, group.id);
                  const counterpartKey = v2_POSITION_MUTEX_MAP[field.key];
                  const isMutedByMutex =
                    isPositionGroup &&
                    !!counterpartKey &&
                    !v2_hasRenderableStyleValue(value) &&
                    v2_hasRenderableStyleValue(sectionMap[counterpartKey]);
                  const fieldWrapperClass =
                    isPositionGroup && field.key === "position"
                      ? "col-span-2 space-y-1"
                      : "space-y-1";
                  const fieldOpacityClass = isMutedByMutex ? "opacity-50" : "";

                  return (
                    <div
                      key={`${section}-${group.id}-style-${field.key}`}
                      className={`${fieldWrapperClass} ${fieldOpacityClass}`.trim()}
                      onMouseEnter={() => onSetSectionHoverHighlight(section)}
                      onMouseLeave={onClearSectionHoverHighlight}
                      onClick={() => onSetSectionActiveHighlight(section)}
                    >
                      <label className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                        <FieldIcon className="h-3.5 w-3.5 text-gray-500" />
                        {field.label}
                      </label>
                      <div className="grid grid-cols-[1fr_auto] gap-1">
                        {fieldType === "select" ? (
                          <select
                            value={valueString}
                            onChange={(e) =>
                              onUpdateStylePropertyValue(section, field.key, e.target.value)
                            }
                            className="w-full rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-100"
                          >
                            <option value="">(비움)</option>
                            {selectOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={fieldType === "number" ? "number" : "text"}
                            step={
                              fieldType === "number"
                                ? getBoilerplateFieldStep(field)
                                : undefined
                            }
                            value={valueString}
                            onChange={(e) =>
                              onUpdateStylePropertyValue(section, field.key, e.target.value)
                            }
                            className="w-full rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-100"
                            placeholder={field.placeholder ?? "값"}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveStyleProperty(section, field.key)}
                          className={`rounded border px-2 text-xs ${
                            hasValue
                              ? "border-red-400/40 text-red-300 hover:bg-red-500/10"
                              : "border-transparent text-transparent pointer-events-none"
                          }`}
                          aria-label={`${field.label} 속성 삭제`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-[#343842] pt-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h6 className="text-[11px] font-semibold uppercase tracking-wide text-gray-300 inline-flex items-center gap-1">
            <Braces className="h-3.5 w-3.5 text-gray-400" />
            Custom CSS
          </h6>
          <button
            type="button"
            onClick={() => onAddStyleProperty(section)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300"
          >
            + CSS 속성 추가
          </button>
        </div>
        {customEntries.length === 0 && (
          <p className="text-xs text-gray-500">추가된 속성이 없습니다.</p>
        )}
        {customEntries.map(([property, value], index) => (
          <div
            key={`style-custom-${section}-${index}`}
            className="grid grid-cols-[1fr_1fr_auto] gap-2"
            onMouseEnter={() => onSetSectionHoverHighlight(section)}
            onMouseLeave={onClearSectionHoverHighlight}
            onClick={() => onSetSectionActiveHighlight(section)}
          >
            <div className="rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-200 flex items-center">
              {property}
            </div>
            <input
              value={String(value)}
              onChange={(e) =>
                onUpdateStylePropertyValue(section, property, e.target.value)
              }
              className="rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-100"
              placeholder="값"
            />
            <button
              type="button"
              onClick={() => onRemoveStyleProperty(section, property)}
              className="rounded border border-red-400/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateStyleSectionEditor;
