"use client";

import { V2TemplateFormField } from "@/types/time-table/template-render-config";
import React from "react";

type V2FieldScope = "entry" | "card" | "global";

interface TemplateDataTabProps {
  fields: V2TemplateFormField[];
  isOffline: boolean;
  entryValues: Record<string, unknown>;
  cardValues: Record<string, unknown>;
  globalValues: Record<string, unknown>;
  onChangeField: (scope: V2FieldScope, key: string, value: string | number) => void;
  onToggleOffline: (value: boolean) => void;
}

const v2_toFieldInputValue = (
  value: unknown
): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
};

const v2_SCOPE_LABELS: Record<V2FieldScope, string> = {
  entry: "Entry (월요일 첫 카드의 첫 엔트리)",
  card: "Card (월요일 첫 카드 공통)",
  global: "Global (템플릿 전역)",
};

const TemplateDataTab: React.FC<TemplateDataTabProps> = ({
  fields,
  isOffline,
  entryValues,
  cardValues,
  globalValues,
  onChangeField,
  onToggleOffline,
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
    const label = field.label?.trim() || field.key;

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
        <span className="text-sm text-gray-300">monday isOffline</span>
        <input
          type="checkbox"
          checked={isOffline}
          onChange={(event) => onToggleOffline(event.target.checked)}
        />
      </label>

      {renderScopeSection("entry")}
      {renderScopeSection("card")}
      {renderScopeSection("global")}
    </div>
  );
};

export default TemplateDataTab;
