import assert from "node:assert/strict";

import {
  parseStudioWebFontCss,
  STUDIO_WEB_FONT_METRIC_DEFAULTS,
} from "../src/utils/template-studio/web-fonts";

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
parsedPretendard.faces.forEach((face) => {
  Object.entries(STUDIO_WEB_FONT_METRIC_DEFAULTS).forEach(([name, value]) => {
    assert.equal(face.descriptors[name], value);
    assert.ok(parsedPretendard.cssText.includes(`  ${name}: ${value};`));
  });
});

const explicitMetrics = parseStudioWebFontCss(`
  @font-face {
    font-family: 'Custom Metrics';
    src: url('https://example.com/custom.woff2') format('woff2');
    ascent-override: 90%;
    descent-override: normal;
    size-adjust: 102.5%;
  }
`);
assert.equal(explicitMetrics.ok, true);
if (!explicitMetrics.ok) process.exit(1);
assert.equal(explicitMetrics.faces[0].descriptors["ascent-override"], "90%");
assert.equal(
  explicitMetrics.faces[0].descriptors["descent-override"],
  "normal",
);
assert.equal(explicitMetrics.faces[0].descriptors["line-gap-override"], "0%");
assert.equal(explicitMetrics.faces[0].descriptors["size-adjust"], "102.5%");

const invalidMetrics = parseStudioWebFontCss(`
  @font-face {
    font-family: 'Invalid Metrics';
    src: url('https://example.com/invalid.woff2') format('woff2');
    ascent-override: nope;
  }
`);
assert.equal(invalidMetrics.ok, false, "Invalid metric overrides must fail");

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
