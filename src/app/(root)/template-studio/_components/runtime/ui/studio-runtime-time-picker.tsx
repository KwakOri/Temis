"use client";

import { ChevronDown } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  studioRuntimeControlVariants,
  studioRuntimeLabelClass,
} from "./studio-runtime-ui";

const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

const parseTime = (value: string) => {
  const [rawHour, rawMinute] = value.split(":").map(Number);

  return {
    hour:
      Number.isInteger(rawHour) && rawHour >= 0 && rawHour <= 23
        ? rawHour
        : 0,
    minute:
      Number.isInteger(rawMinute) && rawMinute >= 0 && rawMinute <= 59
        ? rawMinute
        : 0,
  };
};

const formatTimePart = (value: number) => value.toString().padStart(2, "0");

interface StudioRuntimeTimePickerProps {
  id?: string;
  label: string;
  hourLabel: string;
  minuteLabel: string;
  value: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}

export function StudioRuntimeTimePicker({
  id,
  label,
  hourLabel,
  minuteLabel,
  value,
  disabled = false,
  onValueChange,
}: StudioRuntimeTimePickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const dropdownId = `${controlId}-dropdown`;
  const initialTime = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialTime.minute);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextTime = parseTime(value);
    setSelectedHour(nextTime.hour);
    setSelectedMinute(nextTime.minute);
  }, [value]);

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent,
        );
      const isTouchDevice = "ontouchstart" in window;
      const isSmallScreen = window.innerWidth <= 768;

      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen));
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDropdown]);

  const handleTimeSelect = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    onValueChange(`${formatTimePart(hour)}:${formatTimePart(minute)}`);
    setShowDropdown(false);
  };

  return (
    <div className="grid gap-1.5">
      <label className={studioRuntimeLabelClass} htmlFor={controlId}>
        {label}
      </label>

      {isMobile ? (
        <input
          className={studioRuntimeControlVariants({ size: "compact" })}
          disabled={disabled}
          id={controlId}
          type="time"
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
        />
      ) : (
        <div className="relative w-full" ref={dropdownRef}>
          <button
            aria-controls={showDropdown ? dropdownId : undefined}
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            className={cn(
              studioRuntimeControlVariants({ size: "compact" }),
              "flex items-center justify-between text-left",
            )}
            disabled={disabled}
            id={controlId}
            type="button"
            onClick={() => setShowDropdown((current) => !current)}
          >
            <span className="font-normal">
              {formatTimePart(selectedHour)}:{formatTimePart(selectedMinute)}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 text-[var(--runtime-fg-subtle)] transition-transform duration-200",
                showDropdown && "rotate-180",
              )}
            />
          </button>

          {showDropdown && !disabled ? (
            <div
              className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--runtime-border-strong)] bg-[var(--runtime-card-bg)] shadow-[var(--runtime-shadow-overlay)]"
              id={dropdownId}
            >
              <div className="flex">
                <div className="min-w-0 flex-1 border-r border-[var(--runtime-border)]">
                  <div className="bg-[var(--runtime-primary-soft)] p-2 text-center text-xs font-semibold text-[var(--runtime-primary-hover)]">
                    {hourLabel}
                  </div>
                  <div
                    aria-label={hourLabel}
                    className="scrollbar-hide max-h-32 overflow-y-auto"
                    role="listbox"
                  >
                    {hours.map((hour) => (
                      <button
                        aria-selected={hour === selectedHour}
                        className={cn(
                          "w-full p-2 text-sm text-[var(--runtime-fg-muted)] transition-colors hover:bg-[var(--runtime-primary-soft)]",
                          hour === selectedHour &&
                            "bg-[var(--runtime-primary-soft)] font-semibold text-[var(--runtime-primary-hover)]",
                        )}
                        key={hour}
                        role="option"
                        type="button"
                        onClick={() =>
                          handleTimeSelect(hour, selectedMinute)
                        }
                      >
                        {formatTimePart(hour)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="bg-[var(--runtime-primary-soft)] p-2 text-center text-xs font-semibold text-[var(--runtime-primary-hover)]">
                    {minuteLabel}
                  </div>
                  <div
                    aria-label={minuteLabel}
                    className="scrollbar-hide max-h-32 overflow-y-auto"
                    role="listbox"
                  >
                    {minutes.map((minute) => (
                      <button
                        aria-selected={minute === selectedMinute}
                        className={cn(
                          "w-full p-2 text-sm text-[var(--runtime-fg-muted)] transition-colors hover:bg-[var(--runtime-primary-soft)]",
                          minute === selectedMinute &&
                            "bg-[var(--runtime-primary-soft)] font-semibold text-[var(--runtime-primary-hover)]",
                        )}
                        key={minute}
                        role="option"
                        type="button"
                        onClick={() =>
                          handleTimeSelect(selectedHour, minute)
                        }
                      >
                        {formatTimePart(minute)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
