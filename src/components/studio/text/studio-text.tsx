"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import { StudioAutoFitText } from "@/components/studio/text/studio-auto-fit-text";
import type { StudioStyleRecord } from "@/types/template-studio";
import {
  shouldRenderStudioTextEffectLayers,
  getStudioDrawableTextStrokes,
  getStudioTextFillRenderStyle,
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
  /** 최대 크기. 보통 style의 `fontSize`다. */
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
   * 모두 같아야 한다. 크기는 자동 크기일 때 `StudioAutoFitText`가 정하므로 여기에 넣지
   * 않는다.
   */
  typography?: React.CSSProperties;
  className?: string;
}

/**
 * 텍스트 효과 레이어 하나가 쓰는 CSS.
 *
 * 외곽선은 중앙 정렬로 그려지므로 절반이 글자 안쪽을 덮는다. `paint-order`로 외곽선을
 * 먼저 그리게 하고, 안쪽으로 들어온 부분은 위에 놓이는 다음 레이어와 foreground가 덮는다.
 * 굵은 stroke의 기본 miter join은 글리프 예각에서 긴 삼각형을 만들므로 round join으로
 * 제한한다. miter limit도 낮춰 round를 무시하는 렌더러의 돌출을 줄인다.
 */
const getStrokeLayerStyle = (
  color: string,
  outset: number,
  opacity: number,
): React.CSSProperties => ({
  color,
  WebkitTextStroke: `${toStudioCssStrokeWidth(outset)}px ${color}`,
  strokeLinejoin: "round",
  strokeMiterlimit: 1,
  paintOrder: "stroke fill",
  opacity,
});

const getShadowFilter = (
  appearance: ResolvedStudioTextAppearance,
): string | undefined => {
  const { shadow } = appearance;
  if (!shadow) return undefined;

  return `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${toStudioCssColor(
    shadow.color,
    shadow.opacity,
  )})`;
};

interface StudioTextEffectLayersProps {
  content: string;
  fillStyle: React.CSSProperties;
  strokes: ReturnType<typeof getStudioDrawableTextStrokes>;
  typography?: React.CSSProperties;
  fillLayer: "fill" | "foreground";
}

/**
 * 고정 크기와 자동 맞춤이 공유하는 텍스트 효과 레이어.
 *
 * `foreground`는 흐름 안에 남는 고정 크기용 접근성 foreground이고, `fill`은 논리 측정
 * span 위에 absolute로 겹치는 자동 맞춤용 시각 레이어다. stroke 필터링·순서·두께 변환·
 * 접근성 및 pointer 차단은 두 경로에서 이 컴포넌트가 동일하게 소유한다. 그림자는 이
 * 컴포넌트 바깥의 root가 자식 전체를 합성한 뒤 한 번만 만든다.
 */
function StudioTextEffectLayers({
  content,
  fillStyle,
  strokes,
  typography,
  fillLayer,
}: StudioTextEffectLayersProps) {
  const isAutoFitLayer = fillLayer === "fill";

  return (
    <>
      {strokes.map((stroke) => (
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
          }}
        >
          {content}
        </span>
      ))}
      <span
        {...(isAutoFitLayer ? { "aria-hidden": "true" } : {})}
        data-effect-layer={fillLayer}
        style={{
          position: isAutoFitLayer ? "absolute" : "relative",
          ...(isAutoFitLayer ? { inset: 0 } : {}),
          ...(isAutoFitLayer ? { pointerEvents: "none" } : {}),
          ...typography,
          ...fillStyle,
        }}
      >
        {content}
      </span>
    </>
  );
}

/**
 * Studio 문서의 글자 하나를 그린다.
 *
 * 채우기, 여러 아웃스트로크, 그림자, 상자에 맞춘 크기를 모두 여기서 다룬다. 크기 정책은
 * 옵션이므로 고정 크기와 자동 크기가 같은 컴포넌트를 쓴다.
 *
 * 효과 레이어는 시각 표현일 뿐이고 문서에는 노드가 하나다. 그래서 레이어 패널에도 하나만
 * 보이고, 선택과 클릭은 노드가 받는다.
 *
 * - 효과 레이어는 클릭을 먹지 않고 보조기기에도 읽히지 않는다.
 * - 읽히는 글자는 foreground 또는 논리 측정 span 하나다. 레이어마다 같은 글자를 노출하면
 *   화면 낭독기가 같은 문장을 여러 번 읽는다.
 * - 외곽선은 appearance.strokes의 저장된 뒤→앞 순서로 그린다.
 * - 그림자는 모든 stroke/fill을 합성한 root에 한 번만 그린다. 그래서 가장 바깥쪽 가시
 *   실루엣을 기준으로 하며, 레이어마다 그려 그림자가 겹쳐 짙어지지 않는다.
 *
 * 자동 크기일 때는 논리 텍스트를 한 번만 재고 레이어가 그 값을 물려받는다. 레이어마다
 * 재면 폰트 로드 시점에 따라 결과가 갈려서 겹쳐 그린 글자가 어긋난다.
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
  const shadowFilter = getShadowFilter(appearance);
  const { fill } = appearance;
  const strokes = getStudioDrawableTextStrokes(appearance.strokes);
  const fillStyle: React.CSSProperties = getStudioTextFillRenderStyle(fill);

  const effectLayers = (
    fillLayer: StudioTextEffectLayersProps["fillLayer"],
  ) => (
    <StudioTextEffectLayers
      content={content}
      fillLayer={fillLayer}
      fillStyle={fillStyle}
      strokes={strokes}
      typography={typography}
    />
  );

  if (autoFit) {
    const wrapMode = getStudioTextWrapMode(autoFit.styleRecord);

    return (
      <StudioAutoFitText
        className={className}
        // 맞춤 경계에 붙지 않게 한다. 붙으면 화면과 내려받은 이미지가 어긋난다.
        fitMargin={STUDIO_TEXT_FIT_MARGIN_PX}
        maxFontSize={autoFit.maxFontSize}
        minFontSize={autoFit.minFontSize}
        multiline={isStudioTextWrapModeMultiline(wrapMode)}
        effectLayers={hasEffectLayers ? effectLayers("fill") : undefined}
        style={{
          ...typography,
          ...(hasEffectLayers
            ? {
                position: "relative",
                ...(shadowFilter ? { filter: shadowFilter } : {}),
                // 실제 텍스트는 측정 span으로 남겨 접근성 트리에서 한 번만 읽힌다.
                color: "transparent",
              }
            : fillStyle),
        }}
        {...(shadowFilter
          ? { "data-studio-text-shadow-source": "composite" }
          : {})}
      >
        {content}
      </StudioAutoFitText>
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
      {...(shadowFilter
        ? { "data-studio-text-shadow-source": "composite" }
        : {})}
      style={{
        position: "relative",
        ...typography,
        ...(shadowFilter ? { filter: shadowFilter } : {}),
      }}
    >
      {effectLayers("foreground")}
    </span>
  );
}
