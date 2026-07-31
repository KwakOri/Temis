"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import {
  StudioFontWeightField,
  StudioLineBreakField,
  StudioNumberField,
  StudioTextAlignmentField,
} from "@/components/studio/inspector/studio-inspector-fields";
import { cn } from "@/lib/utils";
import type {
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import {
  STUDIO_WEEK_DATE_FORMAT_PRESETS,
  STUDIO_WEEK_DATE_TEMPLATE_TOKENS,
} from "@/utils/template-studio/date-template";
import {
  getStudioTextAlignment,
  getStudioTextJustifyContent,
} from "@/utils/template-studio/node-style-commands";
import {
  setStudioTimetableObjectMaskSlot,
  type StudioSemanticMaskShape,
} from "@/utils/template-studio/semantic-slots";
import { setStudioTimetableObjectActiveVariantValue } from "@/utils/template-studio/timetable-composition";
import {
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
  getStudioTextWrapMode,
} from "@/utils/template-studio/text-wrap";
import {
  getStudioMaskRadiusFromShape,
  getStudioMaskShapeFromRadius,
  getStudioStyleString,
  getStudioTimetableObjectMaskShape,
  getStudioWeekDatePreset,
  getStudioWeekDatePresetValue,
  getStudioWeekDateTemplateValue,
} from "@/utils/template-studio/timetable-object-style";
import { getStudioFontWeightOptions } from "@/utils/template-studio/web-fonts";

import { StudioHexColorPicker } from "./studio-hex-color-picker";

/** 시간표 객체 하나를 바꾼다. 문서 갱신과 이력은 호출한 쪽이 소유한다. */
export type StudioTimetableObjectUpdater = (
  recipe: (object: StudioTimetableCompositionObject) => void,
) => void;

const SELECT_CLASS =
  "h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]";

const FIELD_LABEL_CLASS =
  "grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]";

export interface StudioTimetableObjectControlProps {
  object: StudioTimetableCompositionObject;
  onUpdateObject: StudioTimetableObjectUpdater;
}

/**
 * 주간 날짜 표기 편집.
 *
 * 프리셋을 고르면 그 프리셋의 틀을 함께 적어 둔다. 틀을 직접 고치면 형식이
 * `custom`으로 바뀐다. 틀만 남기고 형식을 그대로 두면 화면과 결과가 어긋난다.
 */
export function StudioTimetableWeekDatesFormatControls({
  object,
  onUpdateObject,
}: StudioTimetableObjectControlProps) {
  const templateValue = getStudioWeekDateTemplateValue(object);
  const presetValue = getStudioWeekDatePresetValue(object);

  const updateTemplate = (dateRangeTemplate: string) => {
    onUpdateObject((currentObject) => {
      currentObject.style = {
        ...currentObject.style,
        dateRangeFormat: "custom",
        dateRangeTemplate,
      };
    });
  };

  return (
    <div className="grid gap-2">
      <label className={FIELD_LABEL_CLASS}>
        <span>Date Format</span>
        <select
          className={SELECT_CLASS}
          value={presetValue}
          onChange={(event) => {
            const dateRangeFormat = event.currentTarget.value;
            const preset = getStudioWeekDatePreset(dateRangeFormat);
            onUpdateObject((currentObject) => {
              currentObject.style = {
                ...currentObject.style,
                dateRangeFormat,
                dateRangeTemplate:
                  preset?.template ??
                  getStudioWeekDateTemplateValue(currentObject),
              };
            });
          }}
        >
          {STUDIO_WEEK_DATE_FORMAT_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom template</option>
        </select>
      </label>

      <label className={FIELD_LABEL_CLASS}>
        <span>Template</span>
        <textarea
          className="min-h-20 resize-y rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 py-2 font-mono text-[11px] font-semibold leading-relaxed text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          spellCheck={false}
          value={templateValue}
          onChange={(event) => updateTemplate(event.currentTarget.value)}
        />
      </label>

      <div className="grid grid-cols-2 gap-1.5">
        {STUDIO_WEEK_DATE_TEMPLATE_TOKENS.map((token) => (
          <button
            className="h-7 rounded-md border border-[var(--field-border)] bg-[var(--field)] px-1.5 font-mono text-[10px] font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            key={token}
            title={token}
            type="button"
            onClick={() => {
              // 이미 적은 틀 뒤에 띄어쓰기를 하나 두고 붙인다.
              const separator = templateValue.trim().length > 0 ? " " : "";
              updateTemplate(`${templateValue}${separator}${token}`);
            }}
          >
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 이미지를 감출 때 위치 선택도 함께 잠근다. */
export function StudioTimetableArtistProfileTextAssetLayoutControls({
  object,
  onUpdateObject,
}: StudioTimetableObjectControlProps) {
  const assetMode = getStudioStyleString(object.style, "assetMode", "visible");
  const assetPosition = getStudioStyleString(
    object.style,
    "assetPosition",
    "left",
  );

  const updateStyle = (key: string, value: string | number) => {
    onUpdateObject((currentObject) => {
      currentObject.style = { ...currentObject.style, [key]: value };
    });
  };

  return (
    <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] p-2">
      <label className={FIELD_LABEL_CLASS}>
        <span>Asset Mode</span>
        <select
          className={SELECT_CLASS}
          value={assetMode}
          onChange={(event) =>
            updateStyle("assetMode", event.currentTarget.value)
          }
        >
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>
      <label className={FIELD_LABEL_CLASS}>
        <span>Asset Position</span>
        <select
          className={SELECT_CLASS}
          disabled={assetMode === "hidden"}
          value={assetPosition}
          onChange={(event) =>
            updateStyle("assetPosition", event.currentTarget.value)
          }
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <StudioNumberField
          label="Asset Size"
          value={Number(object.style.assetSize ?? 160)}
          onChange={(value) => updateStyle("assetSize", Math.max(24, value))}
        />
        <StudioNumberField
          label="Asset Gap"
          value={Number(object.style.assetGap ?? 32)}
          onChange={(value) => updateStyle("assetGap", Math.max(0, value))}
        />
      </div>
    </div>
  );
}

/**
 * 마스크 모양 편집.
 *
 * 문서에는 모양 대신 반지름만 남는다. 그래서 모양을 고르면 그 모양에 맞는
 * 반지름을 쓰고, 반지름을 직접 바꾸면 그 값으로 모양을 다시 읽는다.
 */
export function StudioTimetableProfileMaskControls({
  object,
  onUpdateObject,
}: StudioTimetableObjectControlProps) {
  const radius =
    typeof object.style.borderRadius === "number"
      ? object.style.borderRadius
      : 0;
  const shape = getStudioTimetableObjectMaskShape(object);

  return (
    <div className="grid gap-2">
      <label className={FIELD_LABEL_CLASS}>
        <span>Mask</span>
        <select
          className={SELECT_CLASS}
          value={shape}
          onChange={(event) => {
            const nextShape = event.currentTarget
              .value as StudioSemanticMaskShape;
            onUpdateObject((currentObject) => {
              setStudioTimetableObjectMaskSlot(
                currentObject,
                nextShape,
                getStudioMaskRadiusFromShape(nextShape),
              );
            });
          }}
        >
          <option value="rectangle">Rectangle</option>
          <option value="rounded">Rounded</option>
          <option value="circle">Circle</option>
        </select>
      </label>
      <StudioNumberField
        label="Radius"
        value={radius}
        onChange={(value) =>
          onUpdateObject((currentObject) => {
            setStudioTimetableObjectMaskSlot(
              currentObject,
              getStudioMaskShapeFromRadius(value),
              value,
            );
          })
        }
      />
    </div>
  );
}

export interface StudioTimetableTextTypographyControlsProps
  extends StudioTimetableObjectControlProps {
  /** 폰트 굵기 후보를 찾는 데 쓴다. */
  document: StudioTemplateDocument;
  fontFamilies: string[];
}

/**
 * 시간표 텍스트 객체의 글꼴 편집.
 *
 * 텍스트가 아닌 객체가 넘어오면 style을 건드리지 않는다. 정렬을 바꿀 때는
 * `justifyContent`도 함께 맞춘다. 두 값이 어긋나면 미리보기와 결과가 달라진다.
 */
export function StudioTimetableTextTypographyControls({
  object,
  onUpdateObject,
  document,
  fontFamilies,
}: StudioTimetableTextTypographyControlsProps) {
  const styleRecord = object.style;
  const fontFamily = String(styleRecord.fontFamily ?? "Inter");
  const fontWeightOptions = getStudioFontWeightOptions(document, fontFamily);

  const updateTextStyle = (
    key: string,
    value: string | number | undefined,
  ) => {
    onUpdateObject((currentObject) => {
      if (
        currentObject.kind !== "text" &&
        currentObject.kind !== "flexibleText"
      ) {
        return;
      }
      currentObject.style = { ...currentObject.style, [key]: value };
    });
  };

  return (
    <div className="grid gap-2">
      <label className={FIELD_LABEL_CLASS}>
        <span>Font</span>
        <select
          className={SELECT_CLASS}
          value={fontFamily}
          onChange={(event) =>
            updateTextStyle("fontFamily", event.currentTarget.value)
          }
        >
          {fontFamilies.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-[1.3fr_1fr] gap-2">
        <StudioNumberField
          label="Size"
          value={Number(styleRecord.fontSize ?? 16)}
          onChange={(value) => updateTextStyle("fontSize", value)}
        />
        <StudioFontWeightField
          options={fontWeightOptions}
          value={styleRecord.fontWeight ?? 700}
          onChange={(value) => updateTextStyle("fontWeight", value)}
        />
      </div>
      <StudioTextAlignmentField
        value={getStudioTextAlignment(styleRecord)}
        onChange={(value) => {
          onUpdateObject((currentObject) => {
            if (
              currentObject.kind !== "text" &&
              currentObject.kind !== "flexibleText"
            ) {
              return;
            }
            currentObject.style = {
              ...currentObject.style,
              textAlign: value,
              justifyContent: getStudioTextJustifyContent(value),
            };
          });
        }}
      />
      {object.kind === "flexibleText" ? (
        <StudioLineBreakField
          value={getStudioTextWrapMode(styleRecord)}
          onChange={(mode) =>
            updateTextStyle(STUDIO_TEXT_WRAP_MODE_STYLE_KEY, mode)
          }
        />
      ) : null}
      <StudioNumberField
        label="Line Height"
        value={Number(styleRecord.lineHeight ?? 1.2)}
        onChange={(value) => updateTextStyle("lineHeight", value)}
      />
      <label className={FIELD_LABEL_CLASS}>
        <span>Color</span>
        <StudioHexColorPicker
          ariaLabel="Timetable text color"
          value={String(styleRecord.color ?? "#111827")}
          onChange={(color) => updateTextStyle("color", color)}
        />
      </label>
    </div>
  );
}

/**
 * 지금 편집 중인 객체 상태 선택.
 *
 * 상태를 가진 객체에만 나타난다. 고른 상태를 문서에 적어 두므로 다시 열었을 때도
 * 같은 상태를 편집한다.
 */
export function StudioTimetableObjectVariantControls({
  object,
  onUpdateObject,
}: StudioTimetableObjectControlProps) {
  const variantSet = object.variantSet;
  if (!variantSet) return null;

  const activeValue = variantSet.activeValue ?? variantSet.defaultValue;
  const activeLabel =
    variantSet.options.find((option) => option.value === activeValue)?.label ??
    activeValue;

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-1">
        {variantSet.options.map((option) => (
          <button
            className={cn(
              "h-8 rounded-md text-xs font-bold transition",
              option.value === activeValue
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
            )}
            key={option.value}
            type="button"
            onClick={() =>
              onUpdateObject((currentObject) => {
                setStudioTimetableObjectActiveVariantValue(
                  currentObject,
                  option.value,
                );
              })
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
        Editing state: <span className="text-[var(--fg)]">{activeLabel}</span>
      </div>
    </div>
  );
}
