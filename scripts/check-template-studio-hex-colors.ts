import assert from "node:assert/strict";

import {
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
} from "../src/utils/color/hex-color";

assert.equal(normalizeHexColor("fff"), "#FFFFFF");
assert.equal(normalizeHexColor("#1a2b3c"), "#1A2B3C");
assert.equal(normalizeHexColor(" 4f8cff "), "#4F8CFF");
assert.equal(normalizeHexColor("#12"), null);
assert.equal(normalizeHexColor("rgb(0, 0, 0)"), null);

assert.deepEqual(hexToHsv("#FF0000"), {
  hue: 0,
  saturation: 1,
  value: 1,
});
assert.deepEqual(hexToHsv("#000000"), {
  hue: 0,
  saturation: 0,
  value: 0,
});
assert.equal(
  hsvToHex({ hue: 120, saturation: 1, value: 1 }),
  "#00FF00",
);
assert.equal(
  hsvToHex({ hue: 240, saturation: 1, value: 1 }),
  "#0000FF",
);

["#FFFFFF", "#111827", "#4F8CFF", "#F97316", "#8B5CF6"].forEach(
  (hex) => {
    const hsv = hexToHsv(hex);
    assert.ok(hsv);
    assert.equal(hsvToHex(hsv), hex);
  },
);

console.log("Template Studio HEX color checks passed.");
