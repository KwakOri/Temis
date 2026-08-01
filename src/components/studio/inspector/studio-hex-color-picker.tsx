"use client";

import { Check } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import {
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  type HsvColor,
} from "@/utils/color/hex-color";

const PANEL_WIDTH = 244;
const PANEL_HEIGHT_ESTIMATE = 342;
const PANEL_GAP = 6;
const VIEWPORT_GAP = 8;

const COLOR_PRESETS = [
  "#FFFFFF",
  "#CBD5E1",
  "#64748B",
  "#111827",
  "#EF4444",
  "#F97316",
  "#FACC15",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const TRANSPARENT_SWATCH =
  "conic-gradient(#cbd5e1 0 25%, #ffffff 0 50%, #cbd5e1 0 75%, #ffffff 0) 0 0 / 8px 8px";

interface PickerPosition {
  left: number;
  top: number;
}

const PICKER_THEME_VARIABLES = [
  "--field-border",
  "--panel",
  "--field",
  "--fg",
  "--fg2",
  "--fg3",
  "--accent",
  "--sel",
] as const;

type PickerThemeStyle = CSSProperties &
  Partial<Record<(typeof PICKER_THEME_VARIABLES)[number], string>>;

export interface StudioHexColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * 연속 조작 한 묶음이 시작될 때 한 번 불린다.
   *
   * 색을 끌어서 고르는 동안 `onChange`는 매 프레임 불린다. 그때마다 이력을 쌓으면
   * 되돌리기가 수백 단계 쌓여 쓸 수 없게 된다. 그래서 되돌리기 한 단위를 여기서
   * 시작하고 `onChange`는 이력 없이 문서만 고치게 한다.
   *
   * 한 묶음은 색 패널을 열고 닫을 때까지, 또는 값 칸에 적어 한 번 확정할 때까지다.
   */
  onChangeStart?: () => void;
  allowTransparent?: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  fallbackColor?: string;
}

const getInitialHsv = (value: string, fallbackColor: string): HsvColor =>
  hexToHsv(value) ??
  hexToHsv(fallbackColor) ?? {
    hue: 0,
    saturation: 0,
    value: 1,
  };

