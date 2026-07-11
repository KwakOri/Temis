import assert from "node:assert/strict";

import {
  fitStudioCropFrame,
  getStudioContainRect,
  resizeStudioCropFrame,
} from "../src/utils/template-studio/crop-resize";

const fitted = fitStudioCropFrame({ width: 1000, height: 600 }, 16 / 9);
assert.equal(fitted.width, 952);
assert.equal(Number(fitted.height.toFixed(2)), 535.5);

assert.deepEqual(
  resizeStudioCropFrame(
    { width: 400, height: 300 },
    { width: 1000, height: 600 },
    "right",
    25,
  ),
  { width: 450, height: 300 },
);
assert.deepEqual(
  resizeStudioCropFrame(
    { width: 400, height: 300 },
    { width: 1000, height: 600 },
    "top",
    -200,
  ),
  { width: 400, height: 80 },
);
assert.deepEqual(
  resizeStudioCropFrame(
    { width: 400, height: 300 },
    { width: 500, height: 400 },
    "left",
    200,
  ),
  { width: 452, height: 300 },
);

assert.deepEqual(
  getStudioContainRect(
    { width: 4096, height: 2304 },
    { width: 4637, height: 2304 },
  ),
  {
    left: 270.5,
    top: 0,
    width: 4096,
    height: 2304,
  },
);

console.log("Template Studio crop resize checks passed.");
