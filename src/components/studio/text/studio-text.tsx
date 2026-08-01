"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import type { StudioStyleRecord } from "@/types/template-studio";
import {
  shouldRenderStudioTextEffectLayers,
  getStudioDrawableTextStrokes,
  toStudioCssColor,
  toStudioCssStrokeWidth,
  type ResolvedStudioTextAppearance,
} from "@/utils/template-studio/text-appearance";
import { STUDIO_TEXT_FIT_MARGIN_PX } from "@/utils/template-studio/text-layout";
import {
  getStudioTextWrapMode,
  isStudioTextWrapModeMultiline,
} from "@/utils/template-studio/text-wrap";

/**
 * 빈 글자도 상자가 보이게 하는 공백.
 *
 * 아무것도 그리지 않으면 줄 높이가 0이 되어 상자가 접힌다. 그러면 캔버스에서 그 노드를
 * 다시 고를 수 없다.
 */
const EMPTY_TEXT_PLACEHOLDER = "\u00a0";

/**
 * 상자에 맞춰 크기를 줄이는 설정.
 *
 * 넘기지 않으면 고정 크기다. 크기 정책은 옵션이고 컴포넌트가 갈리지 않는다.
 */
export interface StudioTextAutoFit {
  /** 시작 크기. 보통 style의 `fontSize`다. */
  maxFontSize: number;
  minFontSize: number;
  /** 줄바꿈 모드를 읽을 style. 없으면 개행을 지키는 기본 모드로 본다. */
  styleRecord?: StudioStyleRecord;
}

