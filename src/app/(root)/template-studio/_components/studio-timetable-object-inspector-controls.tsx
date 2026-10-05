"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import { StudioNumberField } from "@/components/studio/inspector/studio-inspector-fields";
import { cn } from "@/lib/utils";
import type {
  StudioTemplateDocument,
  StudioStyleRecord,
} from "@/types/template-studio";
import type { StudioSemanticMaskShape } from "@/utils/template-studio/semantic-slots";
import type { StudioTimetableGraphRecipe } from "@/utils/template-studio/timetable-graph-commands";
import {
  getStudioMaskRadiusFromShape,
  getStudioMaskShapeFromRadius,
} from "@/utils/template-studio/timetable-object-style";
import { StudioTextTypographyControls } from "@/components/studio/inspector/studio-text-typography-controls";
import {
  getStudioObjectStyleWithValue,
  getStudioTextAlignmentStyle,
} from "@/utils/template-studio/object-style";
import { getStudioTimetableGraphEditorFeatures } from "@/utils/template-studio/timetable-graph-selection";
import type {
  StudioTimetableGraphNode,
  StudioTimetableNodeExtension,
} from "@/types/studio-timetable-graph";

import { StudioDateFormatControls } from "@/components/studio/inspector/studio-binding-format-controls";
import {
  getStudioBindingFormatFeatures,
  applyStudioBindingFormatPatch,
} from "@/utils/template-studio/binding-format";

/** 시간표 객체 하나를 바꾼다. 문서 갱신과 이력은 호출한 쪽이 소유한다. */
export type StudioTimetableObjectUpdater = (
  recipe: StudioTimetableGraphRecipe,
) => void;

const SELECT_CLASS =
  "h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]";

const FIELD_LABEL_CLASS =
  "grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]";

export interface StudioTimetableObjectControlProps {
  object: StudioTimetableGraphNode;
  style: StudioStyleRecord;
  extension: StudioTimetableNodeExtension;
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
  const binding = object.binding;
  if (
    binding?.kind !== "builtinField" ||
    !getStudioBindingFormatFeatures(binding).dateFormatMode
  )
    return null;
  return StudioDateFormatControls({
    mode: getStudioBindingFormatFeatures(binding).dateFormatMode!,
    format:
      binding.dateRangeFormat ??
      (binding.fieldId === "day.date" ? "short" : undefined),
    template: binding.dateRangeTemplate,
    onChange: ({ format, template }) =>
      onUpdateObject(({ node: target }) => {
        applyStudioBindingFormatPatch(target, {
          dateRangeFormat: format,
          dateRangeTemplate: template,
        });
      }),
  });
}

/** 이미지를 감출 때 위치 선택도 함께 잠근다. */
export function StudioTimetableArtistProfileTextAssetLayoutControls({
  extension,
  onUpdateObject,
}: StudioTimetableObjectControlProps) {
  const inline = extension.inlineAssetLayout;
  const assetMode = inline?.mode ?? "visible";
  const assetPosition = inline?.position ?? "left";

  const updateStyle = (key: string, value: string | number) => {
    onUpdateObject(({ extension }) => {
      const keys: Record<string, string> = {
        assetMode: "mode",
        assetPosition: "position",
        assetSize: "size",
        assetGap: "gap",
      };
      extension.inlineAssetLayout = {
        ...extension.inlineAssetLayout,
        [keys[key]]: value,
      };
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
          value={Number(inline?.size ?? 160)}
          onChange={(value) => updateStyle("assetSize", Math.max(24, value))}
        />
        <StudioNumberField
          label="Asset Gap"
          value={Number(inline?.gap ?? 32)}
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
  style,
  onUpdateObject,
}: StudioTimetableObjectControlProps) {
  const radius =
    typeof style.borderRadius === "number" ? style.borderRadius : 0;
  const shape = getStudioMaskShapeFromRadius(radius);

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
            onUpdateObject(({ style }) => {
              style.borderRadius = getStudioMaskRadiusFromShape(nextShape);
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
          onUpdateObject(({ style }) => {
            style.borderRadius = value;
          })
        }
      />
    </div>
  );
}

export interface StudioTimetableTextTypographyControlsProps extends StudioTimetableObjectControlProps {
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
  style,
  onUpdateObject,
  document,
  fontFamilies,
}: StudioTimetableTextTypographyControlsProps) {
  return (
    <StudioTextTypographyControls
      document={document}
      style={style}
      fontFamilies={fontFamilies}
      flexibleText={object.type === "flexibleText"}
      colorLabel="Timetable text color"
      onUpdateStyle={(key, value) =>
        onUpdateObject(({ node: target, style }) => {
          if (target.type !== "text" && target.type !== "flexibleText") return;
          Object.assign(
            style,
            getStudioObjectStyleWithValue(style, target.layoutMode, key, value),
          );
        })
      }
      onUpdateTextAlignment={(alignment) =>
        onUpdateObject(({ node: target, style }) => {
          if (target.type !== "text" && target.type !== "flexibleText") return;
          Object.assign(style, getStudioTextAlignmentStyle(style, alignment));
        })
      }
    />
  );
}

/**
 * 지금 편집 중인 객체 상태 선택.
 *
 * 디자인 선택은 뷰 상태이고, 사용자 표시 정책만 문서에 저장한다.
 */
export function StudioTimetableObjectVariantControls({
  object,
  extension,
  onUpdateObject,
  editingValue,
  onSelectEditingValue,
}: StudioTimetableObjectControlProps & {
  editingValue: string;
  onSelectEditingValue: (value: string) => void;
}) {
  const variantSet = object.variantSet;
  if (!variantSet) return null;

  const supportsRuntimeMode = getStudioTimetableGraphEditorFeatures(
    object,
    extension,
  ).runtimeMode;
  const variantMode = variantSet.mode === "always" ? "always" : "toggle";
  const activeValue = editingValue;
  const activeLabel =
    variantSet.options.find((option) => option.value === activeValue)?.label ??
    activeValue;

  return (
    <div className="grid gap-2">
      {supportsRuntimeMode ? (
        <label className={FIELD_LABEL_CLASS}>
          <span>User visibility control</span>
          <select
            className={SELECT_CLASS}
            value={variantMode}
            onChange={(event) => {
              const mode = event.currentTarget.value as "toggle" | "always";
              onUpdateObject(({ node: currentObject }) => {
                if (!currentObject.variantSet) return;
                currentObject.variantSet = {
                  ...currentObject.variantSet,
                  mode,
                };
              });
            }}
          >
            <option value="toggle">On / Off</option>
            <option value="always">Always On</option>
          </select>
        </label>
      ) : null}
      {variantMode === "toggle" ? (
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
              onClick={() => onSelectEditingValue(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
          Always On · the preview toggle is hidden.
        </div>
      )}
      <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
        Editing design state:{" "}
        <span className="text-[var(--fg)]">
          {variantMode === "always" ? "On" : activeLabel}
        </span>
      </div>
    </div>
  );
}

export {
  StudioDateFormatControls as StudioWeekDatesFormatControls,
  StudioTimeFormatControls,
} from "@/components/studio/inspector/studio-binding-format-controls";
