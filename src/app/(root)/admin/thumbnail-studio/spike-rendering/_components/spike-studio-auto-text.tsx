"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { useCallback, useEffect, useRef, useState } from "react";

import { StudioText } from "@/components/studio/text/studio-text";
import { resolveStudioTextAppearance } from "@/utils/template-studio/text-appearance";

import type { SpikeScene } from "./spike-scenes";
import type { SpikeTextMeasurement } from "./spike-text";

interface SpikeStudioAutoTextProps {
  scene: SpikeScene;
  onMeasure?: (measurement: SpikeTextMeasurement) => void;
}

/**
 * 제품의 Auto Text를 스파이크 하니스 안에서 그린다.
 *
 * `SpikeText`는 Phase 3이 만들 렌더러의 프로토타입이라 자체 이분 탐색과
 * `pre-wrap`을 쓴다. 제품 경로는 다르다. `StudioRenderer`가 `flexibleText`를
 * `StudioAutoText` → `AutoResizeText`로 그리고, 그쪽은 `maxLines` 없이 불리므로
 * 0.5px씩 줄이는 선형 탐색과 `white-space: pre`를 쓴다.
 *
 * 그래서 두 경로는 크기를 정하는 방법도, 줄이 나뉘는 조건도 다르다. 프로토타입만
 * 재 보면 실제로 사용자에게 나가는 PNG가 어떤지 알 수 없다. 이 컴포넌트는 크기를
 * 직접 계산하지 않는다. 제품 컴포넌트가 정한 결과를 읽어서 보고만 한다.
 *
 * 호출 방식은 `StudioRenderer`의 `flexibleText` 갈래와 같게 맞춘다. 여기서만
 * 다르게 부르면 재 본 값이 제품 값이 아니다.
 */
export function SpikeStudioAutoText({
  scene,
  onMeasure,
}: SpikeStudioAutoTextProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [fontsReady, setFontsReady] = useState(false);

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

  const report = useCallback(() => {
    const textElement = boxRef.current?.querySelector("p");
    if (!textElement) return;

    const computed = window.getComputedStyle(textElement);
    const resolvedFontSize = Number.parseFloat(computed.fontSize);
    const computedLineHeight = Number.parseFloat(computed.lineHeight);
    const lineHeightPx =
      Number.isFinite(computedLineHeight) && computedLineHeight > 0
        ? computedLineHeight
        : resolvedFontSize * scene.lineHeight;

    onMeasure?.({
      fontSize: resolvedFontSize,
      lineHeightPx,
      lineCount: Math.max(
        1,
        Math.round(textElement.scrollHeight / lineHeightPx),
      ),
      contentWidth: textElement.scrollWidth,
      contentHeight: textElement.scrollHeight,
      fontsReady,
    });
  }, [fontsReady, onMeasure, scene.lineHeight]);

  /**
   * 제품 컴포넌트가 크기를 정한 뒤에 읽는다.
   *
   * `AutoResizeText`는 effect에서 크기를 정하고 상태로 반영하므로, 같은 렌더에
   * 붙은 layout effect로 읽으면 아직 최대 크기가 잡혀 있다. 폰트가 준비되는 시점도
   * 뒤이므로 준비 상태가 바뀔 때 다시 읽는다.
   */
  useEffect(() => {
    const frame = window.requestAnimationFrame(report);
    return () => window.cancelAnimationFrame(frame);
  }, [report]);

  return (
    <div
      data-spike-studio-auto-text={scene.id}
      ref={boxRef}
      style={{
        position: "absolute",
        left: scene.box.left,
        top: scene.box.top,
        width: scene.box.width,
        height: scene.box.height,
        // 제품에서는 노드 style의 display/alignItems가 여기에 온다.
        display: "flex",
        alignItems: "center",
      }}
    >
      <StudioText
        appearance={resolveStudioTextAppearance(
          {},
          { color: scene.fill.color },
        )}
        autoFit={{
          maxFontSize: scene.fontSize ?? scene.autoFit?.max ?? 24,
          minFontSize: 10,
          styleRecord: scene.textWrapMode
            ? { textWrapMode: scene.textWrapMode }
            : undefined,
        }}
        className="m-0 block w-full leading-tight"
        text={scene.text}
        typography={{
          fontFamily: `"${scene.fontFamily}"`,
          fontWeight: scene.fontWeight,
          letterSpacing: 0,
          lineHeight: scene.lineHeight,
          textAlign: scene.align,
        }}
      />
    </div>
  );
}
