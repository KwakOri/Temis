"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type {
  StudioTimetableCompositionObjectKind,
  StudioTimetableDayId,
} from "@/types/template-studio";
import {
  expandStudioCollapsedLayerId,
  STUDIO_LAYER_AUTO_EXPAND_DELAY_MS,
} from "@/utils/template-studio/layer-order";
import {
  getStudioTimetableLayerDropBlockedReason,
  getStudioTimetableLayerDropPosition,
  planStudioTimetableLayerDrop,
  shouldAutoExpandStudioTimetableLayer,
  type StudioTimetableLayerDragState,
  type StudioTimetableLayerDropState,
} from "@/utils/template-studio/timetable-layer-drag";
export interface StudioTimetableLayerDragOptions {
  /**
   * 지금 접혀 있는 레이어 id를 읽는다.
   *
   * 접힘 목록은 되돌리기가 되살리지 않는 뷰 설정이라 store가 갖고 있다. 끌고
   * 있는 동안 값이 바뀌어도 핸들러를 다시 만들지 않도록 값이 아니라 함수로 받는다.
   */
  getCollapsedLayerIds: () => string[];
  setCollapsedLayerIds: (updater: (current: string[]) => string[]) => void;
  /** 레이어 id로 composition 객체의 종류를 읽는다. 자동 펼침 대상 판단에만 쓴다. */
  getLayerObjectKind: (
    layerId: string,
  ) => StudioTimetableCompositionObjectKind | null;
  onSelectLayer: (layerId: string) => void;
  /** 요일 카드를 집었을 때 미리보기를 그 요일로 맞춘다. */
  onFocusDay: (dayId: StudioTimetableDayId) => void;
  /** 최상위 객체 순서를 바꾼다. 위치는 저장 순서 기준으로 넘어간다. */
  onMoveRootLayer: (
    sourceLayerId: string,
    targetLayerId: string,
    position: "before" | "after",
  ) => void;
  /** 요일 순서를 바꾼다. 위치는 패널에서 본 그대로 넘어간다. */
  onMoveDayLayer: (
    sourceDayId: StudioTimetableDayId,
    targetDayId: StudioTimetableDayId,
    position: "before" | "after",
  ) => void;
  autoExpandDelayMs?: number;
}
export interface StudioTimetableLayerDrag {
  dragState: StudioTimetableLayerDragState | null;
  dropState: StudioTimetableLayerDropState | null;
  /** 끌기가 끝났을 때. 표시선과 예약해 둔 자동 펼침을 함께 지운다. */
  clearDragState: () => void;
  handleDragStart: (
    event: DragEvent<HTMLElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => void;
  /** 레이어 행 위를 지날 때. 행 가운데를 기준으로 위/아래를 정한다. */
  handleDragOver: (
    event: DragEvent<HTMLElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => void;
  /** 행 사이 표시선 위를 지날 때. 위치는 표시선이 정해 놓은 값을 쓴다. */
  handleIndicatorDragOver: (
    event: DragEvent<HTMLElement>,
    layerId: string,
    position: "before" | "after",
    dayId?: StudioTimetableDayId,
  ) => void;
  handleDrop: (
    event: DragEvent<HTMLElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => void;
}
/**
 * 시간표 레이어 패널의 끌어 옮기기 규칙.
 *
 * 최상위 객체 순서와 요일 순서는 저장되는 값이 다르므로 집는 순간 어느 쪽인지
 * 정해서 끝까지 그 규칙만 쓴다. 순서를 실제로 바꾸는 일은 문서를 고치는 쪽이
 * 하고, 이 훅은 어디에 놓을 수 있는지와 무엇을 보여줄지만 정한다.
 *
 * 판단 로직은 순수 함수로 빼 두었다. 이 저장소에는 DOM 테스트 환경이 없어서
 * 훅을 직접 부를 수 없기 때문이다. 여기 남은 것은 React 상태와 타이머다.
 */
export function useStudioTimetableLayerDrag({
  getCollapsedLayerIds,
  setCollapsedLayerIds,
  getLayerObjectKind,
  onSelectLayer,
  onFocusDay,
  onMoveRootLayer,
  onMoveDayLayer,
  autoExpandDelayMs = STUDIO_LAYER_AUTO_EXPAND_DELAY_MS,
}: StudioTimetableLayerDragOptions): StudioTimetableLayerDrag {
  const [dragState, setDragState] =
    useState<StudioTimetableLayerDragState | null>(null);
  const [dropState, setDropState] =
    useState<StudioTimetableLayerDropState | null>(null);
  /**
   * 끌고 있는 레이어를 상태와 별도로 들고 있는다.
   *
   * dragover는 상태가 반영되기 전에도 이어서 들어온다. 상태만 보면 끌기가
   * 시작된 직후의 첫 몇 번을 놓친다.
   */
  const dragStateRef = useRef<StudioTimetableLayerDragState | null>(null);
  const autoExpandTimerRef = useRef<number | null>(null);
  const autoExpandTargetRef = useRef<string | null>(null);
  /**
   * 언마운트 때 예약해 둔 자동 펼침을 지운다.
   *
   * 남겨 두면 패널이 사라진 뒤에 접힘 목록이 바뀌어, 다시 열었을 때 펼쳐진
   * 이유를 알 수 없는 상태가 된다.
   */
  useEffect(
    () => () => {
      if (autoExpandTimerRef.current !== null) {
        window.clearTimeout(autoExpandTimerRef.current);
      }
    },
    [],
  );
  const clearDragState = useCallback(() => {
    if (autoExpandTimerRef.current !== null) {
      window.clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    autoExpandTargetRef.current = null;
    dragStateRef.current = null;
    setDragState(null);
    setDropState(null);
  }, []);
  const scheduleAutoExpand = useCallback(
    (layerId: string, shouldExpand: boolean) => {
      if (!shouldExpand) {
        // 예약해 둔 대상에서 벗어났을 때만 취소한다. 다른 행 위에 있었다면
        // 그쪽 예약을 건드릴 이유가 없다.
        if (autoExpandTargetRef.current === layerId) {
          if (autoExpandTimerRef.current !== null) {
            window.clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
          autoExpandTargetRef.current = null;
        }
        return;
      }
      // 같은 행 위에 계속 머무는 동안 시간이 다시 흐르지 않게 한다.
      if (autoExpandTargetRef.current === layerId) return;
      if (autoExpandTimerRef.current !== null) {
        window.clearTimeout(autoExpandTimerRef.current);
      }
      autoExpandTargetRef.current = layerId;
      autoExpandTimerRef.current = window.setTimeout(() => {
        setCollapsedLayerIds((currentLayerIds) =>
          expandStudioCollapsedLayerId(currentLayerIds, layerId),
        );
        autoExpandTimerRef.current = null;
        autoExpandTargetRef.current = null;
      }, autoExpandDelayMs);
    },
    [autoExpandDelayMs, setCollapsedLayerIds],
  );
  const handleDragStart = useCallback(
    (
      event: DragEvent<HTMLElement>,
      layerId: string,
      dayId?: StudioTimetableDayId,
    ) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", layerId);
      const nextDragState: StudioTimetableLayerDragState = {
        layerId,
        scope: dayId ? "day" : "root",
        dayId,
      };
      dragStateRef.current = nextDragState;
      setDragState(nextDragState);
      onSelectLayer(layerId);
      if (dayId) onFocusDay(dayId);
    },
    [onFocusDay, onSelectLayer],
  );
  const handleDragOver = useCallback(
    (
      event: DragEvent<HTMLElement>,
      layerId: string,
      dayId?: StudioTimetableDayId,
    ) => {
      const currentDragState = dragStateRef.current ?? dragState;
      if (!currentDragState) return;
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      const position = getStudioTimetableLayerDropPosition(
        event.clientY,
        bounds,
      );
      const blockedReason = getStudioTimetableLayerDropBlockedReason(
        currentDragState,
        layerId,
        dayId,
      );
      scheduleAutoExpand(
        layerId,
        shouldAutoExpandStudioTimetableLayer({
          targetDayId: dayId,
          targetObjectKind: getLayerObjectKind(layerId),
          blockedReason,
          collapsed: getCollapsedLayerIds().includes(layerId),
        }),
      );
      event.dataTransfer.dropEffect = blockedReason ? "none" : "move";
      setDropState({ layerId, position, blockedReason });
    },
    [dragState, getCollapsedLayerIds, getLayerObjectKind, scheduleAutoExpand],
  );
  const handleIndicatorDragOver = useCallback(
    (
      event: DragEvent<HTMLElement>,
      layerId: string,
      position: "before" | "after",
      dayId?: StudioTimetableDayId,
    ) => {
      const currentDragState = dragStateRef.current ?? dragState;
      if (!currentDragState) return;
      event.preventDefault();
      // 표시선은 행 위에 겹쳐 있다. 행의 dragover까지 이어지면 위치가 곧바로
      // 행 기준으로 덮어써진다.
      event.stopPropagation();
      const blockedReason = getStudioTimetableLayerDropBlockedReason(
        currentDragState,
        layerId,
        dayId,
      );
      // 행 사이에 놓으려는 중이므로 그 묶음을 펼칠 이유가 없다.
      scheduleAutoExpand(layerId, false);
      event.dataTransfer.dropEffect = blockedReason ? "none" : "move";
      setDropState({ layerId, position, blockedReason });
    },
    [dragState, scheduleAutoExpand],
  );
  const handleDrop = useCallback(
    (
      event: DragEvent<HTMLElement>,
      targetLayerId: string,
      targetDayId?: StudioTimetableDayId,
    ) => {
      event.preventDefault();
      const currentDragState = dragStateRef.current ?? dragState;
      const currentDropState = dropState;
      const plan =
        currentDragState && currentDropState
          ? planStudioTimetableLayerDrop(
              currentDragState,
              currentDropState,
              targetLayerId,
              targetDayId,
            )
          : { kind: "none" as const };
      // 옮기기 전에 표시선을 먼저 지운다. 문서가 바뀌면 트리가 다시 그려지는데
      // 그때까지 표시선이 남아 있으면 옮긴 자리와 어긋난 곳을 가리킨다.
      clearDragState();
      if (plan.kind === "root") {
        onMoveRootLayer(plan.sourceLayerId, plan.targetLayerId, plan.position);
        return;
      }
      if (plan.kind === "day") {
        onMoveDayLayer(plan.sourceDayId, plan.targetDayId, plan.position);
      }
    },
    [clearDragState, dragState, dropState, onMoveDayLayer, onMoveRootLayer],
  );
  return {
    dragState,
    dropState,
    clearDragState,
    handleDragStart,
    handleDragOver,
    handleIndicatorDragOver,
    handleDrop,
  };
}
