"use client";

import { V2TemplateFieldScope, V2TemplateFormField } from "@/types/time-table/template-render-config";
import React from "react";

interface TemplateSchemaTabProps {
  formSchemaError: string | null;
  diagnostics: {
    totalFields: number;
    unusedFields: unknown[];
    missingBindings: Array<{
      nodeLabel: string;
      scope: string;
      key: string;
    }>;
  };
  fields: V2TemplateFormField[];
  computedKeys: readonly string[];
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  typeOptions: Array<{ value: V2TemplateFormField["type"]; label: string }>;
  onAppendField: () => void;
  onRemoveField: (index: number) => void;
  onUpdateField: (
    index: number,
    patch: Partial<V2TemplateFormField>
  ) => void;
}

const TemplateSchemaTab: React.FC<TemplateSchemaTabProps> = ({
  formSchemaError,
  diagnostics,
  fields,
  computedKeys,
  scopeOptions,
  typeOptions,
  onAppendField,
  onRemoveField,
  onUpdateField,
}) => {
  return (
    <div className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base text-gray-100">입력 스키마</h3>
        <button
          type="button"
          onClick={onAppendField}
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
        >
          + 필드 추가
        </button>
      </div>
      <p className="text-xs text-gray-400">
        여기에서 정의한 필드는 사용자 입력 폼과 오브젝트 바인딩에서 공통으로 사용됩니다.
      </p>
      {formSchemaError ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
          {formSchemaError}
        </div>
      ) : null}
      <div className="rounded border border-[#3a3d44] bg-[#1a1c20] px-2 py-1.5 text-xs text-gray-300 space-y-1">
        <p>
          총 필드: {diagnostics.totalFields}개 / 미사용 필드:{" "}
          {diagnostics.unusedFields.length}개
        </p>
        {diagnostics.missingBindings.length > 0 ? (
          <p className="text-red-300">
            누락 바인딩 {diagnostics.missingBindings.length}개 (
            {diagnostics.missingBindings
              .map((binding) => `${binding.nodeLabel} -> ${binding.scope}.${binding.key}`)
              .join(", ")}
            )
          </p>
        ) : (
          <p className="text-emerald-300">누락된 바인딩 없음</p>
        )}
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={`${field.scope}:${field.key}:${index}`}
            className="rounded border border-[#3a3d44] bg-[#1a1c20] p-2 space-y-2"
          >
            <div className="grid grid-cols-[1fr_96px_120px_auto] gap-2 items-center">
              <input
                value={field.key}
                onChange={(event) =>
                  onUpdateField(index, { key: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="field key"
              />
              <select
                value={field.scope}
                onChange={(event) =>
                  onUpdateField(index, {
                    scope:
                      event.target.value === "card" ||
                      event.target.value === "global"
                        ? event.target.value
                        : "entry",
                  })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              >
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={field.type}
                onChange={(event) =>
                  onUpdateField(index, {
                    type: event.target.value as V2TemplateFormField["type"],
                  })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onRemoveField(index)}
                className="rounded border border-red-500/40 px-2 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
              >
                삭제
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={field.label ?? ""}
                onChange={(event) =>
                  onUpdateField(index, { label: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="label (optional)"
              />
              <input
                value={field.placeholder}
                onChange={(event) =>
                  onUpdateField(index, { placeholder: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="placeholder"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <input
                value={field.defaultValue === undefined ? "" : String(field.defaultValue)}
                onChange={(event) =>
                  onUpdateField(index, { defaultValue: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="default value (optional)"
              />
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) =>
                    onUpdateField(index, { required: event.target.checked })
                  }
                />
                required
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded border border-[#3a3d44] bg-[#1a1c20] p-2 text-xs text-gray-400">
        computed 키: {computedKeys.join(", ")}
      </div>
    </div>
  );
};

export default TemplateSchemaTab;
