import assert from "node:assert/strict";
import {
  createThumbnailImagePlacementHistory,
  isSameThumbnailImageTransform,
} from "../src/utils/thumbnail-studio/image-placement-history";
import type {
  StudioRuntimeImageOverrides,
  StudioRuntimeImageTransform,
} from "../src/utils/thumbnail-studio/runtime-image-transform";

const original: StudioRuntimeImageOverrides = {
  background: {
    placementMode: "cover",
    fit: "cover",
    objectPosition: "50% 50%",
    intrinsicSize: { width: 800, height: 600 },
  },
  addon: { placementMode: "manual", intrinsicSize: { width: 80, height: 60 } },
};
const transform: StudioRuntimeImageTransform = {
  left: 0.1,
  top: 0.2,
  width: 0.6,
  height: 0.4,
  rotateDeg: 0,
};
const place = (
  current: StudioRuntimeImageOverrides,
  id: string,
  geometry: StudioRuntimeImageTransform,
): StudioRuntimeImageOverrides => ({
  ...current,
  [id]: {
    ...current[id],
    placementMode: "manual",
    transforms: { node: geometry },
  },
});

const history = createThumbnailImagePlacementHistory();
let current = structuredClone(original);
assert.equal(history.undo(current), null);
assert.equal(history.redo(current), null);
history.begin(current);
for (let i = 1; i <= 100; i++)
  current = place(current, "background", { ...transform, left: i / 100 });
assert.equal(history.undo(current), null, "undo is blocked during a gesture");
history.finish(current);
const moved = current;
current = history.undo(current)!;
assert.deepEqual(
  current,
  original,
  "one undo restores cover after 100 pointer moves",
);
assert.equal(history.undo(current), null, "a drag records exactly one step");
current = history.redo(current)!;
assert.deepEqual(current, moved);

for (const geometry of [
  { ...transform, rotateDeg: 27 },
  { ...transform, rotateDeg: 27, width: 0.3, height: 0.2 },
]) {
  history.begin(current);
  current = place(current, "addon", geometry);
  history.finish(current);
}
const resized = current;
current = history.undo(current)!;
assert.equal(current.addon.transforms!.node.rotateDeg, 27);
assert.equal(
  current.addon.transforms!.node.width,
  0.6,
  "resize and rotate are separate steps",
);
const rotated = current;
// A click, metadata changes, and a cancelled gesture must preserve redo.
history.begin(current);
history.finish(current);
history.begin(current);
current = place(current, "addon", { ...transform, left: 0.9 });
current = history.cancel(current)!;
assert.deepEqual(current, rotated);
current = history.redo(current)!;
assert.deepEqual(current, resized);

// Reset is an atomic edit. Undo restores placement while retaining current source metadata.
history.recordChange(current, original);
current = structuredClone(original);
current.addon.intrinsicSize = { width: 123, height: 456 };
current = history.undo(current)!;
assert.deepEqual(current.addon.transforms, resized.addon.transforms);
assert.deepEqual(current.addon.intrinsicSize, { width: 123, height: 456 });
history.begin(current);
current = place(current, "addon", { ...transform, rotateDeg: -15 });
history.finish(current);
assert.equal(history.redo(current), null, "new editing invalidates redo");

history.clear();
assert.equal(
  history.undo(current),
  null,
  "asset replacement/deletion clears placement history",
);
history.begin(current);
history.clear();
assert.equal(
  history.cancel(current),
  null,
  "a disposed gesture cannot restore an old asset",
);

const bounded = createThumbnailImagePlacementHistory(3);
current = structuredClone(original);
for (let i = 0; i < 5; i++) {
  const next = place(current, "addon", { ...transform, left: i });
  bounded.recordChange(current, next);
  current = next;
}
for (let i = 0; i < 3; i++) current = bounded.undo(current)!;
assert.equal(current.addon.transforms!.node.left, 1);
assert.equal(bounded.undo(current), null, "history remains bounded");
assert.ok(
  isSameThumbnailImageTransform(transform, { ...transform, left: 0.1 + 1e-12 }),
);
assert.ok(
  !isSameThumbnailImageTransform(transform, { ...transform, rotateDeg: 1 }),
);

console.log(
  "Thumbnail placement history checks passed: gesture grouping, cover, rotation, resize, reset, cancellation, branching, source isolation and limits.",
);
