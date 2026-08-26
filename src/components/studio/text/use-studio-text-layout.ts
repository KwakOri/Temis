"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";

import { getStudioTextFitBounds } from "@/utils/template-studio/text-layout";

export interface StudioTextLayoutResult {
  /** 0.5px 탐색으로 찾은 실제 맞춤 크기다. */
  fontSize: number;
  /** 기존 렌더러가 화면에 적용하는 최종 정수 크기다. */
  renderedFontSize: number;
  displayText: string;
  lines: string[];
  lineHeightPx: number;
  availableWidth: number;
  availableHeight: number;
  /** SVG viewport에 대응하는 root content box 크기다. */
  width: number;
  height: number;
  ready: boolean;
}

export interface UseStudioTextLayoutOptions {
  text: string;
  maxFontSize: number;
  minFontSize: number;
  multiline: boolean;
  maxLines?: number;
  fitMargin: number;
  typography: React.CSSProperties;
  /** SVG/HTML visual layers require a separate inline measurement span. */
  measureWithSpan?: boolean;
}

export interface UseStudioFixedTextLayoutOptions {
  text: string;
  typography: React.CSSProperties;
}

const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;

const normalizeMaxLines = (
  maxLines: number | undefined,
): number | undefined => {
  if (
    typeof maxLines !== "number" ||
    !Number.isFinite(maxLines) ||
    maxLines <= 0
  ) {
    return undefined;
  }

  return Math.floor(maxLines);
};

const getDisplayText = (text: string, maxLines: number | undefined): string =>
  maxLines === undefined ? text : text.replace(/[\r\n]+/g, " ");

const getTypographyKey = (typography: React.CSSProperties): string =>
  JSON.stringify({
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontStyle: typography.fontStyle,
    fontVariant: typography.fontVariant,
    fontWeight: typography.fontWeight,
    letterSpacing: typography.letterSpacing,
    lineHeight: typography.lineHeight,
  });

const getFallbackLineHeight = (
  fontSize: number,
  typography: React.CSSProperties,
): number => {
  const lineHeight = typography.lineHeight;

  if (typeof lineHeight === "number" && Number.isFinite(lineHeight)) {
    return lineHeight > 0
      ? lineHeight * fontSize
      : fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER;
  }

  if (typeof lineHeight === "string") {
    const parsedLineHeight = Number.parseFloat(lineHeight);
    if (Number.isFinite(parsedLineHeight) && parsedLineHeight > 0) {
      return lineHeight.trim().endsWith("px")
        ? parsedLineHeight
        : parsedLineHeight * fontSize;
    }
  }

  return fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER;
};

const getPixelValue = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getAvailableLength = (parent: HTMLElement) => {
  const computedStyle = window.getComputedStyle(parent);

  return {
    availableWidth:
      parent.clientWidth -
      getPixelValue(computedStyle.paddingLeft) -
      getPixelValue(computedStyle.paddingRight),
    availableHeight:
      parent.clientHeight -
      getPixelValue(computedStyle.paddingTop) -
      getPixelValue(computedStyle.paddingBottom),
  };
};

const getMeasuredLineHeight = (
  measurement: HTMLElement,
  candidateFontSize: number,
  typography: React.CSSProperties,
): number => {
  const computedLineHeight = Number.parseFloat(
    window.getComputedStyle(measurement).lineHeight,
  );

  return Number.isFinite(computedLineHeight) && computedLineHeight > 0
    ? computedLineHeight
    : getFallbackLineHeight(candidateFontSize, typography);
};

const getInitialLayout = (
  options: UseStudioTextLayoutOptions,
): StudioTextLayoutResult => {
  const normalizedMaxLines = normalizeMaxLines(options.maxLines);
  const displayText = getDisplayText(options.text, normalizedMaxLines);
  const fontSize = options.maxFontSize;

  return {
    fontSize,
    renderedFontSize: Math.floor(fontSize),
    displayText,
    lines: displayText.split("\n"),
    lineHeightPx: getFallbackLineHeight(fontSize, options.typography),
    availableWidth: 0,
    availableHeight: 0,
    width: 0,
    height: 0,
    ready: false,
  };
};

const getInitialFixedTextLayout = (
  options: UseStudioFixedTextLayoutOptions,
): StudioTextLayoutResult => {
  const displayText = options.text;
  const fontSize =
    typeof options.typography.fontSize === "number" &&
    Number.isFinite(options.typography.fontSize)
      ? options.typography.fontSize
      : 16;

  return {
    fontSize,
    renderedFontSize: fontSize,
    displayText,
    lines: displayText.split("\n"),
    lineHeightPx: getFallbackLineHeight(fontSize, options.typography),
    availableWidth: 0,
    availableHeight: 0,
    width: 0,
    height: 0,
    ready: false,
  };
};