export function StudioHexColorPicker({
  value,
  onChange,
  onChangeStart,
  allowTransparent = false,
  ariaLabel = "Color",
  className,
  disabled = false,
  fallbackColor = "#FFFFFF",
}: StudioHexColorPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const normalizedValue = normalizeHexColor(value);
  const isTransparent = allowTransparent && value.trim() === "transparent";
  const resolvedHex =
    normalizedValue ?? normalizeHexColor(fallbackColor) ?? "#FFFFFF";
  const [draft, setDraft] = useState(
    isTransparent ? "TRANSPARENT" : (normalizedValue ?? value.toUpperCase()),
  );
  const [hsv, setHsv] = useState<HsvColor>(() =>
    getInitialHsv(value, fallbackColor),
  );
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const [portalThemeStyle, setPortalThemeStyle] = useState<PickerThemeStyle>(
    {},
  );

  useEffect(() => {
    const nextNormalizedValue = normalizeHexColor(value);
    const nextIsTransparent =
      allowTransparent && value.trim() === "transparent";
    setDraft(
      nextIsTransparent
        ? "TRANSPARENT"
        : (nextNormalizedValue ?? value.toUpperCase()),
    );

    if (!nextNormalizedValue) return;
    const nextHsv = hexToHsv(nextNormalizedValue);
    if (!nextHsv) return;
    setHsv((current) => ({
      ...nextHsv,
      hue: nextHsv.saturation === 0 ? current.hue : nextHsv.hue,
    }));
  }, [allowTransparent, value]);

  const updatePosition = useCallback(() => {
    const root = rootRef.current;
    const anchor = root?.getBoundingClientRect();
    if (!root || !anchor) return;

    const left = Math.min(
      Math.max(VIEWPORT_GAP, anchor.right - PANEL_WIDTH),
      Math.max(VIEWPORT_GAP, window.innerWidth - PANEL_WIDTH - VIEWPORT_GAP),
    );
    const fitsBelow =
      window.innerHeight - anchor.bottom >=
      PANEL_HEIGHT_ESTIMATE + PANEL_GAP + VIEWPORT_GAP;
    const top = fitsBelow
      ? anchor.bottom + PANEL_GAP
      : Math.max(VIEWPORT_GAP, anchor.top - PANEL_HEIGHT_ESTIMATE - PANEL_GAP);

    setPosition({ left, top });
    const computedStyle = window.getComputedStyle(root);
    setPortalThemeStyle(
      Object.fromEntries(
        PICKER_THEME_VARIABLES.map((variable) => [
          variable,
          computedStyle.getPropertyValue(variable),
        ]),
      ) as PickerThemeStyle,
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  /**
   * 연속 조작 한 묶음이 이미 시작됐는지.
   *
   * 끌어서 색을 고르는 동안 값이 계속 바뀌므로 첫 변경에서만 묶음을 시작한다.
   */
  const changeGroupStartedRef = useRef(false);

  useEffect(() => {
    // 패널을 열고 닫는 것이 한 묶음의 경계다.
    changeGroupStartedRef.current = false;
  }, [open]);

  const commitColor = (nextValue: string) => {
    if (!changeGroupStartedRef.current) {
      changeGroupStartedRef.current = true;
      onChangeStart?.();
    }
    onChange(nextValue);
  };

  const applyHsv = (nextHsv: HsvColor) => {
    setHsv(nextHsv);
    commitColor(hsvToHex(nextHsv));
  };

  const updateSaturationAndValue = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    applyHsv({
      ...hsv,
      saturation: Math.min(
        1,
        Math.max(0, (event.clientX - bounds.left) / bounds.width),
      ),
      value: Math.min(
        1,
        Math.max(0, 1 - (event.clientY - bounds.top) / bounds.height),
      ),
    });
  };

  const commitDraft = () => {
    if (allowTransparent && draft.trim().toLowerCase() === "transparent") {
      commitColor("transparent");
      setDraft("TRANSPARENT");
      // 적어서 한 번 확정하는 것은 그 자체로 한 묶음이다.
      changeGroupStartedRef.current = false;
      return true;
    }

    const normalized = normalizeHexColor(draft);
    if (!normalized) {
      setDraft(isTransparent ? "TRANSPARENT" : resolvedHex);
      return false;
    }

    setDraft(normalized);
    commitColor(normalized);
    changeGroupStartedRef.current = false;
    return true;
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (commitDraft()) setOpen(false);
    }
    if (event.key === "Escape") {
      setDraft(isTransparent ? "TRANSPARENT" : resolvedHex);
      setOpen(false);
    }
  };

  const pickerPanel =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-label={`${ariaLabel} HEX color picker`}
            className="fixed z-[200] grid gap-3 rounded-xl border border-[var(--field-border)] bg-[var(--panel)] p-3 text-[var(--fg)] shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
            ref={panelRef}
            role="dialog"
            style={{
              ...portalThemeStyle,
              left: position.left,
              top: position.top,
              width: PANEL_WIDTH,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--fg2)]">
                HEX Color
              </span>
              <span className="font-mono text-[10px] font-bold text-[var(--fg3)]">
                {isTransparent ? "TRANSPARENT" : resolvedHex}
              </span>
            </div>

            <div
              aria-label={`${ariaLabel} saturation and brightness`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(hsv.value * 100)}
              aria-valuetext={`${Math.round(hsv.saturation * 100)}% saturation, ${Math.round(hsv.value * 100)}% brightness`}
              className="relative h-36 cursor-crosshair overflow-hidden rounded-lg border border-white/15 outline-none focus:ring-2 focus:ring-[var(--accent)]"
              role="slider"
              tabIndex={0}
              style={{
                backgroundColor: `hsl(${hsv.hue} 100% 50%)`,
                backgroundImage:
                  "linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, transparent)",
                touchAction: "none",
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 0.05 : 0.01;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  applyHsv({
                    ...hsv,
                    saturation: Math.max(0, hsv.saturation - step),
                  });
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  applyHsv({
                    ...hsv,
                    saturation: Math.min(1, hsv.saturation + step),
                  });
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  applyHsv({ ...hsv, value: Math.min(1, hsv.value + step) });
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  applyHsv({ ...hsv, value: Math.max(0, hsv.value - step) });
                }
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updateSaturationAndValue(event);
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                  return;
                }
                updateSaturationAndValue(event);
              }}
            >
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.65)]"
                style={{
                  left: `${hsv.saturation * 100}%`,
                  top: `${(1 - hsv.value) * 100}%`,
                }}
              />
            </div>

            <label className="grid gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
              Hue
              <input
                aria-label={`${ariaLabel} hue`}
                className="studio-hex-color-hue h-3 w-full cursor-pointer"
                max={360}
                min={0}
                step={1}
                type="range"
                value={Math.round(hsv.hue)}
                onChange={(event) =>
                  applyHsv({
                    ...hsv,
                    hue: Number(event.currentTarget.value),
                  })
                }
              />
            </label>

            <div className="grid grid-cols-6 gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  aria-label={`Set color ${preset}`}
                  className="relative h-6 rounded-md border border-white/20 shadow-sm transition hover:scale-105"
                  key={preset}
                  style={{ backgroundColor: preset }}
                  type="button"
                  onClick={() => commitColor(preset)}
                >
                  {resolvedHex === preset && !isTransparent ? (
                    <Check
                      className={cn(
                        "absolute inset-0 m-auto h-3.5 w-3.5",
                        preset === "#FFFFFF" || preset === "#CBD5E1"
                          ? "text-slate-900"
                          : "text-white",
                      )}
                    />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {allowTransparent ? (
                <button
                  className={cn(
                    "h-8 flex-1 rounded-lg border text-[10px] font-bold transition",
                    isTransparent
                      ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--accent)]"
                      : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] hover:border-[var(--accent)]",
                  )}
                  type="button"
                  onClick={() => commitColor("transparent")}
                >
                  Transparent
                </button>
              ) : null}
              <button
                className="h-8 flex-1 rounded-lg bg-[var(--accent)] text-[10px] font-bold text-white"
                type="button"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn(
        "flex h-8 min-w-0 items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 focus-within:border-[var(--accent)]",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
      ref={rootRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Open ${ariaLabel} HEX color picker`}
        className="h-5 w-5 shrink-0 rounded border border-[var(--field-border)] shadow-inner disabled:cursor-not-allowed"
        disabled={disabled}
        style={{
          background: isTransparent ? TRANSPARENT_SWATCH : resolvedHex,
        }}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
      />
      <input
        aria-label={`${ariaLabel} HEX value`}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold uppercase tracking-[0.02em] text-[var(--fg)] outline-none"
        disabled={disabled}
        inputMode="text"
        spellCheck={false}
        value={draft}
        onBlur={commitDraft}
        onChange={(event) => {
          const nextDraft = event.currentTarget.value.toUpperCase();
          setDraft(nextDraft);
          if (
            allowTransparent &&
            nextDraft.trim().toLowerCase() === "transparent"
          ) {
            commitColor("transparent");
            return;
          }
          const normalized = normalizeHexColor(nextDraft);
          if (/^#?[0-9a-f]{6}$/i.test(nextDraft.trim()) && normalized) {
            commitColor(normalized);
          }
        }}
        onKeyDown={handleDraftKeyDown}
      />
      {pickerPanel}
    </div>
  );
}