export interface StudioTextProps {
  text: string;
  appearance: ResolvedStudioTextAppearance;
  /** 넘기면 상자에 맞춰 크기를 줄인다. 없으면 style에 적힌 크기를 그대로 쓴다. */
  autoFit?: StudioTextAutoFit;
  /**
   * 모든 레이어가 함께 쓰는 글자 표현.
   *
   * 레이어마다 다른 값을 주면 겹쳐 그린 글자가 어긋난다. 글꼴, 굵기, 줄 높이, 정렬이
   * 모두 같아야 한다. 크기는 자동 크기일 때 `AutoResizeText`가 정하므로 여기에 넣지 않는다.
   */
  typography?: React.CSSProperties;
  className?: string;
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

const getShadowCss = (
  appearance: ResolvedStudioTextAppearance,
): string | undefined => {
  const { shadow } = appearance;
  if (!shadow) return undefined;

  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${toStudioCssColor(
    shadow.color,
    shadow.opacity,
  )}`;
};

/**
 * Studio 문서의 글자 하나를 그린다.
 *
 * 채우기, 여러 아웃스트로크, 그림자, 상자에 맞춘 크기를 모두 여기서 다룬다. 크기 정책은
 * 옵션이므로 고정 크기와 자동 크기가 같은 컴포넌트를 쓴다. 예전에는 둘이 갈려 있어서 효과를
 * 그리는 코드가 두 벌이 될 뻔했다.
 *
 * 효과 레이어는 시각 표현일 뿐이고 문서에는 노드가 하나다. 그래서 레이어 패널에도 하나만
 * 보이고, 선택과 클릭은 노드가 받는다.
 *
 * - 효과 레이어는 클릭을 먹지 않고 보조기기에도 읽히지 않는다.
 * - 읽히는 글자는 foreground 하나다. 레이어마다 같은 글자를 노출하면 화면 낭독기가 같은
 *   문장을 여러 번 읽는다.
 * - 외곽선은 appearance.strokes의 저장된 뒤→앞 순서로 그린다.
 * - 그림자는 가장 뒤 레이어에서 한 번만 그린다. 레이어마다 그리면 그림자가 겹쳐 짙어진다.
 *
 * 자동 크기일 때는 크기를 한 번만 재고 레이어가 그 값을 물려받는다. 레이어마다 재면 폰트
 * 로드 시점에 따라 결과가 갈려서 겹쳐 그린 글자가 어긋난다.
 *
 * 저장된 효과가 없으면 감싸는 요소를 만들지 않는다. 요소를 하나 더하는 것만으로도 지금까지
 * 그려 온 문서의 배치가 달라질 수 있다. 효과를 쓰지 않는 기존 문서는 결과가 그대로여야 한다.
 */
export function StudioText({
  text,
  appearance,
  autoFit,
  typography,
  className,
}: StudioTextProps) {
  const content = text || EMPTY_TEXT_PLACEHOLDER;
  const hasEffectLayers = shouldRenderStudioTextEffectLayers(appearance);
  const shadowCss = getShadowCss(appearance);
  const { fill } = appearance;
  const strokes = getStudioDrawableTextStrokes(appearance.strokes);
  const shadowLayerIndex = strokes.findIndex(
    (stroke) => stroke.opacity > 0 && Number.isFinite(stroke.opacity),
  );
  const shadowOnForeground = shadowLayerIndex < 0;
  const fillStyle: React.CSSProperties = {
    ...(fill.color ? { color: fill.color } : {}),
    opacity: fill.opacity,
  };

  /**
   * 겹쳐 그릴 외곽선 레이어.
   *
   * 고정 크기와 자동 크기가 같은 목록을 쓴다. 다른 점은 크기를 어디서 물려받는지뿐이다.
   */
  const strokeLayers = strokes.map((stroke, index) => (
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
        textShadow: index === shadowLayerIndex ? shadowCss : undefined,
      }}
    >
      {content}
    </span>
  ));

  if (autoFit) {
    const wrapMode = getStudioTextWrapMode(autoFit.styleRecord);

    return (
      <AutoResizeText
        className={className}
        // 맞춤 경계에 붙지 않게 한다. 붙으면 화면과 내려받은 이미지가 어긋난다.
        fitMargin={STUDIO_TEXT_FIT_MARGIN_PX}
        maxFontSize={autoFit.maxFontSize}
        minFontSize={autoFit.minFontSize}
        multiline={isStudioTextWrapModeMultiline(wrapMode)}
        /*
         * 레이어를 글자 요소 안에 넣어 정한 크기를 물려받게 한다. 효과가 없으면 넘기지 않아
         * 지금까지와 같은 결과가 나온다.
         */
        overlay={
          hasEffectLayers ? (
            <>
              {strokeLayers}
              <span
                aria-hidden="true"
                data-effect-layer="fill"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  ...typography,
                  ...fillStyle,
                  textShadow: shadowOnForeground ? shadowCss : undefined,
                }}
              >
                {content}
              </span>
            </>
          ) : undefined
        }
        style={{
          ...typography,
          ...(hasEffectLayers
            ? {
                position: "relative",
                /*
                 * 자동 크기에서는 글자 요소 자체가 크기를 재는 자리다. 그 요소를 지우거나
                 * 감출 수 없으므로, 효과가 있을 때는 색을 비우고 위에 겹친 레이어가 보이게
                 * 한다. 이 요소가 낭독되는 글자로 남는다.
                 */
                color: "transparent",
              }
            : fillStyle),
        }}
      >
        {content}
      </AutoResizeText>
    );
  }

  if (!hasEffectLayers) {
    if (appearance.source === "legacyStyle") return <>{content}</>;

    return (
      <span
        className={className}
        data-studio-text-node="true"
        data-effect-layer="foreground"
        style={{ ...typography, ...fillStyle }}
      >
        {content}
      </span>
    );
  }

  return (
    <span
      className={className}
      data-studio-text-node="true"
      style={{ position: "relative", ...typography }}
    >
      {strokeLayers}
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
          ...fillStyle,
          // 외곽선이 없으면 이 레이어가 가장 뒤이므로 그림자를 여기서 그린다.
          textShadow: shadowOnForeground ? shadowCss : undefined,
        }}
      >
        {content}
      </span>
    </span>
  );
}
