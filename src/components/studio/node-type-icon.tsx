"use client";

import { Image as ImageIcon, Layers3, Square, Type } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import type { StudioGraphNodeType } from "@/types/template-studio";
import { getStudioNodeDefinition } from "@/utils/template-studio/node-definitions";

export interface StudioNodeTypeIconProps {
  type: StudioGraphNodeType;
  size?: number;
}

/**
 * 노드 종류 아이콘.
 *
 * 어떤 아이콘을 쓸지는 노드 정의표의 `iconKey`가 정하고, 이 컴포넌트는 그 이름을
 * 그림으로 바꾼다. 레이어 트리와 추가 메뉴가 같은 그림을 써야 트리에서 고른 것과
 * 메뉴에서 누른 것이 같은 종류임을 알 수 있다.
 *
 * 종류가 늘었는데 여기에 분기를 더하지 않으면 마지막 줄에서 컴파일이 깨진다.
 */
export function StudioNodeTypeIcon({
  type,
  size = 14,
}: StudioNodeTypeIconProps) {
  const { iconKey } = getStudioNodeDefinition(type);

  if (iconKey === "group") return <Layers3 size={size} />;
  if (iconKey === "image") return <ImageIcon size={size} />;
  if (iconKey === "shape") return <Square size={size} />;
  // 글자 길이에 맞춰 늘어나는 글자. 여느 글자와 구별되게 작은 a를 붙인다.
  if (iconKey === "autoText") {
    return (
      <span>
        T<span className="align-super text-[8px]">a</span>
      </span>
    );
  }
  if (iconKey === "text") return <Type size={size} />;

  const unhandledIconKey: never = iconKey;
  return <span>{String(unhandledIconKey)}</span>;
}