export function useStudioTextLayout(options: UseStudioTextLayoutOptions): {
  rootRef: React.RefObject<HTMLParagraphElement | null>;
  measurementRef: React.RefObject<HTMLSpanElement | null>;
  layout: StudioTextLayoutResult;
} {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const normalizedMaxLines = normalizeMaxLines(options.maxLines);
  const displayText = getDisplayText(options.text, normalizedMaxLines);
  const typographyKey = getTypographyKey(options.typography);
  const stableTypographyRef = useRef(options.typography);
  const stableTypographyKeyRef = useRef(typographyKey);
  if (stableTypographyKeyRef.current !== typographyKey) {
    stableTypographyKeyRef.current = typographyKey;
    stableTypographyRef.current = options.typography;
  }
  const stableTypography = stableTypographyRef.current;
  const [layout, setLayout] = useState<StudioTextLayoutResult>(() =>
    getInitialLayout(options),
  );

  useEffect(() => {
    const root = rootRef.current;
    const measurement =
      options.measureWithSpan === true ? measurementRef.current : root;
    if (!root || !measurement) return;

    const parent = root.parentElement;
    if (!parent) return;

    const hasMeasurementSpan = options.measureWithSpan === true;

    const calculateLayout = () => {
      const originalRootWidth = root.style.width;
      if (!hasMeasurementSpan) root.style.width = "max-content";

      try {
        const parentLength = getAvailableLength(parent);
        const { width: availableWidth, height: availableHeight } =
          getStudioTextFitBounds({
            width: parentLength.availableWidth,
            height: parentLength.availableHeight,
            margin: options.fitMargin,
          });

        if (
          parentLength.availableWidth <= 0 ||
          parentLength.availableHeight <= 0
        ) {
          const fontSize = options.minFontSize;
          setLayout({
            fontSize,
            renderedFontSize: Math.floor(fontSize),
            displayText,
            lines: displayText.split("\n"),
            lineHeightPx: getFallbackLineHeight(fontSize, stableTypography),
            availableWidth,
            availableHeight,
            width: root.clientWidth || availableWidth,
            height: root.clientHeight || 0,
            ready: true,
          });
          return;
        }

        let calculatedFontSize = options.maxFontSize;

        if (normalizedMaxLines !== undefined) {
          measurement.style.width = `${availableWidth}px`;
          measurement.style.whiteSpace = "normal";
          measurement.style.wordBreak = "break-word";
          measurement.style.overflowWrap = "break-word";

          const fitsAtFontSize = (candidateFontSize: number) => {
            root.style.fontSize = `${candidateFontSize}px`;
            const lineHeight = getMeasuredLineHeight(
              measurement,
              candidateFontSize,
              stableTypography,
            );
            const textWidth = measurement.scrollWidth;
            const textHeight = measurement.scrollHeight;
            const estimatedLineCount = Math.ceil(
              (textHeight - 0.5) / lineHeight,
            );

            return (
              textWidth <= availableWidth &&
              textHeight <= availableHeight &&
              textHeight <= lineHeight * normalizedMaxLines + 0.5 &&
              estimatedLineCount <= normalizedMaxLines
            );
          };

          let low = Math.ceil(options.minFontSize * 2);
          let high = Math.floor(options.maxFontSize * 2);
          let bestFontSize = low;

          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidateFontSize = mid / 2;

            if (fitsAtFontSize(candidateFontSize)) {
              bestFontSize = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }

          calculatedFontSize = bestFontSize / 2;
        } else {
          measurement.style.whiteSpace = options.multiline ? "pre" : "nowrap";
          measurement.style.wordBreak = options.multiline
            ? "break-word"
            : "normal";
          measurement.style.overflowWrap = options.multiline
            ? "break-word"
            : "normal";

          let currentFontSize = options.maxFontSize;
          root.style.fontSize = `${currentFontSize}px`;

          while (currentFontSize >= options.minFontSize) {
            root.style.fontSize = `${currentFontSize}px`;

            const exceedsWidth = measurement.scrollWidth > availableWidth;
            const exceedsHeight = measurement.scrollHeight > availableHeight;

            if (!exceedsWidth && !exceedsHeight) break;

            currentFontSize -= 0.5;
          }

          calculatedFontSize = Math.max(currentFontSize, options.minFontSize);
        }

        root.style.fontSize = `${calculatedFontSize}px`;
        const lineHeightPx = getMeasuredLineHeight(
          measurement,
          calculatedFontSize,
          stableTypography,
        );
        const renderedFontSize = Math.floor(calculatedFontSize);

        setLayout({
          fontSize: calculatedFontSize,
          renderedFontSize,
          displayText,
          lines: displayText.split("\n"),
          lineHeightPx,
          availableWidth,
          availableHeight,
          width: root.clientWidth || parentLength.availableWidth,
          height: root.clientHeight || measurement.scrollHeight,
          ready: true,
        });
      } finally {
        root.style.width = originalRootWidth;
      }
    };

    calculateLayout();

    const resizeObserver = new ResizeObserver(calculateLayout);
    resizeObserver.observe(parent);

    const fontSet = document.fonts;
    const handleFontLoadingDone = () => calculateLayout();
    fontSet?.addEventListener("loadingdone", handleFontLoadingDone);
    void fontSet?.ready.then(calculateLayout);

    return () => {
      resizeObserver.disconnect();
      fontSet?.removeEventListener("loadingdone", handleFontLoadingDone);
    };
  }, [
    displayText,
    normalizedMaxLines,
    options.fitMargin,
    options.maxFontSize,
    options.minFontSize,
    options.multiline,
    options.measureWithSpan,
    stableTypography,
  ]);

  const renderedLayout =
    layout.displayText === displayText
      ? layout
      : {
          ...layout,
          displayText,
          lines: displayText.split("\n"),
          ready: false,
        };

  return { rootRef, measurementRef, layout: renderedLayout };
}

