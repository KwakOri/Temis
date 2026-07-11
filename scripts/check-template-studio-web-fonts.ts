import assert from "node:assert/strict";

import { parseStudioWebFontCss } from "../src/utils/template-studio/web-fonts";

const faceNames = [
  "Thin",
  "ExtraLight",
  "Light",
  "Regular",
  "Medium",
  "SemiBold",
  "Bold",
  "ExtraBold",
  "Black",
];

const pretendardCss = faceNames
  .map((faceName, index) => {
    const weight = (index + 1) * 100;
    return `*@font-face {*
    *font-family: 'Pretendard';*
    *src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-${faceName}.woff2') format('woff2');*
    *font-weight: ${weight};*
    *font-display: swap;*
*}*`;
  })
  .join("\n\n");

const parsedPretendard = parseStudioWebFontCss(pretendardCss);
assert.equal(parsedPretendard.ok, true, "Pretendard CSS should parse");
if (!parsedPretendard.ok) process.exit(1);
assert.deepEqual(parsedPretendard.families, ["Pretendard"]);
assert.deepEqual(
  parsedPretendard.faces.map((face) => face.weight),
  ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
);
assert.equal(parsedPretendard.faces.length, 9);
assert.equal(parsedPretendard.cssText.includes("*@font-face"), false);

const arbitraryCss = parseStudioWebFontCss(
  "body { display: none; } @font-face { font-family: Test; src: url('https://example.com/test.woff2'); }",
);
assert.equal(arbitraryCss.ok, false, "Arbitrary selectors must be rejected");

const insecureUrl = parseStudioWebFontCss(
  "@font-face { font-family: Test; src: url('http://example.com/test.woff2'); }",
);
assert.equal(insecureUrl.ok, false, "Insecure font URLs must be rejected");

const missingSource = parseStudioWebFontCss(
  "@font-face { font-family: Test; font-weight: 400; }",
);
assert.equal(missingSource.ok, false, "src must be required");

console.log(
  `Template Studio web font checks passed (${parsedPretendard.faces.length} Pretendard faces).`,
);
