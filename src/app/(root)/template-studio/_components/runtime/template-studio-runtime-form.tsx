"use client";

import { Minus, Plus, RotateCcw, Upload } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableDayId,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import {
  getStudioRuntimeInputValue,
  setStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import { getStudioAvailableTimetableStatuses } from "@/utils/template-studio/timetable-capabilities";
import {
  addStudioTimetableEntry,
  getStudioTimetableAddEntryDisabledReason,
  getStudioTimetableEntriesForDay,
  removeStudioTimetableEntry,
  setStudioTimetableEntryField,
  setStudioTimetableEntryStatus,
  type StudioTimetableEditableEntryField,
} from "@/utils/template-studio/timetable-runtime";

interface TemplateStudioRuntimeFormProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  setRuntimeValues: React.Dispatch<React.SetStateAction<StudioRuntimeValues>>;
  onReset: () => void;
}

type RuntimeInputGroups = Record<
  "global" | "day" | "entry",
  StudioInputDefinition[]
>;
type RuntimeScopeTab = "global" | "days";

const createEntryId = (dayId: StudioTimetableDayId, entryCount: number) => {
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${entryCount + 1}`;

  return `${dayId}-entry-${suffix}`;
};

const RuntimeTextField = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1.5 text-[11px] font-semibold text-slate-400">
    <span>{label}</span>
    <input
      className="h-9 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-sm font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-400"
      placeholder={placeholder}
      type="text"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  </label>
);

const RuntimeTextareaField = ({
  label,
  value,
  placeholder,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows: number;
  onChange: (value: string) => void;
}) => (
  <label className="grid gap-1.5 text-[11px] font-semibold text-slate-400">
    <span>{label}</span>
    <textarea
      className="min-h-24 resize-y rounded-md border border-slate-700 bg-slate-950 p-2.5 text-sm font-medium text-slate-100 outline-none placeholder:text-slate-600 focus:border-blue-400"
      placeholder={placeholder}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  </label>
);

export function TemplateStudioRuntimeForm({
  document,
  runtimeValues,
  setRuntimeValues,
  onReset,
}: TemplateStudioRuntimeFormProps) {
  const timetable = document.domains?.timetable;
  const days = useMemo(
    () =>
      timetable
        ? timetable.dayIds.map((dayId) => timetable.days[dayId]).filter(Boolean)
        : [],
    [timetable],
  );
  const inputGroups = useMemo<RuntimeInputGroups>(() => {
    const groups: RuntimeInputGroups = {
      global: [],
      day: [],
      entry: [],
    };

    Object.values(document.inputs).forEach((input) => {
      groups[input.scope].push(input);
    });

    return groups;
  }, [document.inputs]);
  const statusOptions = useMemo(
    () => getStudioAvailableTimetableStatuses(document),
    [document],
  );
  const [selectedDayId, setSelectedDayId] = useState<string>(days[0]?.id ?? "");
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
  const [activeScopeTab, setActiveScopeTab] = useState<RuntimeScopeTab>(
    days.length > 0 ? "days" : "global",
  );
  const activeEntries = selectedDayId
    ? getStudioTimetableEntriesForDay(document, runtimeValues, selectedDayId)
    : [];
  const activeEntry = activeEntries[selectedEntryIndex] ?? null;
  const addEntryDisabledReason = selectedDayId
    ? getStudioTimetableAddEntryDisabledReason(
        document,
        runtimeValues,
        selectedDayId,
      )
    : "Select a day first";
  const canAddEntry = addEntryDisabledReason === null;
  useEffect(() => {
    if (selectedDayId && days.some((day) => day.id === selectedDayId)) return;
    setSelectedDayId(days[0]?.id ?? "");
    setSelectedEntryIndex(0);
  }, [days, selectedDayId]);

  useEffect(() => {
    if (days.length > 0 || activeScopeTab === "global") return;
    setActiveScopeTab("global");
  }, [activeScopeTab, days.length]);

  useEffect(() => {
    if (selectedEntryIndex < activeEntries.length) return;
    setSelectedEntryIndex(Math.max(0, activeEntries.length - 1));
  }, [activeEntries.length, selectedEntryIndex]);

  const updateInputValue = (
    input: StudioInputDefinition,
    value: string,
    context: StudioRuntimeContext = {},
  ) => {
    setRuntimeValues((currentValues) =>
      setStudioRuntimeInputValue(
        document,
        currentValues,
        input.id,
        value,
        context,
      ),
    );
  };

  const addEntry = () => {
    if (!selectedDayId || !canAddEntry) return;

    const nextEntryId = createEntryId(selectedDayId, activeEntries.length);
    setRuntimeValues((currentValues) =>
      addStudioTimetableEntry(
        document,
        currentValues,
        selectedDayId,
        nextEntryId,
      ),
    );
    setSelectedEntryIndex(activeEntries.length);
  };

  const removeEntry = (entryIndex: number) => {
    if (!selectedDayId) return;

    setRuntimeValues((currentValues) =>
      removeStudioTimetableEntry(
        document,
        currentValues,
        selectedDayId,
        entryIndex,
      ),
    );
    setSelectedEntryIndex((currentIndex) =>
      Math.max(0, Math.min(currentIndex, activeEntries.length - 2)),
    );
  };

  const updateEntryStatus = (
    entryIndex: number,
    statusId: StudioTimetableStatusId,
  ) => {
    if (!selectedDayId) return;

    setRuntimeValues((currentValues) =>
      setStudioTimetableEntryStatus(
        document,
        currentValues,
        selectedDayId,
        entryIndex,
        statusId,
      ),
    );
  };

  const updateEntryField = (
    field: StudioTimetableEditableEntryField,
    value: string,
  ) => {
    if (!selectedDayId || !activeEntry) return;

    setRuntimeValues((currentValues) =>
      setStudioTimetableEntryField(
        document,
        currentValues,
        selectedDayId,
        selectedEntryIndex,
        field,
        value,
      ),
    );
  };

  const renderInput = (
    input: StudioInputDefinition,
    context: StudioRuntimeContext = {},
  ) => {
    const value = getStudioRuntimeInputValue(input, runtimeValues, context);
    const key = [
      input.id,
      context.dayId ?? "global",
      context.entryIndex ?? "none",
    ].join(":");

    if (input.type === "text") {
      if (input.multiline) {
        return (
          <RuntimeTextareaField
            key={key}
            label={input.label}
            placeholder={input.placeholder}
            rows={input.minRows ?? 4}
            value={value}
            onChange={(nextValue) =>
              updateInputValue(input, nextValue, context)
            }
          />
        );
      }

      return (
        <RuntimeTextField
          key={key}
          label={input.label}
          placeholder={input.placeholder}
          value={value}
          onChange={(nextValue) => updateInputValue(input, nextValue, context)}
        />
      );
    }

    if (input.type === "image") {
      return (
        <div className="grid gap-2" key={key}>
          <RuntimeTextField
            label={input.label}
            placeholder={input.placeholder}
            value={value}
            onChange={(nextValue) =>
              updateInputValue(input, nextValue, context)
            }
          />
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-bold text-slate-300 transition hover:border-blue-400 hover:text-white">
            <Upload size={14} />
            Upload
            <input
              accept="image/*"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                  updateInputValue(input, String(reader.result ?? ""), context);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      );
    }

    return (
      <label
        className="grid gap-1.5 text-[11px] font-semibold text-slate-400"
        key={key}
      >
        <span>{input.label}</span>
        <select
          className="h-9 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-sm font-medium text-slate-100 outline-none focus:border-blue-400"
          value={value}
          onChange={(event) =>
            updateInputValue(input, event.currentTarget.value, context)
          }
        >
          {input.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const renderInputGroup = (
    title: string,
    inputs: StudioInputDefinition[],
    context: StudioRuntimeContext = {},
  ) => {
    if (inputs.length === 0) return null;

    return (
      <section className="grid gap-3 border-t border-slate-800 pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          {title}
        </h3>
        <div className="grid gap-3">
          {inputs.map((input) => renderInput(input, context))}
        </div>
      </section>
    );
  };

  const renderEntryInputGroup = () => {
    if (!selectedDayId || !activeEntry) return null;

    const context: StudioRuntimeContext = {
      dayId: selectedDayId,
      entryIndex: selectedEntryIndex,
    };

    return (
      <section className="grid gap-3 border-t border-slate-800 pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Entry
        </h3>
        <div className="grid gap-3">
          <RuntimeTextField
            label="Main Title"
            placeholder={`Entry ${selectedEntryIndex + 1}`}
            value={activeEntry.mainTitle ?? ""}
            onChange={(value) => updateEntryField("mainTitle", value)}
          />
          <RuntimeTextField
            label="Sub Title"
            value={activeEntry.subTitle ?? ""}
            onChange={(value) => updateEntryField("subTitle", value)}
          />
          <RuntimeTextField
            label="Time"
            placeholder="09:00"
            value={activeEntry.time ?? ""}
            onChange={(value) => updateEntryField("time", value)}
          />
          {inputGroups.entry.map((input) => renderInput(input, context))}
        </div>
      </section>
    );
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-t border-slate-800 bg-slate-900 text-slate-100 lg:w-[420px] lg:border-l lg:border-t-0">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 px-4">
        <div>
          <h2 className="text-sm font-bold">Inputs</h2>
          <p className="text-[11px] font-semibold text-slate-500">
            {days.length > 0 ? `${days.length} days` : "Global only"}
          </p>
        </div>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs font-bold text-slate-300 transition hover:border-blue-400 hover:text-white"
          type="button"
          onClick={onReset}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
          <button
            aria-pressed={activeScopeTab === "global"}
            className={cn(
              "h-9 rounded-md text-xs font-bold transition",
              activeScopeTab === "global"
                ? "bg-blue-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white",
            )}
            type="button"
            onClick={() => setActiveScopeTab("global")}
          >
            Global
          </button>
          <button
            aria-pressed={activeScopeTab === "days"}
            className={cn(
              "h-9 rounded-md text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
              activeScopeTab === "days"
                ? "bg-blue-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white",
            )}
            disabled={days.length === 0}
            type="button"
            onClick={() => setActiveScopeTab("days")}
          >
            Days
          </button>
        </div>

        {activeScopeTab === "days" && days.length > 0 ? (
          <section className="mt-4 grid gap-3">
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => (
                <button
                  className={cn(
                    "h-9 rounded-md border text-[11px] font-bold transition",
                    selectedDayId === day.id
                      ? "border-blue-400 bg-blue-500 text-white"
                      : "border-slate-700 bg-slate-950 text-slate-400 hover:border-blue-400 hover:text-white",
                  )}
                  key={day.id}
                  type="button"
                  onClick={() => {
                    setSelectedDayId(day.id);
                    setSelectedEntryIndex(0);
                  }}
                >
                  {day.shortLabel ?? day.label.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  Entries
                </h3>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-blue-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canAddEntry}
                  title={addEntryDisabledReason ?? "Add entry"}
                  type="button"
                  onClick={addEntry}
                >
                  <Plus size={14} />
                </button>
              </div>

              {activeEntries.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-700 bg-slate-950 px-3 py-4 text-center text-xs font-semibold text-slate-500">
                  Empty day
                </div>
              ) : (
                <div className="grid gap-2">
                  {activeEntries.map((entry, entryIndex) => (
                    <div
                      className={cn(
                        "grid gap-2 rounded-md border p-2 transition",
                        selectedEntryIndex === entryIndex
                          ? "border-blue-400 bg-blue-500/10"
                          : "border-slate-800 bg-slate-950",
                      )}
                      key={entry.id}
                    >
                      <button
                        className="flex min-w-0 items-center gap-2 text-left"
                        type="button"
                        onClick={() => setSelectedEntryIndex(entryIndex)}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] font-extrabold text-slate-300">
                          {entryIndex + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-200">
                          {entry.id}
                        </span>
                      </button>

                      <div className="grid grid-cols-[1fr_auto] gap-1.5">
                        <select
                          className="h-8 min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-100 outline-none focus:border-blue-400"
                          value={entry.statusId}
                          disabled={activeEntries.length > 1}
                          onChange={(event) =>
                            updateEntryStatus(
                              entryIndex,
                              event.currentTarget
                                .value as StudioTimetableStatusId,
                            )
                          }
                        >
                          {statusOptions.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-rose-400 hover:text-rose-300"
                          title="Remove entry"
                          type="button"
                          onClick={() => removeEntry(entryIndex)}
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        <div className="mt-4 grid gap-4">
          {activeScopeTab === "global"
            ? renderInputGroup("Global", inputGroups.global)
            : null}

          {activeScopeTab === "days" && selectedDayId
            ? renderInputGroup("Day", inputGroups.day, {
                dayId: selectedDayId,
              })
            : null}

          {activeScopeTab === "days" ? renderEntryInputGroup() : null}

          {activeScopeTab === "global" && inputGroups.global.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-700 bg-slate-950 px-3 py-6 text-center text-xs font-semibold text-slate-500">
              No global inputs
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