/**
 * 고정 크기 텍스트가 SVG viewport로 사용할 실제 ink box를 측정한다.
 *
 * 고정 Text는 Auto Text처럼 부모 상자에 맞춰 font-size를 탐색하지 않는다. 대신 SVG가
 * HTML 텍스트와 같은 위치·크기를 사용하도록, 투명한 논리 텍스트 span의 실제 box만 읽는다.
 * 폰트가 늦게 로드되거나 부모 크기가 바뀌어도 Auto Text와 같은 측정 경계로 갱신한다.
 */
export function useStudioFixedTextLayout(
  options: UseStudioFixedTextLayoutOptions,
): {
  rootRef: React.RefObject<HTMLSpanElement | null>;
  measurementRef: React.RefObject<HTMLSpanElement | null>;
  layout: StudioTextLayoutResult;
} {
  const rootRef = useRef<HTMLSpanElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const displayText = options.text;
  const typographyKey = getTypographyKey(options.typography);
  const stableTypographyRef = useRef(options.typography);
  const stableTypographyKeyRef = useRef(typographyKey);
  if (stableTypographyKeyRef.current !== typographyKey) {
    stableTypographyKeyRef.current = typographyKey;
    stableTypographyRef.current = options.typography;
  }
  const stableTypography = stableTypographyRef.current;
  const [layout, setLayout] = useState<StudioTextLayoutResult>(() =>
    getInitialFixedTextLayout(options),
  );

  useEffect(() => {
    const root = rootRef.current;
    const measurement = measurementRef.current;
    if (!root || !measurement) return;

    const calculateLayout = () => {
      const computedStyle = window.getComputedStyle(measurement);
      const fontSize = getPixelValue(computedStyle.fontSize) || 16;
      const lineHeightPx = getMeasuredLineHeight(
        measurement,
        fontSize,
        stableTypography,
      );
      const width = root.clientWidth || measurement.scrollWidth || 1;
      const height =
        root.clientHeight || measurement.scrollHeight || lineHeightPx;

      setLayout({
        fontSize,
        renderedFontSize: fontSize,
        displayText,
        lines: displayText.split("\n"),
        lineHeightPx,
        availableWidth: width,
        availableHeight: height,
        width,
        height,
        ready: true,
      });
    };

    calculateLayout();

    const resizeObserver = new ResizeObserver(calculateLayout);
    resizeObserver.observe(root);
    if (root.parentElement) resizeObserver.observe(root.parentElement);

    const fontSet = document.fonts;
    const handleFontLoadingDone = () => calculateLayout();
    fontSet?.addEventListener("loadingdone", handleFontLoadingDone);
    void fontSet?.ready.then(calculateLayout);

    return () => {
      resizeObserver.disconnect();
      fontSet?.removeEventListener("loadingdone", handleFontLoadingDone);
    };
  }, [displayText, stableTypography]);

  const renderedLayout =
    layout.displayText === displayText
      ? layout
      : {
          ...layout,
          displayText,
          lines: displayText.split("\n"),
          ready: false,
        };

  return { rootRef, measurementRef, layout: renderedLayout };
}
