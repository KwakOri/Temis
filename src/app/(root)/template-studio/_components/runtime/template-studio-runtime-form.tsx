"use client";

import { Plus, RotateCcw, Upload } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

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
import { getStudioRuntimeProfileImageCropTarget } from "@/utils/template-studio/runtime-image-crop";
import { convertStudioRuntimeImageFileToPngBlob } from "@/utils/template-studio/runtime-image-blob";
import { MAX_RUNTIME_IMAGE_SOURCE_BYTES } from "@/utils/template-studio/runtime-image-storage-constants";
import {
  deleteStudioRuntimeImage,
  getStudioRuntimeImage,
  putStudioRuntimeImage,
  StudioRuntimeImageQuotaError,
  type StudioRuntimeImageContext,
} from "@/services/browser/templateStudioRuntimeImageStorage";
import {
  getStudioRuntimeGlobalInputGroups,
  getStudioRuntimeOnOffOptionValues,
} from "@/utils/template-studio/runtime-global-input-groups";
import { isStudioTimetableStatusAvailable } from "@/utils/template-studio/timetable-capabilities";
import {
  getLocalizedStudioAddEntryDisabledReason,
  formatStudioRuntimeWeekStartDate,
  getStudioRuntimeCopy,
  getStudioRuntimeDayLabel,
  type StudioRuntimeLocale,
} from "@/utils/template-studio/runtime-i18n";
import {
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
  setStudioTimetableEntryGuerrilla,
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
import { StudioRuntimeImageCropModal } from "./ui/studio-runtime-image-crop-modal";
import { StudioRuntimeTimePicker } from "./ui/studio-runtime-time-picker";
import { StudioRuntimeToggle } from "./ui/studio-runtime-toggle";

interface TemplateStudioRuntimeFormProps {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  setRuntimeValues: React.Dispatch<React.SetStateAction<StudioRuntimeValues>>;
  onReset: () => void;
  onSaveImage?: () => void;
  isSavingImage?: boolean;
  onSaveValues?: () => void;
  isSavingValues?: boolean;
  locale?: StudioRuntimeLocale;
  /**
   * When both are set, uploaded images are stored in this browser's
   * IndexedDB (scoped to templateId+storageOwnerId) instead of the
   * in-memory-only Data URL behavior used by the admin preview. See
   * docs/template-system-integration/12-user-runtime-browser-image-storage.md.
   */
  templateId?: string | null;
  storageOwnerId?: string | null;
}

type RuntimeInputGroups = Record<
  "global" | "day" | "entry",
  StudioInputDefinition[]
>;

interface PendingRuntimeImageCrop {
  imageSrc: string;
  targetHeight: number;
  targetWidth: number;
  onApply: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

const buildLocalImageStateKey = (
  inputId: string,
  context: StudioRuntimeContext,
): string => `${inputId}:${context.dayId ?? ""}:${context.entryIndex ?? ""}`;

const createEntryId = (dayId: StudioTimetableDayId, entryCount: number) => {
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${entryCount + 1}`;

  return `${dayId}-entry-${suffix}`;
};

const RuntimeImageUploadAction = ({
  label,
  localOnlyNotice,
  onFileSelect,
}: {
  label: string;
  localOnlyNotice?: string;
  onFileSelect: (file: File) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="grid gap-1">
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
          onFileSelect(file);
        }}
      />
      {localOnlyNotice ? (
        <p className="text-[11px] leading-snug text-[var(--runtime-fg-muted)]">
          {localOnlyNotice}
        </p>
      ) : null}
    </div>
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
  onSaveImage,
  isSavingImage = false,
  onSaveValues,
  isSavingValues = false,
  locale = "en",
  templateId = null,
  storageOwnerId = null,
}: TemplateStudioRuntimeFormProps) {
  const [pendingImageCrop, setPendingImageCrop] =
    useState<PendingRuntimeImageCrop | null>(null);
  const canUseLocalImageStorage = Boolean(templateId && storageOwnerId);
  const localImageObjectUrlsRef = useRef<Map<string, string>>(new Map());

  const setLocalImageObjectUrl = (
    stateKey: string,
    nextUrl: string | null,
  ) => {
    const previous = localImageObjectUrlsRef.current.get(stateKey);
    if (previous && previous !== nextUrl) {
      URL.revokeObjectURL(previous);
    }
    if (nextUrl) {
      localImageObjectUrlsRef.current.set(stateKey, nextUrl);
    } else {
      localImageObjectUrlsRef.current.delete(stateKey);
    }
  };

  useEffect(() => {
    const urls = localImageObjectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

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
  const weekLabel = formatStudioRuntimeWeekStartDate({
    startDate: weekStartDate,
    fallback: copy.weekNotSet,
  });

  const buildImageStorageContext = (
    context: StudioRuntimeContext,
  ): StudioRuntimeImageContext | null => {
    if (context.dayId && context.entryIndex !== undefined) {
      const entryId = getStudioTimetableEntriesForDay(
        document,
        runtimeValues,
        context.dayId,
      )[context.entryIndex]?.id;
      if (!entryId) return null;
      return { scope: "entry", dayId: context.dayId, entryId };
    }
    if (context.dayId) {
      return { scope: "day", dayId: context.dayId };
    }
    return { scope: "global" };
  };

  // Rehydrate any images the user already saved for this template in this
  // browser. The server never returns image values (see
  // runtime-image-strip.ts), so this is the only source for them.
  useEffect(() => {
    if (!canUseLocalImageStorage || !templateId || !storageOwnerId) return;
    let cancelled = false;

    const imageInputs = Object.values(document.inputs).filter(
      (input): input is StudioInputDefinition & { type: "image" } =>
        input.type === "image",
    );

    const contexts: Array<{
      input: StudioInputDefinition;
      context: StudioRuntimeContext;
    }> = [];

    imageInputs.forEach((input) => {
      if (input.scope === "global") {
        contexts.push({ input, context: {} });
      } else if (input.scope === "day") {
        days.forEach((day) => contexts.push({ input, context: { dayId: day.id } }));
      } else {
        days.forEach((day) => {
          const entries = getStudioTimetableEntriesForDay(
            document,
            runtimeValues,
            day.id,
          );
          entries.forEach((_entry, entryIndex) => {
            contexts.push({ input, context: { dayId: day.id, entryIndex } });
          });
        });
      }
    });

    void (async () => {
      for (const { input, context } of contexts) {
        const imageContext = buildImageStorageContext(context);
        if (!imageContext) continue;

        try {
          const record = await getStudioRuntimeImage({
            userId: storageOwnerId,
            templateId,
            inputId: input.id,
            context: imageContext,
          });
          if (cancelled || !record) continue;

          const objectUrl = URL.createObjectURL(record.blob);
          setLocalImageObjectUrl(
            buildLocalImageStateKey(input.id, context),
            objectUrl,
          );
          setRuntimeValues((currentValues) =>
            setStudioRuntimeInputValue(
              document,
              currentValues,
              input.id,
              objectUrl,
              context,
            ),
          );
        } catch (error) {
          console.error("Failed to restore a local runtime image", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-hydrate when the template/document identity or the signed-in user
    // changes; runtimeValues itself is intentionally excluded to avoid
    // re-running on every keystroke/edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseLocalImageStorage, templateId, storageOwnerId, document]);

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

  const persistLocalRuntimeImage = async (
    input: StudioInputDefinition,
    context: StudioRuntimeContext,
    blob: Blob,
  ) => {
    if (!canUseLocalImageStorage || !templateId || !storageOwnerId) {
      // Admin preview (or any caller without a real user identity) keeps the
      // previous in-memory-only behavior: show the image for this session
      // without touching IndexedDB.
      updateInputValue(input, URL.createObjectURL(blob), context);
      return;
    }

    const imageContext = buildImageStorageContext(context);
    if (!imageContext) return;

    try {
      const record = await putStudioRuntimeImage(
        { userId: storageOwnerId, templateId, inputId: input.id, context: imageContext },
        blob,
      );
      const objectUrl = URL.createObjectURL(record.blob);
      setLocalImageObjectUrl(
        buildLocalImageStateKey(input.id, context),
        objectUrl,
      );
      updateInputValue(input, objectUrl, context);
    } catch (error) {
      const message =
        error instanceof StudioRuntimeImageQuotaError
          ? copy.imageQuotaExceeded
          : copy.imageStorageFailed;
      console.error("Failed to store a runtime image locally", error);
      window.alert(message);
    }
  };

  const uploadRuntimeImage = (
    input: StudioInputDefinition,
    file: File,
    context: StudioRuntimeContext = {},
  ) => {
    if (input.type !== "image") return;

    if (file.size > MAX_RUNTIME_IMAGE_SOURCE_BYTES) {
      window.alert(copy.imageTooLarge);
      return;
    }

    const cropTarget = getStudioRuntimeProfileImageCropTarget(
      document,
      input.id,
    );

    if (!cropTarget) {
      // No crop UI for this input, but the source is still normalized to a
      // static PNG Blob — never stored as the raw source File/Data URL.
      void convertStudioRuntimeImageFileToPngBlob(file)
        .then((blob) => {
          if (blob.size > MAX_RUNTIME_IMAGE_SOURCE_BYTES) {
            window.alert(copy.imageTooLarge);
            return;
          }
          return persistLocalRuntimeImage(input, context, blob);
        })
        .catch((error) => {
          console.error("Template Studio runtime image conversion failed", error);
          window.alert(copy.cropFailed);
        });
      return;
    }

    const sourceObjectUrl = URL.createObjectURL(file);
    setPendingImageCrop({
      imageSrc: sourceObjectUrl,
      targetHeight: cropTarget.height,
      targetWidth: cropTarget.width,
      onApply: (croppedImageBlob) => {
        URL.revokeObjectURL(sourceObjectUrl);
        void persistLocalRuntimeImage(input, context, croppedImageBlob);
      },
      onCancel: () => URL.revokeObjectURL(sourceObjectUrl),
    });
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
    if (canUseLocalImageStorage && templateId && storageOwnerId) {
      const entryId = getStudioTimetableEntriesForDay(
        document,
        runtimeValues,
        dayId,
      )[entryIndex]?.id;

      if (entryId) {
        Object.values(document.inputs)
          .filter((input) => input.type === "image" && input.scope === "entry")
          .forEach((input) => {
            setLocalImageObjectUrl(
              buildLocalImageStateKey(input.id, { dayId, entryIndex }),
              null,
            );
            void deleteStudioRuntimeImage({
              userId: storageOwnerId,
              templateId,
              inputId: input.id,
              context: { scope: "entry", dayId, entryId },
            }).catch((error) =>
              console.error("Failed to delete a local runtime image", error),
            );
          });
      }
    }

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

  const updateEntryGuerrilla = (
    dayId: StudioTimetableDayId,
    entryIndex: number,
    isGuerrilla: boolean,
  ) => {
    setRuntimeValues((currentValues) =>
      setStudioTimetableEntryGuerrilla(
        document,
        currentValues,
        dayId,
        entryIndex,
        isGuerrilla,
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
            localOnlyNotice={
              canUseLocalImageStorage ? copy.imageLocalOnlyNotice : undefined
            }
            onFileSelect={(file) => uploadRuntimeImage(input, file, context)}
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
            localOnlyNotice={
              canUseLocalImageStorage ? copy.imageLocalOnlyNotice : undefined
            }
            onFileSelect={(file) => uploadRuntimeImage(input, file, context)}
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
    const day = timetable?.days[dayId];
    const dayLabel = getStudioRuntimeDayLabel({
      locale,
      dayId,
      width: "long",
      fallback: day?.label ?? dayId,
    });
    const guerrillaAriaLabel = `${dayLabel} ${copy.guerrilla}${
      entryCount > 1 ? ` ${entryIndex + 1}` : ""
    }`;

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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <StudioRuntimeTimePicker
            disabled={Boolean(entry.isGuerrilla)}
            hourLabel={copy.hour}
            label={copy.time}
            minuteLabel={copy.minute}
            value={entry.time || "09:00"}
            onValueChange={(value) =>
              updateEntryField(dayId, entryIndex, "time", value)
            }
          />
          <StudioRuntimeToggle
            ariaLabel={guerrillaAriaLabel}
            checked={Boolean(entry.isGuerrilla)}
            className="h-10"
            label={copy.guerrilla}
            title={`${copy.guerrilla} ${entry.isGuerrilla ? "ON" : "OFF"}`}
            onCheckedChange={(isGuerrilla) =>
              updateEntryGuerrilla(dayId, entryIndex, isGuerrilla)
            }
          />
        </div>
        <StudioRuntimeField
          control="input"
          label={copy.subTitle}
          placeholder="서브타이틀 적는 곳"
          value={entry.subTitle ?? ""}
          onValueChange={(value) =>
            updateEntryField(dayId, entryIndex, "subTitle", value)
          }
        />
        <StudioRuntimeField
          control="textarea"
          label={copy.mainTitle}
          placeholder={"메인타이틀\n적는 곳"}
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
    <>
      <aside
        className="flex h-[44vh] min-h-[320px] w-full shrink-0 flex-col border-t-2 border-[var(--runtime-border)] bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)] md:h-full md:max-w-[400px] md:min-w-[300px] md:w-1/4 md:border-l-2 md:border-t-0"
        data-testid="template-studio-runtime-form"
      >
      <div className="flex min-h-0 flex-1 flex-col">
        <StudioRuntimeFormTabs
          ariaLabel={copy.formSections}
          tabs={[{ id: "basic", label: copy.basic }]}
          value="basic"
          onValueChange={() => undefined}
        />

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--runtime-form-bg)] p-4">
          <div className="grid gap-4">
            <StudioRuntimeSectionTitle title={copy.formTitle} />
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

            <StudioRuntimeSectionTitle title={copy.weeklyTimetable} />

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
                          runtimeValues.timetable.offlineMemoByDay?.[day.id] ??
                          ""
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

                    {addEntryDisabledReason === null ? (
                      <StudioRuntimeActionButton
                        fullWidth
                        aria-label={copy.addEntryTo(longDayLabel)}
                        size="compact"
                        title={copy.addEntryTo(longDayLabel)}
                        variant="primary"
                        onClick={() => addEntry(day.id, entries)}
                      >
                        <Plus size={16} />
                        {copy.addEntry}
                      </StudioRuntimeActionButton>
                    ) : null}
                  </StudioRuntimeDayCard>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--runtime-border)] bg-[var(--runtime-form-bg)] p-4">
        <div className="flex gap-2">
          {onSaveValues ? (
            <StudioRuntimeActionButton
              fullWidth
              className="h-12 rounded-md text-base font-bold"
              disabled={isSavingValues}
              variant="primary"
              onClick={onSaveValues}
            >
              {isSavingValues ? copy.saving : copy.save}
            </StudioRuntimeActionButton>
          ) : null}
          <StudioRuntimeActionButton
            fullWidth
            className="h-12 rounded-md text-base font-bold"
            disabled={!onSaveImage || isSavingImage}
            variant={onSaveValues ? "secondary" : undefined}
            onClick={onSaveImage}
          >
            {isSavingImage ? copy.savingImage : copy.saveImage}
          </StudioRuntimeActionButton>
          <StudioRuntimeActionButton
            className="h-12 shrink-0 rounded-md px-4 text-base font-bold"
            variant="ghost"
            onClick={onReset}
          >
            <RotateCcw size={18} />
          </StudioRuntimeActionButton>
        </div>
      </div>
      </aside>
      {pendingImageCrop ? (
        <StudioRuntimeImageCropModal
          imageSrc={pendingImageCrop.imageSrc}
          locale={locale}
          targetHeight={pendingImageCrop.targetHeight}
          targetWidth={pendingImageCrop.targetWidth}
          onCancel={() => {
            pendingImageCrop.onCancel();
            setPendingImageCrop(null);
          }}
          onApply={(croppedImageBlob) => {
            pendingImageCrop.onApply(croppedImageBlob);
            setPendingImageCrop(null);
          }}
        />
      ) : null}
    </>
  );
}
