"use client";

import React from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

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
  v2_hasRenderableStyleValue,
} from "../model/layout-utils";

interface TemplateStyleSectionEditorProps {
  title: string;
  section: string;
  schemaSection?: string;
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
  getBoilerplateFieldType: (
    field: V2BoilerplateFieldConfig
  ) => V2BoilerplateFieldType;
  getBoilerplateFieldStep: (field: V2BoilerplateFieldConfig) => string;
}

const TemplateStyleSectionEditor: React.FC<TemplateStyleSectionEditorProps> = ({
  title,
  section,
  schemaSection,
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
  getBoilerplateFieldType,
  getBoilerplateFieldStep,
}) => {
  const sectionMap = getStyleSectionMap(section);
  const displaySection = schemaSection ?? section;
  const isGridSection = displaySection === "grid" || section === "grid";
  const groupSection = isGridSection ? "grid" : displaySection;
  const groups = [
    ...v2_expandDisplayGroups(v2_BOILERPLATE_SECTION_GROUPS[groupSection] ?? []),
    ...v2_STYLE_EXTENSION_GROUPS,
  ];

  return (
    <div className="rounded border border-[#3a3d44] bg-[#1f2126] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-gray-100">{title}</h5>
      </div>

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

    </div>
  );
};

export default TemplateStyleSectionEditor;
