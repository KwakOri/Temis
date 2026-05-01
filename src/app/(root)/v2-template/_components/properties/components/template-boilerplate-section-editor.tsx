"use client";

import React from "react";
import { AlignHorizontalJustifyCenter } from "lucide-react";

import {
  V2BoilerplateFieldConfig,
  V2BoilerplateFieldType,
  v2_expandDisplayGroups,
  v2_getBoilerplateFieldIcon,
  v2_getBoilerplateGroupIcon,
} from "../model/boilerplate-ui-utils";
import { v2_BOILERPLATE_SECTION_GROUPS } from "../model/boilerplate-section-groups";

type V2HorizontalAlign = "left" | "center" | "right";
type V2VerticalAlign = "top" | "center" | "bottom";

const v2_ALIGNMENT_HORIZONTAL_ORDER: V2HorizontalAlign[] = [
  "left",
  "center",
  "right",
];
const v2_ALIGNMENT_VERTICAL_ORDER: V2VerticalAlign[] = ["top", "center", "bottom"];
const v2_HORIZONTAL_ALIGN_LABELS: Record<V2HorizontalAlign, string> = {
  left: "좌측",
  center: "중앙",
  right: "우측",
};
const v2_VERTICAL_ALIGN_LABELS: Record<V2VerticalAlign, string> = {
  top: "상단",
  center: "중앙",
  bottom: "하단",
};

interface TemplateBoilerplateAutoResizePair {
  wrapperSection: string;
  textSection: string;
}

interface TemplateBoilerplateSectionEditorProps {
  title: string;
  section: string;
  getBoilerplateSectionMap: (section: string) => Record<string, string | number>;
  lockedStylePropertyKeys: Set<string>;
  getBoilerplateAutoResizePair: (
    section: string
  ) => TemplateBoilerplateAutoResizePair | null;
  getBoilerplateHorizontalAlign: (params: {
    wrapperSection: string;
    textSection: string;
  }) => V2HorizontalAlign;
  getBoilerplateVerticalAlign: (params: {
    wrapperSection: string;
  }) => V2VerticalAlign;
  onUpdateBoilerplateAutoResizeHorizontalAlign: (params: {
    wrapperSection: string;
    textSection: string;
    align: V2HorizontalAlign;
  }) => void;
  onUpdateBoilerplateAutoResizeVerticalAlign: (params: {
    wrapperSection: string;
    align: V2VerticalAlign;
  }) => void;
  onResetBoilerplateSection: (section: string) => void;
  getBoilerplateFieldType: (
    field: V2BoilerplateFieldConfig
  ) => V2BoilerplateFieldType;
  getBoilerplateFieldStep: (field: V2BoilerplateFieldConfig) => string;
  onUpdateBoilerplatePropertyValue: (
    section: string,
    key: string,
    value: string
  ) => void;
}

const TemplateBoilerplateSectionEditor: React.FC<
  TemplateBoilerplateSectionEditorProps
