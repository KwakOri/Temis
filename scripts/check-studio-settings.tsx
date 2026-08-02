/**
 * Studio 공통 설정 다이얼로그의 기준선 가드.
 *
 * 설정 모달은 추출 전에 마크업 가드가 없었다. 공통 프레임과 도메인 섹션으로
 * 나누는 시점의 시간표 설정 화면 구성을 여기에 고정한다.
 *
 * 다이얼로그와 폰트 편집기는 useState만 쓰므로 renderToStaticMarkup으로 첫
 * 렌더를 검증할 수 있다. useEffect에 있는 Escape 처리와 색 선택 패널의 위치
 * 계산은 브라우저 확인으로 남긴다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioSettingsModal } from "../src/app/(root)/template-studio/_components/studio-settings-modal";
import { buildStudioCommonSettingsSections } from "../src/components/studio/settings/studio-common-settings";
import { StudioSettingsDialog } from "../src/components/studio/settings/studio-settings-dialog";
import { StudioGuideLayerSettings } from "../src/components/studio/settings/studio-settings-fields";
import { StudioWebFontSettings } from "../src/components/studio/settings/studio-web-font-settings";
import type { StudioTimetableCapabilityKey } from "../src/types/template-studio";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";

const noop = () => {};

const fontUsageMarkup = renderToStaticMarkup(
  <StudioWebFontSettings
    sources={[
      {
        id: "font-brand",
        label: "Brand Sans",
        cssText:
          "@font-face { font-family: 'Brand Sans'; src: url('https://example.com/brand.woff2'); }",
        enabled: true,
      },
    ]}
    usageBySourceId={{
      "font-brand": ["Title · Text node typography"],
    }}
    onChange={noop}
  />,
);
assert.ok(fontUsageMarkup.includes('data-studio-font-usage="font-brand"'));
assert.ok(fontUsageMarkup.includes("Title · Text node typography"));

// --- 공통 설정 섹션 기준선 ---
//
// 두 Studio가 함께 받는 설정이다. 도메인 섹션이 아니라 공통에 있어야 한다.

const commonModel = {
  theme: "dark" as const,
  onThemeChange: noop,
  webFonts: { sources: [], onChange: noop },
  data: {
    isReloadDisabled: true,
    onReloadTemplate: noop,
    onExportJson: noop,
    onImportJson: noop,
  },
  documentInfo: {
    databaseTargetLabel: "local",
    schemaLabel: "template-studio v3",
    objectCount: 12,
    inputCount: 4,
  },
};

assert.deepEqual(
  buildStudioCommonSettingsSections(commonModel).map((section) => section.id),
  ["fonts", "data", "appearance", "document"],
  "공통 설정 섹션 구성과 순서가 바뀌면 안 된다.",
);

// --- 공통 다이얼로그 프레임 기준선 ---

const dialogMarkup = renderToStaticMarkup(
  <StudioSettingsDialog
    common={commonModel}
    description="Template document settings"
    domainSections={[
      {
        id: "canvas",
        label: "Canvas",
        description: "Size & background",
        navIcon: () => <span>C</span>,
        content: <div data-panel="canvas">canvas</div>,
      },
    ]}
    open
    title="Settings"
    onClose={noop}
  />,
);

assert.ok(
  dialogMarkup.startsWith(
    '<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-[2px]">',
  ),
  "설정은 화면 전체를 덮는 오버레이 위에 뜬다.",
);
assert.ok(
  dialogMarkup.includes(
    '<section aria-describedby="studio-settings-description" aria-labelledby="studio-settings-title" aria-modal="true" class="flex h-[calc(100vh-4rem)] max-h-[880px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_28px_90px_rgba(0,0,0,0.5)]" role="dialog">',
  ),
  "다이얼로그의 크기와 접근성 속성이 유지돼야 한다.",
);
assert.ok(
  dialogMarkup.includes(
    '<h2 class="text-base font-bold text-[var(--fg)]" id="studio-settings-title">Settings</h2>',
  ),
  "제목이 유지돼야 한다.",
);
assert.ok(
  dialogMarkup.includes(
    '<p class="text-[11px] font-semibold text-[var(--fg3)]" id="studio-settings-description">Template document settings</p>',
  ),
  "부제가 유지돼야 한다.",
);
assert.ok(
  dialogMarkup.includes('aria-label="Close settings"'),
  "닫기 버튼이 유지돼야 한다.",
);
assert.ok(
  dialogMarkup.includes(
    '<nav aria-label="Settings categories" class="w-44 shrink-0 border-r border-[var(--border)] bg-[var(--field)]/15 p-3 sm:w-52">',
  ),
  "좌측 분류 목록 프레임이 유지돼야 한다.",
);
assert.ok(
  dialogMarkup.includes(
    '<div class="grid gap-1" role="tablist" aria-orientation="vertical">',
  ),
  "분류 목록은 수직 tablist다.",
);

// 도메인 섹션이 공통 섹션보다 앞에 온다.
const dialogTabOrder = [
  ...dialogMarkup.matchAll(/id="studio-settings-tab-([a-z]+)"/g),
].map((match) => match[1]);
assert.deepEqual(
  dialogTabOrder,
  ["canvas", "fonts", "data", "appearance", "document"],
  "도메인 섹션은 공통 설정보다 앞에 온다.",
);

// 첫 섹션만 활성이고, 나머지 패널은 hidden으로 남는다.
assert.equal(
  (dialogMarkup.match(/aria-selected="true"/g) ?? []).length,
  1,
  "활성 분류는 정확히 하나여야 한다.",
);
assert.ok(
  dialogMarkup.includes(
    'aria-controls="studio-settings-panel-canvas" aria-selected="true"',
  ),
  "첫 섹션이 기본 활성이다.",
);
assert.equal(
  (dialogMarkup.match(/hidden" id="studio-settings-panel-/g) ?? []).length,
  4,
  "활성 패널을 뺀 나머지는 hidden으로 렌더된다.",
);
assert.ok(
  dialogMarkup.includes('data-panel="canvas"'),
  "도메인 섹션 내용이 패널에 들어간다.",
);

// 패널 컨테이너 클래스와 문서 탭의 추가 클래스
assert.ok(
  dialogMarkup.includes(
    '<section aria-labelledby="studio-settings-tab-canvas" class="mx-auto grid w-full max-w-3xl content-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--field)]/20 p-4" id="studio-settings-panel-canvas" role="tabpanel">',
  ),
  "패널 컨테이너 클래스가 유지돼야 한다.",
);
assert.ok(
  dialogMarkup.includes(
    'gap-2 text-[11px] font-semibold text-[var(--fg2)] hidden" id="studio-settings-panel-document"',
  ),
  "문서 패널의 추가 클래스가 유지돼야 한다.",
);

// 닫힌 상태는 아무것도 렌더하지 않는다.
assert.equal(
  renderToStaticMarkup(
    <StudioSettingsDialog
      common={commonModel}
      description="Template document settings"
      open={false}
      title="Settings"
      onClose={noop}
    />,
  ),
  "",
  "닫힌 설정은 마크업을 남기지 않는다.",
);

// --- 시간표 설정 화면 기준선 ---
//
// 추출 이전 설정 모달이 렌더하던 요소 목록이다. 값을 임의로 줄이지 않는다.

const timetableSettingsMarkup = renderToStaticMarkup(
  <StudioSettingsModal
    activeWorkspaceMode="cards"
    databaseTargetLabel="local"
    document={createSampleStudioDocument()}
    inputCount={4}
    isReloadDisabled={false}
    objectCount={12}
    open
    theme="dark"
    onCardsCanvasChange={noop}
    onCardsGuideRemove={noop}
    onCardsGuideUpload={noop}
    onClose={noop}
    onExportJson={noop}
    onImportJson={noop}
    onReloadTemplate={noop}
    onThemeChange={noop}
    onTimetableCapabilityChange={noop}
    onTimetableCanvasChange={noop}
    onTimetableGuideRemove={noop}
    onTimetableGuideUpload={noop}
    onWebFontsChange={noop}
  />,
);

const TIMETABLE_SETTINGS_BASELINE = [
  ">Canvas<",
  ">Size &amp; background<",
  ">Timetable<",
  ">Status capabilities<",
  ">Web Fonts<",
  ">Font sources<",
  ">Data<",
  ">Sync &amp; JSON<",
  ">Appearance<",
  ">Editor theme<",
  ">Document<",
  ">Environment info<",
  ">Cards<",
  'aria-label="Cards canvas background HEX value"',
  'aria-label="Timetable canvas background HEX value"',
  ">Guide layer<",
  "Editor-only overlay for cards alignment.",
  "Editor-only overlay for timetable alignment.",
  "No guide image selected.",
  "Upload guide",
  "1920 × 1080",
  "4000 × 2250",
  ">Timetable Statuses<",
  'aria-label="Multi Status"',
  'aria-label="Offline Memo Status"',
  "Reload selected database template",
  "Export JSON",
  "Import JSON",
  ">dark<",
  ">light<",
  "Environment &amp; Document",
  ">local<",
  ">12<",
  ">4<",
  "Add font source",
];

for (const expected of TIMETABLE_SETTINGS_BASELINE) {
  assert.ok(
    timetableSettingsMarkup.includes(expected),
    `시간표 설정에서 사라진 요소가 있다: ${expected}`,
  );
}

// 분류 순서: 도메인(캔버스, 시간표) → 공통(폰트, 데이터, 외형, 문서)
assert.deepEqual(
  [
    ...timetableSettingsMarkup.matchAll(/id="studio-settings-tab-([a-z]+)"/g),
  ].map((match) => match[1]),
  ["canvas", "timetable", "fonts", "data", "appearance", "document"],
  "시간표 설정의 분류 구성과 순서가 바뀌면 안 된다.",
);

// capability 라벨이 올바른 키에 연결돼 있는지 확인한다. 라벨만 맞고 키가 뒤
// 바뀌면 다른 상태를 켜는 체크박스가 되므로 켠 쪽만 checked인지 본다.
const renderCapabilitySettings = (
  capabilities: Record<StudioTimetableCapabilityKey, { enabled: boolean }>,
) => {
  const document = createSampleStudioDocument();
  if (!document.domains?.timetable)
    throw new Error("샘플에 시간표 도메인 없음");
  document.domains.timetable.capabilities = capabilities;

  return renderToStaticMarkup(
    <StudioSettingsModal
      activeWorkspaceMode="cards"
      databaseTargetLabel="local"
      document={document}
      inputCount={4}
      isReloadDisabled={false}
      objectCount={12}
      open
      theme="dark"
      onCardsCanvasChange={noop}
      onCardsGuideRemove={noop}
      onCardsGuideUpload={noop}
      onClose={noop}
      onExportJson={noop}
      onImportJson={noop}
      onReloadTemplate={noop}
      onThemeChange={noop}
      onTimetableCapabilityChange={noop}
      onTimetableCanvasChange={noop}
      onTimetableGuideRemove={noop}
      onTimetableGuideUpload={noop}
      onWebFontsChange={noop}
    />,
  );
};

const isCapabilityChecked = (markup: string, label: string) => {
  const tag = markup.match(
    new RegExp(`<input aria-label="${label}"[^>]*>`),
  )?.[0];
  assert.ok(tag, `capability 체크박스를 찾을 수 없다: ${label}`);
  return tag.includes('checked=""');
};

const multiOnlyMarkup = renderCapabilitySettings({
  multi: { enabled: true },
  offlineMemo: { enabled: false },
});
assert.equal(
  isCapabilityChecked(multiOnlyMarkup, "Multi Status"),
  true,
  "Multi를 켜면 Multi Status 체크박스가 켜져야 한다.",
);
assert.equal(
  isCapabilityChecked(multiOnlyMarkup, "Offline Memo Status"),
  false,
  "Multi만 켰을 때 Offline Memo가 켜지면 안 된다.",
);

const offlineMemoOnlyMarkup = renderCapabilitySettings({
  multi: { enabled: false },
  offlineMemo: { enabled: true },
});
assert.equal(
  isCapabilityChecked(offlineMemoOnlyMarkup, "Offline Memo Status"),
  true,
  "Offline Memo를 켜면 해당 체크박스가 켜져야 한다.",
);
assert.equal(
  isCapabilityChecked(offlineMemoOnlyMarkup, "Multi Status"),
  false,
  "Offline Memo만 켰을 때 Multi가 켜지면 안 된다.",
);

// 캔버스 탭의 활성 작업 모드 배지
assert.ok(
  timetableSettingsMarkup.includes(
    '<span class="ml-auto rounded bg-[var(--sel)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--accent)]">cards</span>',
  ),
  "캔버스 탭은 현재 작업 모드를 배지로 보여준다.",
);

// --- 가이드 레이어 설정 기준선 ---
//
// 에셋이 있을 때만 제거 버튼이 나온다. 샘플 문서에는 가이드가 없으므로 공용
// 필드를 직접 렌더해서 두 상태를 고정한다.

const guideWithAssetMarkup = renderToStaticMarkup(
  <StudioGuideLayerSettings
    assetLabel="guide.png"
    description="Editor-only overlay for cards alignment."
    removeAriaLabel="Remove cards guide"
    onRemove={noop}
    onUpload={noop}
  />,
);
assert.ok(
  guideWithAssetMarkup.includes('aria-label="Remove cards guide"'),
  "가이드가 있으면 제거 버튼이 나온다.",
);
assert.ok(
  guideWithAssetMarkup.includes(">guide.png</div>"),
  "가이드 에셋 이름이 표시된다.",
);
assert.ok(
  guideWithAssetMarkup.includes("Replace guide"),
  "가이드가 있으면 교체 라벨로 바뀐다.",
);
assert.ok(
  guideWithAssetMarkup.includes(
    "The guide is not included in previews or exported images.",
  ),
  "가이드가 내보내기에 포함되지 않는다는 안내가 유지돼야 한다.",
);

const guideWithoutAssetMarkup = renderToStaticMarkup(
  <StudioGuideLayerSettings
    assetLabel={null}
    description="Editor-only overlay for cards alignment."
    removeAriaLabel="Remove cards guide"
    onRemove={noop}
    onUpload={noop}
  />,
);
assert.ok(
  !guideWithoutAssetMarkup.includes('aria-label="Remove cards guide"'),
  "가이드가 없으면 제거 버튼을 렌더하지 않는다.",
);
assert.ok(
  guideWithoutAssetMarkup.includes("No guide image selected."),
  "가이드가 없을 때의 빈 상태 문구가 유지돼야 한다.",
);

console.log("Studio settings baseline checks passed.");
