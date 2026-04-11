"use client";

import React from "react";

import {
  V2TemplateComputedBindingKey,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateNodeBindingRef,
} from "@/types/time-table/template-render-config";
import { V2NodeNewFieldDraft } from "../model/binding-utils";
import TemplateBindingPicker from "./template-binding-picker";

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
  onChangeEntrySelectorIndex: (index: number) => void;
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
  onChangeEntrySelectorIndex,
  onChangeDraftKey,
  onChangeDraftScope,
  onCreateField,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">바인딩 키</label>
        <TemplateBindingPicker
          binding={binding}
          bindingSelectValue={bindingSelectValue}
          fields={fields}
          computedOptions={computedOptions}
          onSelectBinding={onSelectBinding}
          modalTitle="텍스트 바인딩 선택"
          modalDescription="Computed/Field/Literal을 계층 구조로 선택합니다."
        />
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
      {binding.mode === "field" && binding.scope === "entry" ? (
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">Entry 인덱스</label>
          <input
            type="number"
            min={0}
            step={1}
            value={binding.entrySelector?.mode === "index" ? binding.entrySelector.index : 0}
            onChange={(event) =>
              onChangeEntrySelectorIndex(
                Math.max(0, Math.floor(Number(event.target.value || "0")))
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            placeholder="0"
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