> = ({
  title,
  section,
  getBoilerplateSectionMap,
  lockedStylePropertyKeys,
  getBoilerplateAutoResizePair,
  getBoilerplateHorizontalAlign,
  getBoilerplateVerticalAlign,
  onUpdateBoilerplateAutoResizeHorizontalAlign,
  onUpdateBoilerplateAutoResizeVerticalAlign,
  onResetBoilerplateSection,
  getBoilerplateFieldType,
  getBoilerplateFieldStep,
  onUpdateBoilerplatePropertyValue,
}) => {
  const sectionMap = getBoilerplateSectionMap(section);
  const groups = v2_expandDisplayGroups(v2_BOILERPLATE_SECTION_GROUPS[section] ?? []);
  const autoResizePair = getBoilerplateAutoResizePair(section);
  const horizontalAlign = autoResizePair
    ? getBoilerplateHorizontalAlign(autoResizePair)
    : null;
  const verticalAlign = autoResizePair
    ? getBoilerplateVerticalAlign({ wrapperSection: autoResizePair.wrapperSection })
    : null;

  const applyBoilerplatePointAlignment = ({
    horizontal,
    vertical,
  }: {
    horizontal: V2HorizontalAlign;
    vertical: V2VerticalAlign;
  }) => {
    if (!autoResizePair) return;
    onUpdateBoilerplateAutoResizeHorizontalAlign({
      wrapperSection: autoResizePair.wrapperSection,
      textSection: autoResizePair.textSection,
      align: horizontal,
    });
    onUpdateBoilerplateAutoResizeVerticalAlign({
      wrapperSection: autoResizePair.wrapperSection,
      align: vertical,
    });
  };

  return (
    <div className="rounded border border-gray-300 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-semibold text-gray-700">{title}</h5>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onResetBoilerplateSection(section)}
            className="px-2 py-1 rounded border border-gray-300 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            기본값 복원
          </button>
        </div>
      </div>

      {autoResizePair && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2">
          <h6 className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase inline-flex items-center gap-1">
            <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
            Alignment
          </h6>
          <p className="text-[11px] text-gray-500">
            점 하나를 클릭하면 가로(`justifyContent` + `textAlign`)와 세로(`alignItems`)가
            함께 반영됩니다.
          </p>
          <div className="rounded border border-gray-200 bg-white p-2 inline-block">
            <div className="grid grid-cols-3 gap-2">
              {v2_ALIGNMENT_VERTICAL_ORDER.flatMap((vertical) =>
                v2_ALIGNMENT_HORIZONTAL_ORDER.map((horizontal) => {
                  const isActive =
                    horizontalAlign === horizontal && verticalAlign === vertical;
                  return (
                    <button
                      key={`bp-align-point-${section}-${vertical}-${horizontal}`}
                      type="button"
                      onClick={() =>
                        applyBoilerplatePointAlignment({
                          horizontal,
                          vertical,
                        })
                      }
                      aria-label={`${v2_VERTICAL_ALIGN_LABELS[vertical]} ${v2_HORIZONTAL_ALIGN_LABELS[horizontal]}`}
                      className={`h-9 w-9 rounded border inline-flex items-center justify-center transition ${
                        isActive
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`rounded-full ${
                          isActive ? "h-2.5 w-2.5 bg-blue-600" : "h-2 w-2 bg-gray-400"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {groups.map((group) => {
        const visibleFields = group.fields.filter(
          (field) => !lockedStylePropertyKeys.has(field.key)
        );
        if (visibleFields.length === 0) return null;

        const GroupIcon = v2_getBoilerplateGroupIcon(group.id);

        return (
          <div
            key={`${section}-${group.id}`}
            className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2"
          >
            <h6 className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase inline-flex items-center gap-1">
              <GroupIcon className="h-3.5 w-3.5" />
              {group.label}
            </h6>
            <div className="grid grid-cols-1 gap-2">
              {visibleFields.map((field) => {
                const fieldType = getBoilerplateFieldType(field);
                const value = sectionMap[field.key];
                const valueString = value === undefined ? "" : String(value);
                const selectOptions = field.options ?? [];
                const FieldIcon = v2_getBoilerplateFieldIcon(field, group.id);

                return (
                  <label
                    key={`${section}-${group.id}-${field.key}`}
                    className="grid grid-cols-2 items-center gap-2"
                  >
                    <span className="text-xs text-gray-600 inline-flex items-center gap-1">
                      <FieldIcon className="h-3.5 w-3.5 text-gray-400" />
                      {field.label}
                    </span>
                    {fieldType === "select" ? (
                      <select
                        value={valueString}
                        onChange={(e) =>
                          onUpdateBoilerplatePropertyValue(
                            section,
                            field.key,
                            e.target.value
                          )
                        }
                        className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
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
                          onUpdateBoilerplatePropertyValue(
                            section,
                            field.key,
                            e.target.value
                          )
                        }
                        className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
                        placeholder={field.placeholder ?? "값"}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

    </div>
  );
};

export default TemplateBoilerplateSectionEditor;
