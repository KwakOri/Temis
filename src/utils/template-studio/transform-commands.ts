import type { StudioTemplateDocument } from "@/types/template-studio";
import {
  getStudioNodeBounds,
  getStudioNodeVisualBoundsInCanvas,
} from "@/utils/template-studio/graph-nodes";

/** 크기를 줄일 수 있는 한계. 0이 되면 화면에서 사라지고 다시 잡을 수 없다. */
export const STUDIO_MIN_NODE_SIZE = 4;

/** 캔버스를 줄일 수 있는 한계. */
export const STUDIO_MIN_CANVAS_SIZE = 16;

export type StudioResizeHandle =
  "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** 모서리와 변 손잡이. 화면이 이 순서대로 그린다. */
export const STUDIO_RESIZE_HANDLES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const satisfies readonly StudioResizeHandle[];

export interface StudioResizeGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clampSize = (value: number, minSize: number): number =>
  Number.isFinite(value) ? Math.max(value, minSize) : minSize;

/**
 * 손잡이가 가로·세로 중 어느 쪽을 어느 방향으로 늘리는지.
 *
 * `-1`은 시작 쪽 변을 움직인다는 뜻이고 `1`은 끝 쪽 변을 움직인다는 뜻이다. `0`인
 * 축은 그대로 둔다.
 */
const getHandleFactors = (
  handle: StudioResizeHandle,
): { horizontal: -1 | 0 | 1; vertical: -1 | 0 | 1 } => ({
  horizontal: handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0,
  vertical: handle.startsWith("n") ? -1 : handle.startsWith("s") ? 1 : 0,
});

/**
 * 손잡이를 끈 만큼의 새 사각형.
 *
 * 반대쪽 변은 고정한다. 그러지 않으면 오른쪽 손잡이를 끌 때 왼쪽 변까지 따라 움직여
 * 객체가 미끄러진다. 움직이지 않는 축은 시작 위치를 그대로 지킨다.
 *
 * 비율을 잠그면 가로가 기준이 되고, 위아래 변만 끌 때는 세로가 기준이 된다. 끌고 있는
 * 축을 기준으로 삼지 않으면 손을 움직인 방향과 크기 변화가 어긋난다.
 */
export const resolveStudioResizeGeometry = ({
  start,
  handle,
  deltaX = 0,
  deltaY = 0,
  lockAspectRatio = false,
  minSize = STUDIO_MIN_NODE_SIZE,
}: {
  start: StudioResizeGeometry;
  handle: StudioResizeHandle;
  /** 변 손잡이는 한 축만 쓰므로 나머지 축은 넘기지 않아도 된다. */
  deltaX?: number;
  deltaY?: number;
  lockAspectRatio?: boolean;
  minSize?: number;
}): StudioResizeGeometry => {
  const { horizontal, vertical } = getHandleFactors(handle);
  const startWidth = clampSize(start.width, minSize);
  const startHeight = clampSize(start.height, minSize);

  let width = clampSize(startWidth + horizontal * deltaX, minSize);
  let height = clampSize(startHeight + vertical * deltaY, minSize);

  if (lockAspectRatio) {
    const aspectRatio = startWidth / startHeight;
    if (horizontal === 0) {
      width = clampSize(height * aspectRatio, minSize);
      height = clampSize(width / aspectRatio, minSize);
    } else {
      height = clampSize(width / aspectRatio, minSize);
      width = clampSize(height * aspectRatio, minSize);
    }
  }

  return {
    left: horizontal === -1 ? start.left + (startWidth - width) : start.left,
    top: vertical === -1 ? start.top + (startHeight - height) : start.top,
    width,
    height,
  };
};

/**
 * 화면에서 끈 거리를 객체 기준 거리로 바꾼다.
 *
 * 회전한 객체는 화면의 오른쪽이 객체의 오른쪽이 아니다. 그대로 쓰면 오른쪽 손잡이를
 * 오른쪽으로 끌었는데 위아래 크기가 바뀐다.
 */
export const rotateStudioDelta = ({
  deltaX,
  deltaY,
  rotateDeg,
}: {
  deltaX: number;
  deltaY: number;
  rotateDeg: number;
}): { deltaX: number; deltaY: number } => {
  if (!rotateDeg) return { deltaX, deltaY };

  const radians = (-rotateDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    deltaX: deltaX * cos - deltaY * sin,
    deltaY: deltaX * sin + deltaY * cos,
  };
};

