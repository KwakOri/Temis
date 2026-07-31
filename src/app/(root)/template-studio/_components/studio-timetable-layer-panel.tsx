"use client";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { useMemo } from "react";
import {
  StudioLayerDropIndicator,
  StudioLayerPanelFrame,
} from "@/components/studio/layers/studio-layer-primitives";
import type {
  StudioTimetableComposition,
  StudioTimetableCompositionObjectKind,
  StudioTimetableDayDefinition,
  StudioTimetableDayId,
} from "@/types/template-studio";
import { getStudioLayerPanelOrder } from "@/utils/template-studio/layer-order";
import { getStudioTimetableDayCardLayerId } from "@/utils/template-studio/timetable-commands";
import { getStudioTimetableObjectRenderableChildIds } from "@/utils/template-studio/timetable-composition";
import type { StudioTimetableLayerDropState } from "@/utils/template-studio/timetable-layer-drag";
import { StudioTimetableLayerRow } from "./studio-timetable-layer-row";

/**
 * 레이어 행에 보여줄 종류 이름.
 *
 * 요일 카드 묶음은 자식이 문서에 없고 요일 목록에서 만들어지지만, 패널에서는
 * 여느 묶음과 똑같이 접고 펼치는 것이라 group으로 묶어 부른다. 사진 자리를 쓰는
 * 종류는 이름이 달라도 image로 모은다. 사용자가 무엇을 채워야 하는지가 같기 때문이다.
 */
export const getStudioTimetableLayerTypeLabel = (
  kind: StudioTimetableCompositionObjectKind,
): string => {
  if (kind === "generatedDayCards" || kind === "group") return "group";
  if (kind === "profileBlock") return "block";
  if (kind === "image" || kind === "topObject") return "image";
  if (kind === "flexibleText") return "auto text";
  return "text";
};

