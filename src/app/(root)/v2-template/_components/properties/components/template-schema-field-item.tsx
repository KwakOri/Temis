"use client";

import { V2TemplateFieldScope, V2TemplateFormField } from "@/types/time-table/template-render-config";
import React from "react";

interface TemplateSchemaFieldItemProps {
  index: number;
  field: V2TemplateFormField;
  usage: {
    count: number;
    nodeLabels: string[];
  };
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  typeOptions: Array<{ value: V2TemplateFormField["type"]; label: string }>;
  onRemoveField: (index: number) => void;
  onUpdateField: (index: number, patch: Partial<V2TemplateFormField>) => void;
}

const TemplateSchemaFieldItem: React.FC<TemplateSchemaFieldItemProps> = ({
  index,
  field,
  usage,
  scopeOptions,
  typeOptions,
  onRemoveField,
  onUpdateField,
}) => {
  return (
    <div className="rounded border border-[#3a3d44] bg-[#1a1c20] p-2 space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_88px_102px_56px] gap-2 items-center">
        <input
          value={field.key}
          onChange={(event) =>
            onUpdateField(index, { key: event.target.value })
          }
          className="min-w-0 px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
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
          className="min-w-0 px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
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
          className="min-w-0 px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
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
          className="min-w-0 whitespace-nowrap rounded border border-red-500/40 px-2 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
        >
          삭제
        </button>
      </div>
      <div className="rounded border border-[#2f3440] bg-[#171a20] px-2 py-1 text-[11px] text-[#9fb0cc]">
        사용 중: {usage.count}개
        {usage.nodeLabels.length > 0
          ? ` (${usage.nodeLabels.join(", ")})`
          : " (연결된 오브젝트 없음)"}
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
  );
};

export default TemplateSchemaFieldItem;
