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
import {
  getStudioRuntimeGlobalInputGroups,
  getStudioRuntimeOnOffOptionValues,
} from "@/utils/template-studio/runtime-global-input-groups";
import { isStudioTimetableStatusAvailable } from "@/utils/template-studio/timetable-capabilities";
import {
  getLocalizedStudioAddEntryDisabledReason,
  formatStudioRuntimeWeekRange,
  getStudioRuntimeCopy,
  getStudioRuntimeDayLabel,
  type StudioRuntimeLocale,
} from "@/utils/template-studio/runtime-i18n";
import {
  getStudioRuntimeWeekEndDate,
  getStudioRuntimeWeekStartDate,
  shiftStudioRuntimeWeek,
} from "@/utils/template-studio/runtime-week";
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
import { StudioRuntimeGlobalInputCard } from "./composition/studio-runtime-global-input-card";
import { StudioRuntimeSectionTitle } from "./composition/studio-runtime-section-title";
import { StudioRuntimeWeekSelector } from "./composition/studio-runtime-week-selector";
import { StudioRuntimeActionButton } from "./ui/studio-runtime-action-button";
import { StudioRuntimeCard } from "./ui/studio-runtime-card";
import { StudioRuntimeEmptyState } from "./ui/studio-runtime-empty-state";
import { StudioRuntimeField } from "./ui/studio-runtime-field";

interface TemplateStudioRuntimeFormProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  setRuntimeValues: React.Dispatch<React.SetStateAction<StudioRuntimeValues>>;
  onReset: () => void;
  locale?: StudioRuntimeLocale;
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
  label,
  onValueChange,
}: {
  label: string;
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
        {label}
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
  locale = "en",
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
  const globalInputGroups = useMemo(
    () => getStudioRuntimeGlobalInputGroups(document),
    [document],
  );
  const canUseOfflineMemo = isStudioTimetableStatusAvailable(
    timetable,
    "offlineMemo",
  );
  const copy = getStudioRuntimeCopy(locale);
  const weekStartDate = getStudioRuntimeWeekStartDate(document, runtimeValues);
  const weekEndDate = getStudioRuntimeWeekEndDate(document, runtimeValues);
  const weekLabel = formatStudioRuntimeWeekRange({
    locale,
    startDate: weekStartDate,
    endDate: weekEndDate,
    fallback: copy.weekNotSet,
  });

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

  const shiftWeek = (weekDelta: number) => {
    setRuntimeValues((currentValues) =>
      shiftStudioRuntimeWeek(document, currentValues, weekDelta),
    );
  };

  const renderInput = (
    input: StudioInputDefinition,
    context: StudioRuntimeContext = {},
    options: { hideLabel?: boolean; imageUploadOnly?: boolean } = {},
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
            hideLabel={options.hideLabel}
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
          hideLabel={options.hideLabel}
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
      if (options.imageUploadOnly) {
        return (
          <RuntimeImageUploadAction
            key={key}
            label={copy.upload}
            onValueChange={(nextValue) =>
              updateInputValue(input, nextValue, context)
            }
          />
        );
      }

      return (
        <div className="grid gap-2" key={key}>
          <StudioRuntimeField
            control="input"
            hideLabel={options.hideLabel}
            label={input.label}
            placeholder={input.placeholder}
            value={value}
            onValueChange={(nextValue) =>
              updateInputValue(input, nextValue, context)
            }
          />
          <RuntimeImageUploadAction
            label={copy.upload}
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
        hideLabel={options.hideLabel}
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

  const renderGlobalInputCards = () =>
    globalInputGroups.map((group) => {
      const toggleInput = group.toggleInput;
      const onOffValues = toggleInput
        ? getStudioRuntimeOnOffOptionValues(toggleInput)
        : null;
      const toggleValue = toggleInput
        ? getStudioRuntimeInputValue(toggleInput, runtimeValues)
        : null;
      const enabled =
        toggleInput && onOffValues
          ? toggleValue === onOffValues.onValue
          : undefined;
      const hideContentLabels = group.contentInputs.length === 1;

      return (
        <StudioRuntimeGlobalInputCard
          enabled={enabled}
          key={group.id}
          label={group.label}
          toggleAriaLabel={toggleInput?.label}
          onEnabledChange={
            toggleInput && onOffValues
              ? (nextEnabled) =>
                  updateInputValue(
                    toggleInput,
                    nextEnabled ? onOffValues.onValue : onOffValues.offValue,
                  )
              : undefined
          }
        >
          {group.contentInputs.map((input) =>
            renderInput(
              input,
              {},
              {
                hideLabel: hideContentLabels,
                imageUploadOnly: input.type === "image",
              },
            ),
          )}
        </StudioRuntimeGlobalInputCard>
      );
    });

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
        entryLabel={copy.entry}
        index={entryIndex}
        key={entry.id}
        removable={entryCount > 1}
        removeLabel={copy.removeEntry(entryIndex + 1)}
        showIndex={entryCount > 1}
        onRemove={() => removeEntry(dayId, entryIndex)}
      >
        <StudioRuntimeField
          control="input"
          label={copy.time}
          placeholder="09:00"
          value={entry.time ?? ""}
          onValueChange={(value) =>
            updateEntryField(dayId, entryIndex, "time", value)
          }
        />
        <StudioRuntimeField
          control="input"
          label={copy.subTitle}
          value={entry.subTitle ?? ""}
          onValueChange={(value) =>
            updateEntryField(dayId, entryIndex, "subTitle", value)
          }
        />
        <StudioRuntimeField
          control="textarea"
          label={copy.mainTitle}
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
          <h1 className="text-sm font-extrabold">{copy.formTitle}</h1>
          <p className="text-[11px] font-semibold text-[var(--runtime-fg-subtle)]">
            {days.length > 0
              ? copy.dayCount(days.length)
              : copy.globalSettingsOnly}
          </p>
        </div>
        <StudioRuntimeActionButton
          size="compact"
          variant="secondary"
          onClick={onReset}
        >
          <RotateCcw size={14} />
          {copy.reset}
        </StudioRuntimeActionButton>
      </div>

      <StudioRuntimeFormTabs
        ariaLabel={copy.formSections}
        tabs={[{ id: "basic", label: copy.basic }]}
        value="basic"
        onValueChange={() => undefined}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          <StudioRuntimeSectionTitle
            description={copy.globalSettingsDescription}
            title={copy.globalSettings}
          />
          <StudioRuntimeWeekSelector
            disabled={!weekStartDate}
            label={copy.week}
            nextLabel={copy.nextWeek}
            previousLabel={copy.previousWeek}
            value={weekLabel}
            onNext={() => shiftWeek(1)}
            onPrevious={() => shiftWeek(-1)}
          />
          {renderGlobalInputCards()}
          {globalInputGroups.length === 0 ? (
            <StudioRuntimeEmptyState compact>
              {copy.noGlobalInputs}
            </StudioRuntimeEmptyState>
          ) : null}

          <StudioRuntimeSectionTitle
            className="pt-2"
            description={copy.weeklyTimetableDescription}
            title={copy.weeklyTimetable}
          />

          {days.length === 0 ? (
            <StudioRuntimeEmptyState>
              {copy.noTimetableDays}
            </StudioRuntimeEmptyState>
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
              const localizedAddEntryDisabledReason =
                getLocalizedStudioAddEntryDisabledReason(
                  copy,
                  addEntryDisabledReason,
                );
              const shortDayLabel = getStudioRuntimeDayLabel({
                locale,
                dayId: day.id,
                width: "short",
                fallback: day.shortLabel ?? day.label,
              });
              const longDayLabel = getStudioRuntimeDayLabel({
                locale,
                dayId: day.id,
                width: "long",
                fallback: day.label,
              });

              return (
                <StudioRuntimeDayCard
                  dayId={day.id}
                  key={day.id}
                  label={shortDayLabel}
                  memoAvailable={canUseOfflineMemo && entries.length > 0}
                  memoDescription={copy.memoDescription}
                  memoEnabled={status.memoEnabled}
                  memoLabel={copy.memo}
                  memoToggleTitle={copy.toggleOfflineMemo}
                  memoUnavailableTitle={copy.offlineMemoUnavailable}
                  multi={status.multi}
                  multiLabel={copy.multi}
                  online={status.online}
                  onlineAriaLabel={`${longDayLabel} ${copy.online}`}
                  settings={renderInputGroup(
                    copy.daySettings,
                    inputGroups.day,
                    {
                      dayId: day.id,
                    },
                  )}
                  offlineContent={
                    <StudioRuntimeField
                      control="textarea"
                      label={copy.offlineMemo}
                      placeholder={copy.offlineMemoPlaceholder}
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
                      {copy.noEntries}
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
                    aria-label={copy.addEntryTo(longDayLabel)}
                    disabled={addEntryDisabledReason !== null}
                    size="compact"
                    title={
                      localizedAddEntryDisabledReason ??
                      copy.addEntryTo(longDayLabel)
                    }
                    variant="primary"
                    onClick={() => addEntry(day.id, entries)}
                  >
                    <Plus size={16} />
                    {copy.addEntry}
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