export interface StudioTimetableLayerPanelProps {
  composition: StudioTimetableComposition;
  /** order로 이미 정렬한 요일 목록. 요일 카드는 이 순서 그대로 보여 준다. */
  days: StudioTimetableDayDefinition[];
  selectedLayerId: string | null;
  collapsedLayerIds: string[];
  /** 지금 가리키는 드롭 자리. 표시선을 어디에 그릴지가 여기서 정해진다. */
  dropState: StudioTimetableLayerDropState | null;
  onSelectLayer: (layerId: string) => void;
  onToggleCollapsed: (layerId: string) => void;
  /** 요일 카드를 골랐을 때. 미리보기가 그 요일을 보게 한다. */
  onFocusDay: (dayId: StudioTimetableDayId) => void;
  onLayerDragStart: (
    event: React.DragEvent<HTMLElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => void;
  onLayerDragOver: (
    event: React.DragEvent<HTMLElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => void;
  onLayerDragEnd: () => void;
  onLayerDrop: (
    event: React.DragEvent<HTMLElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => void;
  onIndicatorDragOver: (
    event: React.DragEvent<HTMLElement>,
    layerId: string,
    position: "before" | "after",
    dayId?: StudioTimetableDayId,
  ) => void;
}

/**
 * 시간표 composition 레이어 패널.
 *
 * 최상위 객체만 끌어 옮길 수 있고, 요일 카드는 요일 카드 묶음 안에서만 옮길 수
 * 있다. 그래서 드래그 관련 표현은 root 깊이와 요일 카드 행에만 붙는다. 묶음 안의
 * 자식 객체는 문서에서 부모가 정한 자리에 있어야 하므로 집을 수 없다.
 *
 * 옮기기 규칙 자체는 이 컴포넌트가 갖고 있지 않다. 무엇을 보여줄지만 정하고,
 * 놓을 수 있는지와 실제로 무엇을 옮길지는 호출한 쪽의 훅이 정한다.
 */
export function StudioTimetableLayerPanel({
  composition,
  days,
  selectedLayerId,
  collapsedLayerIds,
  dropState,
  onSelectLayer,
  onToggleCollapsed,
  onFocusDay,
  onLayerDragStart,
  onLayerDragOver,
  onLayerDragEnd,
  onLayerDrop,
  onIndicatorDragOver,
}: StudioTimetableLayerPanelProps) {
  const collapsedLayerIdsSet = useMemo(
    () => new Set(collapsedLayerIds),
    [collapsedLayerIds],
  );

  const renderDropIndicator = (
    layerId: string,
    depth: number,
    position: "before" | "after",
    dayId?: StudioTimetableDayId,
  ) => {
    const isActive =
      dropState?.layerId === layerId && dropState.position === position;
    if (!isActive) return null;

    return (
      <StudioLayerDropIndicator
        blockedReason={dropState?.blockedReason}
        depth={depth}
        key={`${layerId}:${position}:drop`}
        position={position}
        onDragOver={(event) =>
          onIndicatorDragOver(event, layerId, position, dayId)
        }
        onDrop={(event) => onLayerDrop(event, layerId, dayId)}
      />
    );
  };

  /**
   * 객체 하나와 그 아래를 그린다.
   *
   * `visitedObjectIds`로 이미 지나온 객체를 기억한다. 묶음이 자기 조상을 자식으로
   * 갖는 문서가 들어오면 재귀가 끝나지 않아 편집기 전체가 멈춘다.
   */
  const renderObject = (
    objectId: string,
    depth = 0,
    parentHidden = false,
    visitedObjectIds = new Set<string>(),
  ): React.ReactNode => {
    if (visitedObjectIds.has(objectId)) return null;

    const object = composition.objects[objectId];
    if (!object) return null;

    const nextVisitedObjectIds = new Set(visitedObjectIds);
    nextVisitedObjectIds.add(objectId);
    const isRoot = depth === 0;
    const isGeneratedDayCards = object.kind === "generatedDayCards";
    const childIds =
      object.kind === "group"
        ? getStudioTimetableObjectRenderableChildIds(object)
        : [];
    const isGroup = isGeneratedDayCards || object.kind === "group";
    const isCollapsed = collapsedLayerIdsSet.has(object.id);
    // 숨김은 아래로 물려받는다. 부모를 숨기면 자식도 화면에 나오지 않는다.
    const hidden = parentHidden || Boolean(object.hidden);
    const blockedReason =
      isRoot && dropState?.layerId === objectId
        ? dropState.blockedReason
        : null;

    return (
      <React.Fragment key={object.id}>
        {isRoot ? renderDropIndicator(object.id, depth, "before") : null}
        <StudioTimetableLayerRow
          blockedReason={blockedReason}
          collapsed={isCollapsed}
          collapsible={
            isGeneratedDayCards ||
            (object.kind === "group" && childIds.length > 0)
          }
          depth={depth}
          draggable={isRoot}
          hidden={hidden}
          id={object.id}
          key={object.id}
          label={object.label}
          selectedLayerId={selectedLayerId}
          type={getStudioTimetableLayerTypeLabel(object.kind)}
          onDragEnd={isRoot ? onLayerDragEnd : undefined}
          onDragOver={
            isRoot ? (event) => onLayerDragOver(event, object.id) : undefined
          }
          onDragStart={
            isRoot ? (event) => onLayerDragStart(event, object.id) : undefined
          }
          onDrop={isRoot ? (event) => onLayerDrop(event, object.id) : undefined}
          onSelectLayer={onSelectLayer}
          onToggleCollapsed={
            isGroup ? () => onToggleCollapsed(object.id) : undefined
          }
        />
        {!isCollapsed && isGeneratedDayCards
          ? days.map((day) => {
              // 요일 카드는 composition object가 아니라 요일을 가리킨다. 인스펙터가
              // 어느 쪽을 골랐는지 이 id 규칙으로 갈라 읽는다.
              const layerId = getStudioTimetableDayCardLayerId(day.id);
              const dayBlockedReason =
                dropState?.layerId === layerId ? dropState.blockedReason : null;

              return (
                <React.Fragment key={day.id}>
                  {renderDropIndicator(layerId, depth + 1, "before", day.id)}
                  <StudioTimetableLayerRow
                    blockedReason={dayBlockedReason}
                    depth={depth + 1}
                    draggable
                    hidden={hidden}
                    id={layerId}
                    key={layerId}
                    label={`${day.shortLabel ?? day.label} Card`}
                    selectedLayerId={selectedLayerId}
                    type="day"
                    onDragEnd={onLayerDragEnd}
                    onDragOver={(event) =>
                      onLayerDragOver(event, layerId, day.id)
                    }
                    onDragStart={(event) =>
                      onLayerDragStart(event, layerId, day.id)
                    }
                    onDrop={(event) => onLayerDrop(event, layerId, day.id)}
                    onSelectLayer={onSelectLayer}
                    onSelect={() => onFocusDay(day.id)}
                  />
                  {renderDropIndicator(layerId, depth + 1, "after", day.id)}
                </React.Fragment>
              );
            })
          : null}
        {!isCollapsed && object.kind === "group"
          ? getStudioLayerPanelOrder(childIds).map((childId) =>
              renderObject(childId, depth + 1, hidden, nextVisitedObjectIds),
            )
          : null}
        {isRoot ? renderDropIndicator(object.id, depth, "after") : null}
      </React.Fragment>
    );
  };

  return (
    <StudioLayerPanelFrame
      summary={`${composition.rootObjectIds.length} placed objects`}
      title="Timetable Layers"
    >
      {getStudioLayerPanelOrder(composition.rootObjectIds).map((objectId) =>
        renderObject(objectId),
      )}
    </StudioLayerPanelFrame>
  );
}
