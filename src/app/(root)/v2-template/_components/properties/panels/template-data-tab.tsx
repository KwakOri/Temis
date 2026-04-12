"use client";

import { V2TemplateFormField } from "@/types/time-table/template-render-config";
import React from "react";

type V2FieldScope = "entry" | "card" | "global";

interface TemplateDataTabProps {
  fields: V2TemplateFormField[];
  isOffline: boolean;
  entryValues: Record<string, unknown>;
  entryCount: number;
  selectedEntryIndex: number;
  maxEntryCount: number;
  cardValues: Record<string, unknown>;
  globalValues: Record<string, unknown>;
  onChangeField: (scope: V2FieldScope, key: string, value: string | number) => void;
  onToggleOffline: (value: boolean) => void;
  onSelectEntryIndex: (index: number) => void;
  onAddEntry: () => void;
  onRemoveEntry: (index: number) => void;
}

const v2_toFieldInputValue = (
  value: unknown
): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
};

const v2_SCOPE_LABELS: Record<V2FieldScope, string> = {
  entry: "Entry",
  card: "Card",
  global: "Global",
};

const v2_SCOPE_DESCRIPTIONS: Record<V2FieldScope, string> = {
  entry: "월요일 첫 카드의 선택된 회차 데이터",
  card: "월요일 첫 카드 공통 데이터",
  global: "템플릿 전역 데이터",
};

const TemplateDataTab: React.FC<TemplateDataTabProps> = ({
  fields,
  isOffline,
  entryValues,
  entryCount,
  selectedEntryIndex,
  maxEntryCount,
  cardValues,
  globalValues,
  onChangeField,
  onToggleOffline,
  onSelectEntryIndex,
  onAddEntry,
  onRemoveEntry,
}) => {
  const grouped = React.useMemo(() => {
    return {
      entry: fields.filter((field) => field.scope === "entry"),
      card: fields.filter((field) => field.scope === "card"),
      global: fields.filter((field) => field.scope === "global"),
    };
  }, [fields]);

  const getValueByScope = (scope: V2FieldScope, key: string): unknown => {
    if (scope === "entry") return entryValues[key];
    if (scope === "card") return cardValues[key];
    return globalValues[key];
  };

  const renderFieldInput = (field: V2TemplateFormField) => {
    const value = v2_toFieldInputValue(getValueByScope(field.scope, field.key));
    const commonClassName =
      "w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2 text-sm text-gray-100";

    if (field.type === "textarea") {
      return (
        <textarea
          rows={3}
          value={String(value)}
          onChange={(event) =>
            onChangeField(field.scope, field.key, event.target.value)
          }
          className={commonClassName}
          placeholder={field.placeholder}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          value={String(value)}
          onChange={(event) =>
            onChangeField(field.scope, field.key, event.target.value)
          }
          className={commonClassName}
        >
          <option value="">{field.placeholder || "선택"}</option>
          {(field.options ?? []).map((option) => (
            <option key={`${field.key}:${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "number") {
      return (
        <input
          type="number"
          value={value}
          onChange={(event) => {
            const raw = event.target.value;
            onChangeField(field.scope, field.key, raw === "" ? "" : Number(raw));
          }}
          className={commonClassName}
          placeholder={field.placeholder}
        />
      );
    }

    const inputType =
      field.type === "time"
        ? "time"
        : field.type === "date"
          ? "date"
          : "text";

    return (
      <input
        type={inputType}
        value={String(value)}
        onChange={(event) =>
          onChangeField(field.scope, field.key, event.target.value)
        }
        className={commonClassName}
        placeholder={field.placeholder}
      />
    );
  };

  const renderScopeSection = (scope: V2FieldScope) => {
    const scopeFields = grouped[scope];
    if (scopeFields.length === 0) return null;
    return (
      <section className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
          {v2_SCOPE_LABELS[scope]}
        </h4>
        <p className="text-[11px] text-gray-500">
          {v2_SCOPE_DESCRIPTIONS[scope]}
        </p>
        {scopeFields.map((field) => {
          const label = field.label?.trim() || field.key;
          return (
            <div key={`${field.scope}:${field.key}`} className="space-y-1.5">
              <label className="block text-xs text-gray-400">{label}</label>
              {renderFieldInput(field)}
            </div>
          );
        })}
      </section>
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100">
      <h3 className="font-bold text-base text-gray-100">샘플 데이터</h3>
      <p className="text-xs text-gray-400">
        입력 스키마를 기준으로 월요일 카드 데이터를 빠르게 조정해 프리뷰를 확인합니다.
      </p>

      <label className="flex items-center justify-between gap-2 rounded border border-[#3a3d44] bg-[#1a1c20] px-3 py-2">
        <span className="text-sm text-gray-300">월요일 카드 오프라인 표시</span>
        <input
          type="checkbox"
          checked={isOffline}
          onChange={(event) => onToggleOffline(event.target.checked)}
        />
      </label>

      <section className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
          Entry 선택
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: entryCount }).map((_, index) => {
            const selected = selectedEntryIndex === index;
            return (
              <button
                key={`entry-tab-${index}`}
                type="button"
                onClick={() => onSelectEntryIndex(index)}
                className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                  selected
                    ? "border-[#4f8cff] bg-[#1f355f] text-[#d6e6ff]"
                    : "border-[#3a3d44] bg-[#2a2d33] text-gray-300 hover:bg-[#323640]"
                }`}
              >
                회차 {index + 1}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddEntry}
            disabled={entryCount >= maxEntryCount}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2.5 py-1 text-xs font-semibold text-gray-200 hover:bg-[#323640] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + 회차 추가
          </button>
          <button
            type="button"
            onClick={() => onRemoveEntry(selectedEntryIndex)}
            disabled={entryCount <= 1}
            className="rounded border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            현재 회차 삭제
          </button>
          <span className="text-[11px] text-gray-400">
            {entryCount}/{maxEntryCount}
          </span>
        </div>
      </section>

      {renderScopeSection("entry")}
      {renderScopeSection("card")}
      {renderScopeSection("global")}
    </div>
  );
};

export default TemplateDataTab;
