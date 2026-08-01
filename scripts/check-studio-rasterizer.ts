/**
 * PNG 래스터라이저 경계 가드.
 *
 * Phase 0A 스파이크가 `modern-screenshot`을 표준으로 정했다. 그런데 사용자가 실제로
 * 내려받는 Studio 런타임 PNG는 `html-to-image`를 쓰고 있었다. 시간표 카드와 같은 조건으로
 * 재 보니 `html-to-image`가 두 장면에서 화면과 덜 맞았다. 자동 크기 글자가 상자 높이를
 * 거의 채우는 쪽이다.
 *
 * 되돌아가면 화면에서는 아무 문제가 없고 내려받은 파일에서만 드러난다. 그래서 import
 * 경계를 값으로 고정한다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 두 라이브러리의 실제 렌더 품질. 그것은 스파이크 페이지에서 눈으로 판정한다.
 * - 옵션 대응이 맞는지(`pixelRatio` → `scale` 등). 값이 잘못되면 크기가 달라지는데
 *   그건 마크업으로 확인할 수 없다.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const STUDIO_RUNTIME_SHELL =
  "src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx";

/**
 * `html-to-image`가 아직 남아 있어도 되는 곳.
 *
 * 레거시 시간표 공유 화면은 Studio 문서를 쓰지 않고 이번에 결과를 확인하지도 않았다.
 * 부분집합으로 본다. 렌더링 스파이크 폴더는 Phase 3 최종 재검증 뒤 제거했으므로 목록에는
 * 남아 있지 않아야 하고, 새로 늘어나는 것만 막는다.
 */
const HTML_TO_IMAGE_ALLOWLIST = new Set([
  "src/components/TimeTable/TweetPreviewModal.tsx",
]);

const collectFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    return statSync(entryPath).isDirectory()
      ? collectFiles(entryPath)
      : [entryPath];
  });

const sourceFiles = collectFiles("src").filter(
  (filePath) => filePath.endsWith(".ts") || filePath.endsWith(".tsx"),
);

const collectImportStatements = (source: string): string =>
  (source.match(/import[\s\S]*?from\s+"[^"]+";/g) ?? []).join("\n");

// --- Studio 런타임은 표준 래스터라이저를 쓴다 ---

const shellSource = readFileSync(STUDIO_RUNTIME_SHELL, "utf8");
const shellImports = collectImportStatements(shellSource);

assert.ok(
  shellImports.includes("modern-screenshot"),
  "Studio 런타임 PNG는 스파이크가 표준으로 정한 modern-screenshot을 써야 한다.",
);
assert.ok(
  !shellImports.includes("html-to-image"),
  "Studio 런타임 PNG가 html-to-image로 돌아갔다. 화면에서는 문제가 없고 내려받은 파일에서만 드러난다.",
);
assert.ok(
  shellSource.includes("domToPng("),
  "modern-screenshot의 domToPng으로 캡처해야 한다.",
);

/**
 * 폰트가 준비된 뒤에 캡처한다.
 *
 * 준비 전에 캡처하면 fallback 폰트가 결과 이미지에 굳는다. 화면에는 제대로 보이므로
 * 사용자는 파일을 열어 보고서야 알게 된다. 스파이크의 캡처 절차에도 이 단계가 있다.
 */
assert.ok(
  /await\s+window\.document\.fonts\.ready/.test(shellSource),
  "캡처 전에 document.fonts.ready를 기다려야 한다.",
);
assert.ok(
  shellSource.indexOf("fonts.ready") < shellSource.indexOf("domToPng("),
  "폰트 대기가 캡처보다 먼저 와야 한다.",
);

// --- 두 라스터라이저가 더 갈라지지 않는다 ---

const htmlToImageFiles = sourceFiles.filter((filePath) =>
  collectImportStatements(readFileSync(filePath, "utf8")).includes(
    "html-to-image",
  ),
);

for (const filePath of htmlToImageFiles) {
  assert.ok(
    HTML_TO_IMAGE_ALLOWLIST.has(filePath),
    `html-to-image를 새로 쓰는 곳이 생겼다: ${filePath}. 래스터라이저가 두 벌이면 같은 문서가 화면과 파일에서 다르게 나온다.`,
  );
}

console.log(
  `Studio rasterizer boundary checks passed. html-to-image 남은 곳: ${
    htmlToImageFiles.length
  }곳${htmlToImageFiles.length > 0 ? ` (${htmlToImageFiles.join(", ")})` : ""}`,
);
