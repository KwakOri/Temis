import React, { useId } from "react";

import { cn } from "@/lib/utils";
import {
  studioRuntimeDescriptionClass,
  studioRuntimeFocusRingClass,
  studioRuntimeLabelClass,
} from "./studio-runtime-ui";

export interface StudioRuntimeFieldOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface BaseProps {
  id?: string;
  label: string;
  hideLabel?: boolean;
  description?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  controlClassName?: string;
}

interface InputProps extends BaseProps {
  control: "input";
  value: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  onValueChange: (value: string) => void;
}

interface TextareaProps extends BaseProps {
  control: "textarea";
  value: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  onValueChange: (value: string) => void;
}

interface SelectProps extends BaseProps {
  control: "select";
  value: string;
  options: StudioRuntimeFieldOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
}

export type StudioRuntimeFieldProps = InputProps | TextareaProps | SelectProps;

const controlClass = (
  control: StudioRuntimeFieldProps["control"],
  error?: string,
) =>
  cn(
    "w-full rounded-xl border bg-[var(--runtime-input-bg)] px-3 text-sm font-semibold text-[var(--runtime-fg)] outline-none transition placeholder:text-[var(--runtime-fg-subtle)]",
    control === "textarea" ? "min-h-24 resize-none py-2.5" : "h-10",
    error
      ? "border-[var(--runtime-danger)]"
      : "border-[var(--runtime-border)] focus:border-[var(--runtime-primary)]",
    studioRuntimeFocusRingClass,
  );

export function StudioRuntimeField(props: StudioRuntimeFieldProps) {
  const generatedId = useId();
  const controlId = props.id ?? generatedId;
  const descriptionId = props.description
    ? `${controlId}-description`
    : undefined;
  const errorId = props.error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");
  const commonProps = {
    "aria-describedby": describedBy || undefined,
    "aria-invalid": props.error ? true : undefined,
    disabled: props.disabled,
    id: controlId,
    required: props.required,
  };

  return (
    <div className={cn("grid gap-1.5", props.className)}>
      <label
        className={cn(studioRuntimeLabelClass, props.hideLabel && "sr-only")}
        htmlFor={controlId}
      >
        {props.label}
      </label>
      {props.control === "textarea" ? (
        <textarea
          {...commonProps}
          className={cn(
            controlClass("textarea", props.error),
            props.controlClassName,
          )}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          rows={props.rows ?? 4}
          value={props.value}
          onChange={(event) => props.onValueChange(event.currentTarget.value)}
        />
      ) : props.control === "select" ? (
        <select
          {...commonProps}
          className={cn(
            controlClass("select", props.error),
            props.controlClassName,
          )}
          value={props.value}
          onChange={(event) => props.onValueChange(event.currentTarget.value)}
        >
          {props.placeholder ? (
            <option value="">{props.placeholder}</option>
          ) : null}
          {props.options.map((option) => (
            <option
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...commonProps}
          autoComplete={props.autoComplete}
          className={cn(
            controlClass("input", props.error),
            props.controlClassName,
          )}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          type={props.type ?? "text"}
          value={props.value}
          onChange={(event) => props.onValueChange(event.currentTarget.value)}
        />
      )}
      {props.description ? (
        <p className={studioRuntimeDescriptionClass} id={descriptionId}>
          {props.description}
        </p>
      ) : null}
      {props.error ? (
        <p
          className="text-[11px] font-semibold text-[var(--runtime-danger)]"
          id={errorId}
        >
          {props.error}
        </p>
      ) : null}
    </div>
  );
}
