import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConsumerTemplateCard } from "../src/components/templates/consumer-template-card";
import {
  normalizeConsumerTemplate,
  resolveConsumerTemplateCover,
} from "../src/utils/templates/consumer-template";

const LEGACY_TEMPLATE_ID = "06d6401a-1b2a-4e98-a5d2-363984b3bfbb";

const baseTemplate = {
  id: LEGACY_TEMPLATE_ID,
  name: "Baseline template",
  description: "A consumer-facing template",
  thumbnail_url: "",
  is_public: true,
  template_engine: "legacy",
  template_kind: null,
  status: "published",
  use_href: `/time-table/${LEGACY_TEMPLATE_ID}`,
};

const normalize = (overrides: Record<string, unknown> = {}) =>
  normalizeConsumerTemplate({
    access_source: "purchase",
    template_plan: { plan: "lite" },
    templates: { ...baseTemplate, ...overrides },
  });

const legacy = normalize();
assert(legacy);
assert.equal(legacy.id, LEGACY_TEMPLATE_ID);
assert.equal(legacy.engine, "legacy");
assert.equal(legacy.kind, "timetable");
assert.equal(legacy.salesType, "general");
assert.equal(legacy.accessSource, "purchase");
assert.equal(legacy.plan, "lite");
assert.equal(legacy.thumbnailUrl, null);
assert.equal(legacy.coverUrl, `/thumbnail/${LEGACY_TEMPLATE_ID}.png`);
assert.equal(legacy.useHref, `/time-table/${LEGACY_TEMPLATE_ID}`);

const customThumbnail = normalize({
  id: "studio-thumbnail",
  template_engine: "studio",
  template_kind: "thumbnail",
  is_public: false,
  thumbnail_url: "https://cdn.example.test/thumbnail.png",
  use_href: "/thumbnail/studio-thumbnail",
});
assert(customThumbnail);
assert.equal(customThumbnail.kind, "thumbnail");
assert.equal(customThumbnail.salesType, "custom");
assert.equal(
  customThumbnail.coverUrl,
  "https://cdn.example.test/thumbnail.png",
);

const studioTimetable = normalize({
  id: "studio-timetable",
  template_engine: "studio",
  template_kind: "timetable",
  use_href: "/template-studio/studio-timetable",
});
assert(studioTimetable);
assert.equal(studioTimetable.coverUrl, null);

assert.equal(
  resolveConsumerTemplateCover({
    id: "legacy-cover",
    engine: "legacy",
    kind: "timetable",
    thumbnailUrl: "https://cdn.example.test/explicit.png",
  }),
  "https://cdn.example.test/explicit.png",
);

for (const invalid of [
  { id: "unsupported-legacy", use_href: "/time-table/unsupported-legacy" },
  { template_engine: "studio", template_kind: null },
  { template_engine: "legacy", template_kind: "thumbnail" },
  { template_engine: "unknown", template_kind: null },
  { template_engine: "studio", template_kind: "unknown" },
  { is_public: "true" },
  { use_href: "javascript:alert(1)" },
]) {
  assert.equal(
    normalize(invalid),
    null,
    `Invalid consumer row should be rejected: ${JSON.stringify(invalid)}`,
  );
}

const timetableMarkup = renderToStaticMarkup(
  <ConsumerTemplateCard template={legacy} showEngineBadge />,
);
assert.match(
  timetableMarkup,
  new RegExp(`<a\\b[^>]*href="/time-table/${LEGACY_TEMPLATE_ID}"`),
);
assert.ok(timetableMarkup.includes("시간표"));
assert.ok(timetableMarkup.includes("시간표 만들기"));
assert.ok(timetableMarkup.includes("Legacy"));
assert.ok(timetableMarkup.includes("LITE"));
assert.ok(
  timetableMarkup.includes(`src="/thumbnail/${LEGACY_TEMPLATE_ID}.png"`),
);
assert.ok(!timetableMarkup.includes('role="button"'));
assert.ok(!timetableMarkup.includes("onClick"));
assert.ok(!timetableMarkup.includes("innerHTML"));

const thumbnailMarkup = renderToStaticMarkup(
  <ConsumerTemplateCard template={customThumbnail} />,
);
assert.match(thumbnailMarkup, /<a\b[^>]*href="\/thumbnail\/studio-thumbnail"/);
assert.ok(thumbnailMarkup.includes("썸네일"));
assert.ok(thumbnailMarkup.includes("썸네일 만들기"));
assert.ok(thumbnailMarkup.includes("맞춤"));
assert.ok(thumbnailMarkup.includes("작가 작업물") === false);
assert.ok(thumbnailMarkup.includes("대표 이미지"));
assert.ok(!thumbnailMarkup.includes("/thumbnail/studio-thumbnail.png"));

console.log("Consumer template contract and card checks passed.");
