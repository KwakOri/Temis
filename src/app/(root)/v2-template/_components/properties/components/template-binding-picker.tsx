"use client";

import React from "react";

import {
  V2TemplateComputedBindingKey,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateNodeBindingRef,
} from "@/types/time-table/template-render-config";
import { v2_getNodeBindingLabel } from "../model/binding-utils";

interface TemplateBindingPickerProps {
  binding: V2TemplateNodeBindingRef;
  bindingSelectValue: string;
  fields: V2TemplateFormField[];
  computedOptions: readonly V2TemplateComputedBindingKey[];
  onSelectBinding: (value: string) => void;
  triggerClassName?: string;
  modalTitle?: string;
  modalDescription?: string;
  triggerAriaLabel?: string;
}

const v2_SCOPE_ORDER: V2TemplateFieldScope[] = ["entry", "card", "global"];

const v2_SCOPE_LABELS: Record<V2TemplateFieldScope, string> = {
  entry: "Entry",
  card: "Card",
  global: "Global",
};

const TemplateBindingPicker: React.FC<TemplateBindingPickerProps> = ({
  binding,
  bindingSelectValue,
  fields,
  computedOptions,
  onSelectBinding,
  triggerClassName,
  modalTitle = "바인딩 선택",
  modalDescription = "Computed, 입력 스키마(field), literal을 계층 구조로 선택합니다.",
  triggerAriaLabel = "바인딩 선택 열기",
}) => {
  const [open, setOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const selectedLabel = React.useMemo(
    () => v2_getNodeBindingLabel(binding, fields),
    [binding, fields]
  );
  React.useEffect(() => {
    if (!open) {
      setSearchText("");
    }
  }, [open]);
  const fieldsByScope = React.useMemo(() => {
    const next: Record<V2TemplateFieldScope, V2TemplateFormField[]> = {
      entry: [],
      card: [],
      global: [],
    };
    fields.forEach((field) => {
      next[field.scope].push(field);
    });
    v2_SCOPE_ORDER.forEach((scope) => {
      next[scope].sort((a, b) => a.key.localeCompare(b.key));
    });
    return next;
  }, [fields]);

  const handleSelect = (value: string) => {
    onSelectBinding(value);
    setOpen(false);
  };
  const normalizedSearch = searchText.trim().toLowerCase();
  const includesSearch = (value: string) => {
    if (!normalizedSearch) return true;
    return value.toLowerCase().includes(normalizedSearch);
  };
  const filteredComputedOptions = React.useMemo(() => {
    return computedOptions.filter((option) =>
      includesSearch(`computed ${option}`)
    );
  }, [computedOptions, normalizedSearch]);
  const filteredFieldsByScope = React.useMemo(() => {
    const next: Record<V2TemplateFieldScope, V2TemplateFormField[]> = {
      entry: [],
      card: [],
      global: [],
    };
    v2_SCOPE_ORDER.forEach((scope) => {
      next[scope] = fieldsByScope[scope].filter((field) =>
        includesSearch(
          `${field.scope} ${field.key} ${field.label ?? ""} ${field.type}`
        )
      );
    });
    return next;
  }, [fieldsByScope, normalizedSearch]);
  const shouldShowLiteral = includesSearch("literal 직접 텍스트");

  const renderOptionButton = (params: {
    value: string;
    label: string;
    selected: boolean;
    meta?: string;
  }) => {
    return (
      <button
        type="button"
        className={`w-full rounded border px-2 py-1.5 text-left text-xs ${
          params.selected
            ? "border-[#4f8cff] bg-[#1c2d52] text-[#dce9ff]"
            : "border-[#2f3a4c] bg-[#131a25] text-[#d0d8e5] hover:bg-[#182336]"
        }`}
        onClick={() => handleSelect(params.value)}
      >
        <div className="flex items-center justify-between gap-2">
          <span>{params.label}</span>
          {params.meta ? <span className="text-[10px] text-[#8fa6cf]">{params.meta}</span> : null}
        </div>
      </button>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label={triggerAriaLabel}
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-2 text-left text-sm text-gray-100 hover:bg-[#323640]"
        }
      >
        {selectedLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="바인딩 선택 모달 닫기"
            className="absolute inset-0 bg-black/55"
            onClick={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setOpen(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#334154] bg-[#0f1622] p-4 shadow-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[#dce9ff]">{modalTitle}</h4>
                <p className="text-xs text-[#8fa6cf]">{modalDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearchText("");
                }}
                className="rounded border border-[#3a3d44] bg-[#222936] px-2 py-1 text-xs font-semibold text-[#d0d8e5] hover:bg-[#2a3446]"
              >
                닫기
              </button>
            </div>
            <div className="rounded border border-[#2f3a4c] bg-[#111825] p-2 space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8fa6cf]">
                검색
              </label>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="key / label / type / scope 검색"
                className="w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-2 text-xs text-gray-100 placeholder:text-[#70819f]"
              />
            </div>

            <details open className="rounded border border-[#2f3a4c] bg-[#111825]">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-[#9fb6de]">
                Computed
              </summary>
              <div className="space-y-1 border-t border-[#283247] p-2">
                {filteredComputedOptions.length === 0 ? (
                  <p className="text-[11px] text-[#6f86ad]">검색 결과가 없습니다.</p>
                ) : null}
                {filteredComputedOptions.map((option) =>
                  renderOptionButton({
                    value: `computed:${option}`,
                    label: `computed / ${option}`,
                    selected: bindingSelectValue === `computed:${option}`,
                  })
                )}
              </div>
            </details>

            <details open className="rounded border border-[#2f3a4c] bg-[#111825]">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-[#9fb6de]">
                Field (입력 스키마)
              </summary>
              <div className="space-y-2 border-t border-[#283247] p-2">
                {v2_SCOPE_ORDER.map((scope) => (
                  <details key={`binding-scope-${scope}`} open className="rounded border border-[#26334a] bg-[#0e1521]">
                    <summary className="cursor-pointer select-none px-2 py-1.5 text-xs font-semibold text-[#9fb6de]">
                      {v2_SCOPE_LABELS[scope]} ({filteredFieldsByScope[scope].length})
                    </summary>
                    <div className="space-y-1 border-t border-[#22304a] p-2">
                      {filteredFieldsByScope[scope].length === 0 ? (
                        <p className="text-[11px] text-[#6f86ad]">필드가 없습니다.</p>
                      ) : (
                        filteredFieldsByScope[scope].map((field) =>
                          renderOptionButton({
                            value: `field:${field.scope}:${field.key}`,
                            label: `field / ${field.scope}.${field.key}`,
                            selected:
                              bindingSelectValue === `field:${field.scope}:${field.key}`,
                            meta: field.type,
                          })
                        )
                      )}
                    </div>
                  </details>
                ))}
                {binding.mode === "field" &&
                !fields.some(
                  (field) =>
                    field.scope === binding.scope && field.key === binding.key
                )
                  ? renderOptionButton({
                      value: `field:${binding.scope}:${binding.key}`,
                      label: `field / ${binding.scope}.${binding.key} (missing)`,
                      selected:
                        bindingSelectValue === `field:${binding.scope}:${binding.key}`,
                    })
                  : null}
              </div>
            </details>

            <details open className="rounded border border-[#2f3a4c] bg-[#111825]">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-[#9fb6de]">
                Literal
              </summary>
              <div className="border-t border-[#283247] p-2">
                {shouldShowLiteral ? (
                  renderOptionButton({
                    value: "literal",
                    label: "literal (직접 텍스트)",
                    selected: bindingSelectValue === "literal",
                  })
                ) : (
                  <p className="text-[11px] text-[#6f86ad]">검색 결과가 없습니다.</p>
                )}
              </div>
            </details>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default TemplateBindingPicker;
