/**
 * Studio 공통 편집기 셸 컴포넌트의 기준선 가드.
 *
 * Phase 1은 큰 클라이언트 컴포넌트에서 공통 UI를 단계적으로 추출한다. 추출
 * 과정에서 시간표 편집기의 요소가 조용히 사라지는 것을 막기 위해, 추출 시점의
 * 상단 바 구성을 여기에 고정한다.
 *
 * `TemplateStudioClient` 전체는 useRouter와 React Query에 의존해서
 * renderToStaticMarkup으로 렌더할 수 없다. 그래서 순수 presentational
 * 컴포넌트만 마크업으로 검증하고, 실제 route 동작은 브라우저 확인으로 남긴다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioGuideControl } from "../src/components/studio/editor-shell/studio-guide-control";
import { StudioTopToolbar } from "../src/components/studio/editor-shell/studio-top-toolbar";

const noop = () => {};

const baseToolbarProps = {
  backAction: { title: "템플릿 목록으로", onClick: noop },
  saveAction: { title: "Save draft to database", onClick: noop },
  publishAction: { title: "Publish database document", onClick: noop },
  canvasSize: {
    width: 960,
    height: 640,
    title: "Open canvas settings",
    onClick: noop,
  },
  zoom: { scale: 0.77, onZoomIn: noop, onZoomOut: noop, onFit: noop },
  settingsAction: { title: "Template settings", onClick: noop },
  previewAction: { title: "Open runtime preview", onClick: noop },
};

// --- 시간표 편집기 기준선 ---
//
// 추출 이전 인라인 상단 바가 렌더하던 요소 목록이다. 값을 임의로 줄이지 않는다.

const TIMETABLE_BASELINE = [
  'title="템플릿 목록으로"',
  ">목록<",
  'title="Save draft to database"',
  'title="Publish database document"',
  'title="Open canvas settings"',
  ">960<",
  ">640<",
  ">Cards<",
  ">Timetable<",
  ">가이드<",
  'aria-label="가이드 오퍼시티"',
  'title="Zoom out"',
  ">77%<",
  'title="Zoom in"',
  ">Fit<",
  'title="Template settings"',
  'title="Open runtime preview"',
  ">Preview<",
  'title="Open saved preview"',
  ">공유<",
  'type="file"',
];

const timetableMarkup = renderToStaticMarkup(
  <StudioTopToolbar
    {...baseToolbarProps}
    centerSlot={
      <>
        <div>
          <button type="button">Cards</button>
          <button type="button">Timetable</button>
        </div>
        <StudioGuideControl
          hasAsset
          opacity={0.4}
          visible
          onOpacityChange={noop}
          onRequestAsset={noop}
          onToggleVisible={noop}
        />
      </>
    }
    hiddenControls={<input className="hidden" type="file" />}
    shareAction={{ title: "Open saved preview", onClick: noop }}
  />,
);

TIMETABLE_BASELINE.forEach((expected) => {
  assert.ok(
    timetableMarkup.includes(expected),
    `상단 바 기준선 요소가 사라졌다: ${expected}`,
  );
});

// 줌 비율은 표시 값이므로 반올림 규칙까지 고정한다.
// 0.77 * 100은 정확히 77이라 반올림을 구분하지 못하므로 소수가 남는 값을 쓴다.
const zoomMarkup = (scale: number) =>
  renderToStaticMarkup(
    <StudioTopToolbar
      {...baseToolbarProps}
      zoom={{ ...baseToolbarProps.zoom, scale }}
    />,
  );

assert.ok(zoomMarkup(1).includes(">100%<"));
assert.ok(
  zoomMarkup(0.775).includes(">78%<"),
  "줌 비율은 정수로 반올림해서 표시한다.",
);
assert.ok(
  !zoomMarkup(0.775).includes("77.5"),
  "줌 비율에 소수를 노출하지 않는다.",
);

// --- Thumbnail Studio 기준선 ---
//
// 같은 셸을 쓰면서 시간표 전용 기능이 새 편집기로 유입되지 않아야 한다.

const thumbnailMarkup = renderToStaticMarkup(
  <StudioTopToolbar {...baseToolbarProps} />,
);

const TIMETABLE_ONLY = [">Cards<", ">Timetable<", ">가이드<", ">공유<"];

TIMETABLE_ONLY.forEach((forbidden) => {
  assert.ok(
    !thumbnailMarkup.includes(forbidden),
    `시간표 전용 요소가 슬롯 없이도 렌더됐다: ${forbidden}`,
  );
});

// 공통 요소는 슬롯 없이도 그대로 있어야 한다.
[
  ">목록<",
  'title="Open canvas settings"',
  'title="Zoom out"',
  ">Fit<",
  'title="Template settings"',
  ">Preview<",
].forEach((expected) => {
  assert.ok(
    thumbnailMarkup.includes(expected),
    `공통 상단 바 요소가 빠졌다: ${expected}`,
  );
});

// --- 가이드 컨트롤 상태 표현 ---

const withoutAsset = renderToStaticMarkup(
  <StudioGuideControl
    hasAsset={false}
    opacity={0}
    visible={false}
    onOpacityChange={noop}
    onRequestAsset={noop}
    onToggleVisible={noop}
  />,
);
assert.ok(withoutAsset.includes('title="설정에서 가이드 이미지 추가"'));
// className에 disabled: 유틸리티가 들어 있으므로 실제 속성으로 확인한다.
assert.ok(
  withoutAsset.includes('disabled=""'),
  "에셋이 없으면 슬라이더가 잠긴다.",
);
assert.ok(withoutAsset.includes('aria-pressed="false"'));

const enabledGuide = renderToStaticMarkup(
  <StudioGuideControl
    hasAsset
    opacity={0.5}
    visible
    onOpacityChange={noop}
    onRequestAsset={noop}
    onToggleVisible={noop}
  />,
);
assert.ok(
  !enabledGuide.includes('disabled=""'),
  "에셋이 있으면 슬라이더가 열려 있다.",
);

const hiddenGuide = renderToStaticMarkup(
  <StudioGuideControl
    hasAsset
    opacity={0.35}
    visible={false}
    onOpacityChange={noop}
    onRequestAsset={noop}
    onToggleVisible={noop}
  />,
);
assert.ok(hiddenGuide.includes('title="가이드 표시"'));
assert.ok(hiddenGuide.includes(">35%<"));

const visibleGuide = renderToStaticMarkup(
  <StudioGuideControl
    hasAsset
    opacity={1}
    visible
    onOpacityChange={noop}
    onRequestAsset={noop}
    onToggleVisible={noop}
  />,
);
assert.ok(visibleGuide.includes('title="가이드 숨기기"'));
assert.ok(visibleGuide.includes('aria-pressed="true"'));
assert.ok(visibleGuide.includes(">100%<"));

// --- 비활성 상태 ---

const disabledMarkup = renderToStaticMarkup(
  <StudioTopToolbar
    {...baseToolbarProps}
    publishAction={{ ...baseToolbarProps.publishAction, disabled: true }}
    saveAction={{ ...baseToolbarProps.saveAction, disabled: true }}
    shareAction={{
      title: "Open saved preview",
      disabled: true,
      onClick: noop,
    }}
  />,
);
assert.equal(
  (disabledMarkup.match(/disabled=""/g) ?? []).length,
  3,
  "저장, 발행, 공유의 비활성 상태가 마크업에 반영돼야 한다.",
);

console.log("Studio editor shell baseline checks passed.");
