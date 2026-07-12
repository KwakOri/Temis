"use client";

import { Plus, RotateCcw, Upload } from "lucide-react";
import React, { useMemo, useRef } from "react";

import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableDayId,
  StudioTimetableRuntimeEntry,
} from "@/types/template-studio";
import {
  getStudioRuntimeInputValue,
  setStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import { isStudioTimetableStatusAvailable } from "@/utils/template-studio/timetable-capabilities";
import {
  addStudioTimetableEntry,
  getStudioTimetableAddEntryDisabledReason,
  getStudioTimetableEntriesForDay,
  removeStudioTimetableEntry,
  setStudioTimetableDayBaseStatus,
  setStudioTimetableEntryField,
  setStudioTimetableEntryStatus,
  setStudioTimetableOfflineMemo,
  type StudioTimetableEditableEntryField,
} from "@/utils/template-studio/timetable-runtime";
import { StudioRuntimeDayCard } from "./composition/studio-runtime-day-card";
import { StudioRuntimeEntryCard } from "./composition/studio-runtime-entry-card";
import { StudioRuntimeFormTabs } from "./composition/studio-runtime-form-tabs";
import { StudioRuntimeSectionTitle } from "./composition/studio-runtime-section-title";
import { StudioRuntimeWeekSummary } from "./composition/studio-runtime-week-summary";
import { StudioRuntimeActionButton } from "./ui/studio-runtime-action-button";
import { StudioRuntimeCard } from "./ui/studio-runtime-card";
import { StudioRuntimeEmptyState } from "./ui/studio-runtime-empty-state";
import { StudioRuntimeField } from "./ui/studio-runtime-field";

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

const createEntryId = (dayId: StudioTimetableDayId, entryCount: number) => {
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${entryCount + 1}`;

  return `${dayId}-entry-${suffix}`;
};

const RuntimeImageUploadAction = ({
  onValueChange,
}: {
  onValueChange: (value: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <StudioRuntimeActionButton
        fullWidth
        size="compact"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} />
        Upload
      </StudioRuntimeActionButton>
      <input
        ref={inputRef}
        accept="image/*"
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => onValueChange(String(reader.result ?? ""));
          reader.readAsDataURL(file);
        }}
      />
    </>
  );
};

const getDayStatus = (
  document: StudioTemplateDocument,
  entries: StudioTimetableRuntimeEntry[],
) => {
  const timetable = document.domains?.timetable;
  const statusId =
    entries.length > 1
      ? "multi"
      : (entries[0]?.statusId ?? timetable?.defaultEntryStatusId ?? "online");
  const baseStatus =
    timetable?.statuses[statusId]?.baseStatus ??
    (statusId === "offlineMemo" ? "offline" : "online");

  return {
    statusId,
    online: baseStatus === "online",
    memoEnabled: statusId === "offlineMemo",
    multi: entries.length > 1,
  };
};

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
  const canUseOfflineMemo = isStudioTimetableStatusAvailable(
    timetable,
    "offlineMemo",
  );

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

  const addEntry = (
    dayId: StudioTimetableDayId,
    entries: StudioTimetableRuntimeEntry[],
  ) => {
    if (
      getStudioTimetableAddEntryDisabledReason(
        document,
        runtimeValues,
        dayId,
      ) !== null
    ) {
      return;
    }

    const nextEntryId = createEntryId(dayId, entries.length);
    setRuntimeValues((currentValues) =>
      addStudioTimetableEntry(document, currentValues, dayId, nextEntryId),
    );
  };

  const removeEntry = (dayId: StudioTimetableDayId, entryIndex: number) => {
    setRuntimeValues((currentValues) =>
      removeStudioTimetableEntry(document, currentValues, dayId, entryIndex),
    );
  };

  const updateDayBaseStatus = (
    dayId: StudioTimetableDayId,
    online: boolean,
  ) => {
    setRuntimeValues((currentValues) =>
      setStudioTimetableDayBaseStatus(
        document,
        currentValues,
        dayId,
        online ? "online" : "offline",
      ),
    );
  };

  const toggleOfflineMemo = (dayId: StudioTimetableDayId, enabled: boolean) => {
    if (!canUseOfflineMemo) return;

    setRuntimeValues((currentValues) =>
      setStudioTimetableEntryStatus(
        document,
        currentValues,
        dayId,
        0,
        enabled ? "offlineMemo" : "offline",
      ),
    );
  };

  const updateEntryField = (
    dayId: StudioTimetableDayId,
    entryIndex: number,
    field: StudioTimetableEditableEntryField,
    value: string,
  ) => {
    setRuntimeValues((currentValues) =>
      setStudioTimetableEntryField(
        document,
        currentValues,
        dayId,
        entryIndex,
        field,
        value,
      ),
    );
  };

  const updateOfflineMemo = (dayId: StudioTimetableDayId, value: string) => {
    setRuntimeValues((currentValues) =>
      setStudioTimetableOfflineMemo(currentValues, dayId, value),
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
          <StudioRuntimeField
            control="textarea"
            key={key}
            label={input.label}
            placeholder={input.placeholder}
            rows={input.minRows ?? 4}
            value={value}
            onValueChange={(nextValue) =>
              updateInputValue(input, nextValue, context)
            }
          />
        );
      }

      return (
        <StudioRuntimeField
          control="input"
          key={key}
          label={input.label}
          placeholder={input.placeholder}
          value={value}
          onValueChange={(nextValue) =>
            updateInputValue(input, nextValue, context)
          }
        />
      );
    }

    if (input.type === "image") {
      return (
        <div className="grid gap-2" key={key}>
          <StudioRuntimeField
            control="input"
            label={input.label}
            placeholder={input.placeholder}
            value={value}
            onValueChange={(nextValue) =>
              updateInputValue(input, nextValue, context)
            }
          />
          <RuntimeImageUploadAction
            onValueChange={(nextValue) =>
              updateInputValue(input, nextValue, context)
            }
          />
        </div>
      );
    }

    return (
      <StudioRuntimeField
        control="select"
        key={key}
        label={input.label}
        options={input.options}
        value={value}
        onValueChange={(nextValue) =>
          updateInputValue(input, nextValue, context)
        }
      />
    );
  };

  const renderInputGroup = (
    title: string,
    inputs: StudioInputDefinition[],
    context: StudioRuntimeContext = {},
  ) => {
    if (inputs.length === 0) return null;

    return (
      <StudioRuntimeCard className="grid gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--runtime-fg-muted)]">
          {title}
        </h3>
        <div className="grid gap-3">
          {inputs.map((input) => renderInput(input, context))}
        </div>
      </StudioRuntimeCard>
    );
  };

  const renderEntryCard = (
    dayId: StudioTimetableDayId,
    entry: StudioTimetableRuntimeEntry,
    entryIndex: number,
    entryCount: number,
  ) => {
    const context: StudioRuntimeContext = { dayId, entryIndex };

    return (
      <StudioRuntimeEntryCard
        index={entryIndex}
        key={entry.id}
        removable={entryCount > 1}
        showIndex={entryCount > 1}
        onRemove={() => removeEntry(dayId, entryIndex)}
      >
        <StudioRuntimeField
          control="input"
          label="Time"
          placeholder="09:00"
          value={entry.time ?? ""}
          onValueChange={(value) =>
            updateEntryField(dayId, entryIndex, "time", value)
          }
        />
        <StudioRuntimeField
          control="input"
          label="Sub Title"
          value={entry.subTitle ?? ""}
          onValueChange={(value) =>
            updateEntryField(dayId, entryIndex, "subTitle", value)
          }
        />
        <StudioRuntimeField
          control="textarea"
          label="Main Title"
          placeholder={`Entry ${entryIndex + 1}`}
          rows={3}
          value={entry.mainTitle ?? ""}
          onValueChange={(value) =>
            updateEntryField(dayId, entryIndex, "mainTitle", value)
          }
        />
        {inputGroups.entry.map((input) => renderInput(input, context))}
      </StudioRuntimeEntryCard>
    );
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-t border-[var(--runtime-border)] bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)] lg:w-[420px] lg:border-l lg:border-t-0">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--runtime-border)] px-4">
        <div>
          <h1 className="text-sm font-extrabold">Timetable</h1>
          <p className="text-[11px] font-semibold text-[var(--runtime-fg-subtle)]">
            {days.length > 0 ? `${days.length} days` : "Global settings"}
          </p>
        </div>
        <StudioRuntimeActionButton
          size="compact"
          variant="secondary"
          onClick={onReset}
        >
          <RotateCcw size={14} />
          Reset
        </StudioRuntimeActionButton>
      </div>

      <StudioRuntimeFormTabs
        ariaLabel="Runtime form sections"
        tabs={[{ id: "basic", label: "Basic" }]}
        value="basic"
        onValueChange={() => undefined}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          <StudioRuntimeSectionTitle
            description="Shared values used by the whole timetable"
            title="Global settings"
          />
          {timetable?.week ? (
            <StudioRuntimeWeekSummary
              endDate={timetable.week.endDate}
              startDate={timetable.week.startDate}
            />
          ) : null}
          {renderInputGroup("Global", inputGroups.global)}
          {inputGroups.global.length === 0 ? (
            <StudioRuntimeEmptyState compact>
              No global inputs
            </StudioRuntimeEmptyState>
          ) : null}

          <StudioRuntimeSectionTitle
            className="pt-2"
            description="Edit each day without changing selection"
            title="Weekly timetable"
          />

          {days.length === 0 ? (
            <StudioRuntimeEmptyState>No timetable days</StudioRuntimeEmptyState>
          ) : (
            days.map((day) => {
              const entries = getStudioTimetableEntriesForDay(
                document,
                runtimeValues,
                day.id,
              );
              const status = getDayStatus(document, entries);
              const addEntryDisabledReason =
                getStudioTimetableAddEntryDisabledReason(
                  document,
                  runtimeValues,
                  day.id,
                );

              return (
                <StudioRuntimeDayCard
                  dayId={day.id}
                  key={day.id}
                  label={day.shortLabel ?? day.label}
                  memoAvailable={canUseOfflineMemo && entries.length > 0}
                  memoEnabled={status.memoEnabled}
                  multi={status.multi}
                  online={status.online}
                  settings={renderInputGroup("Day", inputGroups.day, {
                    dayId: day.id,
                  })}
                  offlineContent={
                    <StudioRuntimeField
                      control="textarea"
                      label="Offline Memo"
                      placeholder="Enter offline memo"
                      rows={4}
                      value={
                        runtimeValues.timetable.offlineMemoByDay?.[day.id] ?? ""
                      }
                      onValueChange={(value) =>
                        updateOfflineMemo(day.id, value)
                      }
                    />
                  }
                  onMemoEnabledChange={(enabled) =>
                    toggleOfflineMemo(day.id, enabled)
                  }
                  onOnlineChange={(online) =>
                    updateDayBaseStatus(day.id, online)
                  }
                >
                  {entries.length === 0 ? (
                    <StudioRuntimeEmptyState compact>
                      No entries
                    </StudioRuntimeEmptyState>
                  ) : (
                    entries.map((entry, entryIndex) =>
                      renderEntryCard(
                        day.id,
                        entry,
                        entryIndex,
                        entries.length,
                      ),
                    )
                  )}

                  <StudioRuntimeActionButton
                    fullWidth
                    aria-label={`Add entry to ${day.label}`}
                    disabled={addEntryDisabledReason !== null}
                    title={
                      addEntryDisabledReason ?? `Add entry to ${day.label}`
                    }
                    variant="primary"
                    onClick={() => addEntry(day.id, entries)}
                  >
                    <Plus size={16} />
                    Add entry
                  </StudioRuntimeActionButton>
                </StudioRuntimeDayCard>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
