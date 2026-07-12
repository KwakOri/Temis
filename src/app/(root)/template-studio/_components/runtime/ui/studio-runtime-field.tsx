import React, { useId } from "react";

import { cn } from "@/lib/utils";
import {
  studioRuntimeControlVariants,
  studioRuntimeDescriptionClass,
  studioRuntimeLabelClass,
} from "./studio-runtime-ui";

export interface StudioRuntimeFieldOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

interface StudioRuntimeFieldBaseProps {
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

interface StudioRuntimeInputFieldProps extends StudioRuntimeFieldBaseProps {
  control: "input";
  value: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  onValueChange: (value: string) => void;
}

interface StudioRuntimeTextareaFieldProps extends StudioRuntimeFieldBaseProps {
  control: "textarea";
  value: string;
  placeholder?: string;
  rows?: number;
  onValueChange: (value: string) => void;
}

interface StudioRuntimeSelectFieldProps extends StudioRuntimeFieldBaseProps {
  control: "select";
  value: string;
  options: StudioRuntimeFieldOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
}

export type StudioRuntimeFieldProps =
  | StudioRuntimeInputFieldProps
  | StudioRuntimeTextareaFieldProps
  | StudioRuntimeSelectFieldProps;

export function StudioRuntimeField(props: StudioRuntimeFieldProps) {
  const generatedId = useId();
  const controlId = props.id ?? generatedId;
  const descriptionId = props.description
    ? `${controlId}-description`
    : undefined;
  const errorId = props.error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");
  const controlClassName = cn(
    studioRuntimeControlVariants({
      size: props.control === "textarea" ? "default" : "compact",
      state: props.error ? "error" : "default",
    }),
    props.control === "textarea" && "min-h-24 resize-none",
    props.controlClassName,
  );
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
          className={controlClassName}
          placeholder={props.placeholder}
          rows={props.rows ?? 4}
          value={props.value}
          onChange={(event) => props.onValueChange(event.currentTarget.value)}
        />
      ) : props.control === "select" ? (
        <select
          {...commonProps}
          className={controlClassName}
          value={props.value}
          onChange={(event) => props.onValueChange(event.currentTarget.value)}
        >
          {props.placeholder ? (
            <option disabled value="">
              {props.placeholder}
            </option>
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
          className={controlClassName}
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
