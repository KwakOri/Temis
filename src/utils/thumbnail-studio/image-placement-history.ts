import {
  captureStudioHistory,
  createStudioHistoryStacks,
  redoStudioHistory,
  STUDIO_HISTORY_DEFAULT_LIMIT,
  undoStudioHistory,
} from "@/utils/template-studio/history-stacks";
import type {
  StudioRuntimeImageOverride,
  StudioRuntimeImageOverrides,
} from "./runtime-image-transform";

type Placement = Pick<
  StudioRuntimeImageOverride,
  "placementMode" | "fit" | "objectPosition" | "transforms"
>;
type Snapshot = Record<string, Placement>;

// Only placement belongs in history. Blobs, source dimensions and removal flags
// remain owned by the image lifecycle and are never restored by undo.
const snapshotPlacement = (overrides: StudioRuntimeImageOverrides): Snapshot =>
  Object.fromEntries(
    Object.entries(overrides)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([id, value]) => {
        const placement: Placement = {};
        if (value.placementMode !== undefined)
          placement.placementMode = value.placementMode;
        if (value.fit !== undefined) placement.fit = value.fit;
        if (value.objectPosition !== undefined)
          placement.objectPosition = value.objectPosition;
        if (value.transforms && Object.keys(value.transforms).length)
          placement.transforms = Object.fromEntries(
            Object.entries(value.transforms)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([nodeId, transform]) => [nodeId, { ...transform }]),
          );
        return Object.keys(placement).length ? [[id, placement]] : [];
      }),
  );

const restorePlacement = (
  current: StudioRuntimeImageOverrides,
  snapshot: Snapshot,
): StudioRuntimeImageOverrides => {
  const result: StudioRuntimeImageOverrides = {};
  const placements = snapshotPlacement(snapshot);
  for (const id of new Set([
    ...Object.keys(current),
    ...Object.keys(snapshot),
  ])) {
    const value = { ...current[id] };
    delete value.placementMode;
    delete value.fit;
    delete value.objectPosition;
    delete value.transforms;
    Object.assign(value, placements[id]);
    if (Object.keys(value).length) result[id] = value;
  }
  return result;
};

/** Reuse Studio's bounded undo/redo stacks, with one entry per completed gesture. */
export function createThumbnailImagePlacementHistory(
  limit = STUDIO_HISTORY_DEFAULT_LIMIT,
) {
  let stacks = createStudioHistoryStacks<Snapshot>();
  let pending: Snapshot | null = null;
  const record = (before: Snapshot, after: Snapshot) => {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    stacks = captureStudioHistory(stacks, before, limit);
  };
  return {
    get isTransforming() {
      return pending !== null;
    },
    begin(current: StudioRuntimeImageOverrides) {
      pending = snapshotPlacement(current);
    },
    finish(current: StudioRuntimeImageOverrides) {
      if (pending) record(pending, snapshotPlacement(current));
      pending = null;
    },
    cancel(current: StudioRuntimeImageOverrides) {
      const before = pending;
      pending = null;
      return before ? restorePlacement(current, before) : null;
    },
    recordChange(
      before: StudioRuntimeImageOverrides,
      after: StudioRuntimeImageOverrides,
    ) {
      record(snapshotPlacement(before), snapshotPlacement(after));
    },
    undo(current: StudioRuntimeImageOverrides) {
      if (pending) return null;
      const step = undoStudioHistory(stacks, snapshotPlacement(current), limit);
      if (!step) return null;
      stacks = step.stacks;
      return restorePlacement(current, step.snapshot);
    },
    redo(current: StudioRuntimeImageOverrides) {
      if (pending) return null;
      const step = redoStudioHistory(stacks, snapshotPlacement(current), limit);
      if (!step) return null;
      stacks = step.stacks;
      return restorePlacement(current, step.snapshot);
    },
    clear() {
      pending = null;
      stacks = createStudioHistoryStacks<Snapshot>();
    },
  };
}

/** Avoid treating a handle click or a return to the initial geometry as an edit. */
export const isSameThumbnailImageTransform = (
  a: NonNullable<StudioRuntimeImageOverride["transforms"]>[string],
  b: NonNullable<StudioRuntimeImageOverride["transforms"]>[string],
) =>
  (Object.keys(a) as (keyof typeof a)[]).every(
    (key) => Math.abs(a[key] - b[key]) < 1e-9,
  );
