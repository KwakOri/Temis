"use client";

import { V2TemplateFieldScope, V2TemplateFormField } from "@/types/time-table/template-render-config";
import React from "react";
import TemplateSchemaFieldItem from "../components/template-schema-field-item";

interface TemplateSchemaTabProps {
  formSchemaError: string | null;
  diagnostics: {
    totalFields: number;
    unusedFields: V2TemplateFormField[];
    duplicateFields: Array<{ scope: string; key: string; count: number }>;
    invalidFields: Array<{ scope: string; key: string; reason: string }>;
    missingBindings: Array<{
      nodeLabel: string;
      scope: string;
      key: string;
    }>;
    fieldUsageByFieldId: Record<
      string,
      {
        count: number;
        nodeLabels: string[];
      }
    >;
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p>총 필드: {diagnostics.totalFields}개</p>
          <p>미사용 필드: {diagnostics.unusedFields.length}개</p>
        </div>
        {diagnostics.duplicateFields.length > 0 ? (
          <p className="text-amber-300">
            중복 필드 {diagnostics.duplicateFields.length}개 (
            {diagnostics.duplicateFields
              .map((field) => `${field.scope}.${field.key} x${field.count}`)
              .join(", ")}
            )
          </p>
        ) : null}
        {diagnostics.invalidFields.length > 0 ? (
          <p className="text-amber-300">
            스키마 경고 {diagnostics.invalidFields.length}개 (
            {diagnostics.invalidFields
              .map((field) => `${field.scope}.${field.key}: ${field.reason}`)
              .join(", ")}
            )
          </p>
        ) : null}
        {diagnostics.missingBindings.length > 0 ? (
          <p className="text-red-300">
            누락 바인딩 {diagnostics.missingBindings.length}개 (
            {diagnostics.missingBindings
              .slice(0, 5)
              .map((binding) => `${binding.nodeLabel} -> ${binding.scope}.${binding.key}`)
              .join(", ")}
            {diagnostics.missingBindings.length > 5 ? ", ..." : ""}
            )
          </p>
        ) : (
          <p className="text-emerald-300">누락된 바인딩 없음</p>
        )}
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => {
          const fieldId = `${field.scope}:${field.key}`;
          const usage = diagnostics.fieldUsageByFieldId[fieldId] ?? {
            count: 0,
            nodeLabels: [],
          };
          return (
            <TemplateSchemaFieldItem
              key={`${field.scope}:${field.key}:${index}`}
              index={index}
              field={field}
              usage={usage}
              scopeOptions={scopeOptions}
              typeOptions={typeOptions}
              onRemoveField={onRemoveField}
              onUpdateField={onUpdateField}
            />
          );
        })}
      </div>

      <div className="rounded border border-[#3a3d44] bg-[#1a1c20] p-2 text-xs text-gray-400">
        computed 키: {computedKeys.join(", ")}
      </div>
    </div>
  );
};

export default TemplateSchemaTab;
