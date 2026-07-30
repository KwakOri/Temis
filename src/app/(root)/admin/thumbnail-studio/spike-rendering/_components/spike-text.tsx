"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";

import { toCssStrokeWidth, type SpikeScene } from "./spike-scenes";

export interface SpikeTextMeasurement {
  fontSize: number;
  lineHeightPx: number;
  lineCount: number;
  contentWidth: number;
  contentHeight: number;
  fontsReady: boolean;
}

interface SpikeTextProps {
  scene: SpikeScene;
  onMeasure?: (measurement: SpikeTextMeasurement) => void;
}

const hexToRgba = (color: string, opacity: number): string => {
  if (opacity >= 1) return color;
  const normalized = color.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return color;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Phase 0A 스파이크용 텍스트 렌더러 프로토타입.
 *
 * Phase 3의 `StudioTextRenderer`가 만족해야 할 두 조건을 미리 구현한다.
 *
 * 1. 글자 크기와 줄바꿈을 한 번만 계산하고 모든 효과 레이어가 공유한다.
 * 2. 논리 노드는 하나이고, 효과는 렌더러 내부 시각 레이어로만 존재한다.
 */
export function SpikeText({ scene, onMeasure }: SpikeTextProps) {
  const probeRef = useRef<HTMLParagraphElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [fontSize, setFontSize] = useState(
    scene.fontSize ?? scene.autoFit?.max ?? 48,
  );

  // 폰트가 준비되기 전에 측정하면 fallback 폰트 기준 결과가 나온다.
  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined" || !window.document.fonts) {
      setFontsReady(true);
      return;
    }
    void window.document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const measure = useCallback(() => {
    const probe = probeRef.current;
    if (!probe) return;

    const { width, height } = scene.box;
    const fits = (candidate: number) => {
      probe.style.fontSize = `${candidate}px`;
      return probe.scrollWidth <= width && probe.scrollHeight <= height;
    };

    let resolved = scene.fontSize ?? scene.autoFit?.max ?? 48;

    if (scene.autoFit) {
      // 0.5px 단위 이분 탐색. 모든 효과 레이어가 이 결과를 공유한다.
      let low = Math.ceil(scene.autoFit.min * 2);
      let high = Math.floor(scene.autoFit.max * 2);
      let best = low;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (fits(mid / 2)) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      resolved = best / 2;
    }

    probe.style.fontSize = `${resolved}px`;
    const lineHeightPx = resolved * scene.lineHeight;
    const measurement: SpikeTextMeasurement = {
      fontSize: resolved,
      lineHeightPx,
      lineCount: Math.max(1, Math.round(probe.scrollHeight / lineHeightPx)),
      contentWidth: probe.scrollWidth,
      contentHeight: probe.scrollHeight,
      fontsReady,
    };

    setFontSize(resolved);
    onMeasure?.(measurement);
  }, [fontsReady, onMeasure, scene]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  const typography: CSSProperties = {
    margin: 0,
    fontFamily: `"${scene.fontFamily}"`,
    fontWeight: scene.fontWeight,
    fontSize: `${fontSize}px`,
    lineHeight: scene.lineHeight,
    letterSpacing: 0,
    textAlign: scene.align,
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
  };

  const orderedStrokes = [...scene.strokes].sort((a, b) => b.outset - a.outset);
  const shadow = scene.shadow;
  const shadowCss = shadow
    ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${hexToRgba(shadow.color, shadow.opacity)}`
    : undefined;

  return (
    <div
      data-spike-text-node={scene.id}
      style={{
        position: "absolute",
        left: scene.box.left,
        top: scene.box.top,
        width: scene.box.width,
        height: scene.box.height,
      }}
    >
      {/* 측정 전용. 화면과 PNG 어디에도 보이지 않는다. */}
      <p
        aria-hidden="true"
        ref={probeRef}
        style={{
          ...typography,
          position: "absolute",
          inset: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {scene.text}
      </p>

      {orderedStrokes.map((item, index) => (
        <p
          aria-hidden="true"
          data-effect-layer={`stroke-${item.id}`}
          key={item.id}
          style={{
            ...typography,
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            color: item.color,
            WebkitTextStroke: `${toCssStrokeWidth(item.outset)}px ${item.color}`,
            paintOrder: "stroke fill",
            opacity: item.opacity,
            // shadow는 가장 뒤 레이어에서 한 번만 그린다.
            textShadow: index === 0 ? shadowCss : undefined,
          }}
        >
          {scene.text}
        </p>
      ))}

      <p
        data-effect-layer="foreground"
        style={{
          ...typography,
          position: "absolute",
          inset: 0,
          color: scene.fill.color,
          opacity: scene.fill.opacity,
          textShadow: orderedStrokes.length === 0 ? shadowCss : undefined,
        }}
      >
        {scene.text}
      </p>
    </div>
  );
}