/**
 * 회전 각도를 -180보다 크고 180 이하로 맞춘다.
 *
 * 끌어서 여러 바퀴 돌리면 값이 계속 커진다. 그대로 저장하면 숫자 칸에 720 같은 값이
 * 보이고, 같은 방향을 가리키는 두 값이 달라 상태 비교가 어긋난다.
 */
export const normalizeStudioRotationDeg = (value: number): number => {
  if (!Number.isFinite(value)) return 0;

  const wrapped = ((value % 360) + 360) % 360;
  const normalized = wrapped > 180 ? wrapped - 360 : wrapped;
  // -0을 0으로 만든다. 표시와 비교에서 -0은 사람에게 뜻 없는 값이다.
  return Object.is(normalized, -0) ? 0 : Number(normalized.toFixed(2));
};

/** 회전 손잡이를 잡고 Shift를 누를 때 붙는 각도 간격. */
export const STUDIO_ROTATION_SNAP_DEG = 15;

/**
 * 회전 손잡이가 가리키는 각도.
 *
 * 손잡이는 객체 위쪽에 달려 있으므로 위를 가리킬 때가 0도다. `atan2`는 오른쪽을 0도로
 * 보기 때문에 90도를 더한다.
 */
export const getStudioPointerRotationDeg = ({
  center,
  pointer,
  snapToStep = false,
}: {
  center: { x: number; y: number };
  pointer: { x: number; y: number };
  snapToStep?: boolean;
}): number => {
  const radians = Math.atan2(pointer.y - center.y, pointer.x - center.x);
  const degrees = (radians * 180) / Math.PI + 90;
  const normalized = normalizeStudioRotationDeg(degrees);

  return snapToStep
    ? normalizeStudioRotationDeg(
        Math.round(normalized / STUDIO_ROTATION_SNAP_DEG) *
          STUDIO_ROTATION_SNAP_DEG,
      )
    : normalized;
};

/**
 * 캔버스 크기를 쓸 수 있는 값으로 맞춘다.
 *
 * 숫자 칸을 비우거나 지우는 중에는 0이나 NaN이 들어온다. 그대로 두면 미리보기가
 * 사라져서 무엇을 편집하고 있는지 볼 수 없게 된다.
 */
export const normalizeStudioCanvasSize = ({
  width,
  height,
}: {
  width: number;
  height: number;
}): { width: number; height: number } => ({
  width: Math.max(
    STUDIO_MIN_CANVAS_SIZE,
    Number.isFinite(width) ? Math.round(width) : STUDIO_MIN_CANVAS_SIZE,
  ),
  height: Math.max(
    STUDIO_MIN_CANVAS_SIZE,
    Number.isFinite(height) ? Math.round(height) : STUDIO_MIN_CANVAS_SIZE,
  ),
});

/**
 * 캔버스 밖으로 나간 최상위 노드.
 *
 * 캔버스를 줄이면 밖으로 밀려나는 객체가 생긴다. 그것을 지우지는 않는다. 되돌릴 수
 * 없는 손실이 되기 때문이다. 대신 몇 개가 나갔는지 알려서 사용자가 정할 수 있게 한다.
 */
export const getStudioNodeIdsOutsideCanvas = (
  document: StudioTemplateDocument,
): string[] =>
  document.graph.rootNodeIds.filter((nodeId) => {
    const node = document.graph.nodes[nodeId];
    if (!node || node.hidden) return false;

    const bounds = getStudioNodeBounds(document, nodeId);
    return (
      bounds.right <= 0 ||
      bounds.bottom <= 0 ||
      bounds.left >= document.canvas.width ||
      bounds.top >= document.canvas.height
    );
  });

/** logical bounds는 캔버스 안이어도 effect visual bounds가 경계를 넘는 경우를 진단한다. */
export const getStudioNodeIdsClippedByCanvas = (
  document: StudioTemplateDocument,
): string[] =>
  document.graph.rootNodeIds.filter((nodeId) => {
    const node = document.graph.nodes[nodeId];
    if (!node || node.hidden) return false;

    const bounds = getStudioNodeVisualBoundsInCanvas(document, nodeId);
    const intersectsCanvas =
      bounds.right > 0 &&
      bounds.bottom > 0 &&
      bounds.left < document.canvas.width &&
      bounds.top < document.canvas.height;
    return (
      intersectsCanvas &&
      (bounds.left < 0 ||
        bounds.top < 0 ||
        bounds.right > document.canvas.width ||
        bounds.bottom > document.canvas.height)
    );
  });
