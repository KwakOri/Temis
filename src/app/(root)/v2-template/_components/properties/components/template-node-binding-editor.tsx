"use client";

import React from "react";

import {
  V2TemplateComputedBindingKey,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateNodeBindingRef,
} from "@/types/time-table/template-render-config";
import { V2NodeNewFieldDraft } from "../model/binding-utils";

interface TemplateNodeBindingEditorProps {
  binding: V2TemplateNodeBindingRef;
  bindingSelectValue: string;
  fields: V2TemplateFormField[];
  computedOptions: readonly V2TemplateComputedBindingKey[];
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  newFieldDraft: V2NodeNewFieldDraft;
  fieldBindingExists: boolean;
  onSelectBinding: (value: string) => void;
  onChangeLiteral: (value: string) => void;
  onChangeDraftKey: (value: string) => void;
  onChangeDraftScope: (scope: V2TemplateFieldScope) => void;
  onCreateField: () => void;
}

const TemplateNodeBindingEditor: React.FC<TemplateNodeBindingEditorProps> = ({
  binding,
  bindingSelectValue,
  fields,
  computedOptions,
  scopeOptions,
  newFieldDraft,
  fieldBindingExists,
  onSelectBinding,
  onChangeLiteral,
  onChangeDraftKey,
  onChangeDraftScope,
  onCreateField,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">바인딩 키</label>
        <select
          value={bindingSelectValue}
          onChange={(event) => onSelectBinding(event.target.value)}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {computedOptions.map((option) => (
            <option key={`computed-option-${option}`} value={`computed:${option}`}>
              computed / {option}
            </option>
          ))}
          {fields.map((field) => (
            <option
              key={`${field.scope}:${field.key}`}
              value={`field:${field.scope}:${field.key}`}
            >
              field / {field.scope}.{field.key}
            </option>
          ))}
          {binding.mode === "field" && !fieldBindingExists ? (
            <option value={`field:${binding.scope}:${binding.key}`}>
              field / {binding.scope}.{binding.key} (missing)
            </option>
          ) : null}
          <option value="literal">literal (직접 텍스트)</option>
        </select>
      </div>
      {binding.mode === "literal" ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">literal 값</label>
          <input
            value={binding.value}
            onChange={(event) => onChangeLiteral(event.target.value)}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            placeholder="표시할 고정 텍스트"
          />
        </div>
      ) : null}
      <div className="grid grid-cols-[1fr_96px_96px] gap-2 items-center">
        <input
          value={newFieldDraft.key}
          onChange={(event) => onChangeDraftKey(event.target.value)}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
          placeholder="새 필드 키"
        />
        <select
          value={newFieldDraft.scope}
          onChange={(event) =>
            onChangeDraftScope(
              event.target.value === "card" || event.target.value === "global"
                ? event.target.value
                : "entry"
            )
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
        >
          {scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onCreateField}
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-2 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
        >
          + 필드 생성
        </button>
      </div>
      {!fieldBindingExists ? (
        <p className="text-xs text-red-300">
          현재 바인딩된 필드가 입력 스키마에 없습니다.
        </p>
      ) : null}
    </>
  );
};

export default TemplateNodeBindingEditor;
