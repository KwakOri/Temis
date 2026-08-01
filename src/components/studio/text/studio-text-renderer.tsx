"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import {
  shouldRenderStudioTextEffectLayers,
  toStudioCssColor,
  toStudioCssStrokeWidth,
  type ResolvedStudioTextAppearance,
} from "@/utils/template-studio/text-appearance";

/**
 * 빈 글자도 상자가 보이게 하는 공백.
 *
 * 아무것도 그리지 않으면 줄 높이가 0이 되어 상자가 접힌다. 그러면 캔버스에서 그 노드를
 * 다시 고를 수 없다.
 */
const EMPTY_TEXT_PLACEHOLDER = "\u00a0";

export interface StudioTextRendererProps {
  text: string;
  appearance: ResolvedStudioTextAppearance;
  /**
   * 모든 레이어가 함께 쓰는 글자 표현.
   *
   * 레이어마다 다른 값을 주면 겹쳐 그린 글자가 어긋난다. 글꼴, 크기, 줄 높이, 정렬,
   * 줄바꿈이 모두 같아야 한다.
   */
  typography?: React.CSSProperties;
}

/**
 * 텍스트 효과 레이어 하나가 쓰는 CSS.
 *
 * 외곽선은 중앙 정렬로 그려지므로 절반이 글자 안쪽을 덮는다. `paint-order`로 외곽선을
 * 먼저 그리게 하고, 안쪽으로 들어온 부분은 위에 놓이는 다음 레이어와 foreground가 덮는다.
 */
const getStrokeLayerStyle = (
  color: string,
  outset: number,
  opacity: number,
): React.CSSProperties => ({
  color,
  WebkitTextStroke: `${toStudioCssStrokeWidth(outset)}px ${color}`,
  paintOrder: "stroke fill",
  opacity,
});

/**
 * 논리 텍스트 하나를 효과와 함께 그린다.
 *
 * 레이어 구조는 시각 표현일 뿐이고 문서에는 노드가 하나다. 그래서 레이어 패널에도 하나만
 * 보이고, 선택과 클릭은 노드가 받는다.
 *
 * - 효과 레이어는 클릭을 먹지 않고 보조기기에도 읽히지 않는다.
 * - 읽히는 글자는 foreground 하나다. 레이어마다 같은 글자를 노출하면 화면 낭독기가 같은
 *   문장을 여러 번 읽는다.
 * - 외곽선은 두꺼운 것부터 뒤에 그린다. 순서는 resolver가 정한다.
 * - 그림자는 가장 뒤 레이어에서 한 번만 그린다. 레이어마다 그리면 그림자가 겹쳐 짙어진다.
 *
 * 저장된 효과가 없으면 아무것도 감싸지 않고 글자만 그린다. 감싸는 요소를 만들면 지금까지
 * 그려 온 문서의 배치가 달라질 수 있다. 효과를 쓰지 않는 기존 문서는 결과가 그대로여야 한다.
 */
export function StudioTextRenderer({
  text,
  appearance,
  typography,
}: StudioTextRendererProps) {
  const content = text || EMPTY_TEXT_PLACEHOLDER;

  if (!shouldRenderStudioTextEffectLayers(appearance)) {
    return <>{content}</>;
  }

  const { strokes, shadow, fill } = appearance;
  const shadowCss = shadow
    ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${toStudioCssColor(
        shadow.color,
        shadow.opacity,
      )}`
    : undefined;

  return (
    <span
      data-studio-text-node="true"
      style={{ position: "relative", ...typography }}
    >
      {strokes.map((stroke, index) => (
        <span
          aria-hidden="true"
          data-effect-layer={`stroke:${stroke.id}`}
          key={stroke.id}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            ...typography,
            ...getStrokeLayerStyle(stroke.color, stroke.outset, stroke.opacity),
            // 가장 뒤 레이어에서만 그림자를 그린다.
            textShadow: index === 0 ? shadowCss : undefined,
          }}
        >
          {content}
        </span>
      ))}
      {/*
       * foreground는 흐름 안에 남는다. 이 요소가 감싸는 상자의 크기를 정하고, 효과 레이어는
       * 그 상자를 덮는다. 모두 absolute로 만들면 상자 크기가 0이 되어 배치가 무너진다.
       *
       * `position: relative`가 필요한 이유는 그리는 순서다. absolute 레이어는 흐름 안의
       * 내용보다 나중에 그려지므로, foreground가 자리를 잡지 않으면 외곽선이 글자 위를 덮는다.
       */}
      <span
        data-effect-layer="foreground"
        style={{
          position: "relative",
          ...typography,
          ...(fill.color ? { color: fill.color } : {}),
          opacity: fill.opacity,
          // 외곽선이 없으면 이 레이어가 가장 뒤이므로 그림자를 여기서 그린다.
          textShadow: strokes.length === 0 ? shadowCss : undefined,
        }}
      >
        {content}
      </span>
    </span>
  );
}
