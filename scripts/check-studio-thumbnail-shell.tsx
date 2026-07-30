/**
 * Thumbnail Studio가 공통 셸을 쓰는지 확인하는 가드.
 *
 * Phase 1의 완료 조건은 두 Studio가 같은 셸과 패널 프레임을 쓰고, 썸네일 쪽에
 * 시간표 전용 요소가 없는 것이다. 여기서는 썸네일 화면을 실제로 렌더해서 그
 * 두 가지를 함께 본다.
 *
 * useRouter는 서버 렌더에서 동작하지 않으므로 next/navigation을 최소 구현으로
 * 바꿔서 렌더한다.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

type ModuleWithLoader = typeof Module & {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};

const moduleWithLoader = Module as ModuleWithLoader;
const originalLoad = moduleWithLoader._load;

moduleWithLoader._load = function patchedLoad(request, parent, isMain) {
  if (request === "next/navigation") {
    return {
      useRouter: () => ({
        push: () => {},
        replace: () => {},
        back: () => {},
        forward: () => {},
        refresh: () => {},
        prefetch: () => {},
      }),
      useSearchParams: () => new URLSearchParams(),
      usePathname: () => "/admin/thumbnail-studio",
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { ThumbnailStudioClient } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("../src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client") as typeof import("../src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client");

const markup = renderToStaticMarkup(<ThumbnailStudioClient />);

// --- 공통 셸을 쓴다 ---

assert.ok(
  markup.startsWith(
    '<main class="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)]"',
  ),
  "썸네일 화면도 공통 셸의 main으로 시작해야 한다.",
);
assert.ok(
  markup.includes('<div class="flex min-h-0 flex-1">'),
  "공통 셸의 본문 컨테이너를 써야 한다.",
);
assert.ok(
  markup.includes(
    '<aside class="flex w-[260px] min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--panel)]">',
  ),
  "좌측 패널은 공통 사이드바 프레임이어야 한다.",
);
assert.ok(
  markup.includes(
    '<aside class="template-studio-scrollbar w-[280px] shrink-0 overflow-y-auto overflow-x-hidden border-l border-[var(--border)] bg-[var(--panel)]">',
  ),
  "우측 패널은 공통 속성 패널 프레임이어야 한다.",
);
assert.ok(
  markup.includes(
    '<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">',
  ),
  "레이어 패널은 공통 프레임이어야 한다.",
);

// --- 썸네일 화면 구성 ---

const THUMBNAIL_BASELINE = [
  'title="관리자 홈으로"',
  ">목록<",
  'title="Open canvas settings"',
  ">1280<",
  ">720<",
  'title="Zoom out"',
  ">80%<",
  ">Fit<",
  'title="Thumbnail settings"',
  ">Layers<",
  ">Presets<",
  ">Inputs<",
  ">Thumbnail Layers<",
  ">0 placed objects<",
  ">Thumbnail<",
  ">0 selected<",
  "Select an object from the canvas or layer tree.",
];

for (const expected of THUMBNAIL_BASELINE) {
  assert.ok(
    markup.includes(expected),
    `썸네일 화면에서 사라진 요소가 있다: ${expected}`,
  );
}

// 기본 탭은 Layers다.
const tabLabels = [
  ...markup.matchAll(
    /<button class="flex h-\[34px\] flex-1 items-center justify-center[^"]*"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([A-Za-z ]+)<\/button>/g,
  ),
].map((match) => match[1]);
assert.deepEqual(
  tabLabels,
  ["Layers", "Presets", "Inputs"],
  "썸네일 탭 구성과 순서가 바뀌면 안 된다.",
);
assert.equal(
  (markup.match(/bg-\[var\(--field\)\] text-\[var\(--fg\)\]/g) ?? []).length,
  1,
  "활성 탭 표현은 정확히 하나여야 한다.",
);

// 저장, 발행과 미리보기는 아직 비활성이다.
assert.equal(
  (markup.match(/disabled=""/g) ?? []).length,
  4,
  "저장·발행·미리보기와 이름 변경 입력이 비활성이어야 한다.",
);

// --- 시간표 전용 요소가 없다 ---

const TIMETABLE_ONLY = [
  ">Cards<",
  ">Timetable<",
  ">Table<",
  "Component Set",
  ">Online<",
  ">Offline<",
  ">Multi<",
  ">가이드<",
  ">공유<",
  "Timetable Layers",
  "Timetable Context",
  "Apply style to other statuses",
];

for (const forbidden of TIMETABLE_ONLY) {
  assert.ok(
    !markup.includes(forbidden),
    `썸네일 화면에 시간표 전용 요소가 있다: ${forbidden}`,
  );
}

// --- 공통 컴포넌트가 시간표 도메인을 모른다 ---

const collectFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    return statSync(entryPath).isDirectory()
      ? collectFiles(entryPath)
      : [entryPath];
  });

const sharedFiles = [
  ...collectFiles("src/components/studio"),
  ...collectFiles("src/hooks/studio"),
];

for (const filePath of sharedFiles) {
  const source = readFileSync(filePath, "utf8");
  assert.ok(
    !source.includes("StudioTimetableDomain"),
    `공통 컴포넌트가 시간표 도메인을 참조한다: ${filePath}`,
  );
  assert.ok(
    !source.includes("template-studio/_components"),
    `공통 컴포넌트가 route 폴더를 참조한다: ${filePath}`,
  );
}

console.log("Studio thumbnail shell baseline checks passed.");
