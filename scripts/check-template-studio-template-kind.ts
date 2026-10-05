import { createStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";
import assert from "node:assert/strict";

import type { StudioTemplateDocument } from "../src/types/template-studio";
import {
  migrateStudioTemplateDocument,
  STUDIO_TEMPLATE_DOCUMENT_VERSION,
} from "../src/utils/template-studio/migrations";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  getStudioTemplateKind,
  isStudioTemplateKind,
  isStudioTemplateKindMatch,
} from "../src/utils/template-studio/template-kind";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import {
  createThumbnailStudioDocument,
  THUMBNAIL_STUDIO_DEFAULT_CANVAS,
} from "../src/utils/thumbnail-studio/document-factory";

const blockingIds = (document: StudioTemplateDocument) =>
  validateStudioDocument(document)
    .filter((item) => item.severity === "error")
    .map((item) => item.id);

// --- kind 판정 ---

assert.equal(isStudioTemplateKind("timetable"), true);
assert.equal(isStudioTemplateKind("thumbnail"), true);
assert.equal(isStudioTemplateKind("legacy"), false);
assert.equal(isStudioTemplateKind(undefined), false);

assert.equal(
  getStudioTemplateKind({ metadata: { kind: "thumbnail" } }),
  "thumbnail",
  "metadata.kind가 최우선이다.",
);
assert.equal(
  getStudioTemplateKind({ domains: { timetable: { version: 2 } } }),
  "timetable",
  "kind가 없으면 timetable 도메인 존재로 추론한다.",
);
assert.equal(
  getStudioTemplateKind({}, { requestedKind: "thumbnail" }),
  "thumbnail",
  "문서로 판정할 수 없으면 호출자가 준 kind를 쓴다.",
);
assert.equal(
  getStudioTemplateKind({}),
  null,
  "판정할 수 없으면 null이다. 임의로 추측하지 않는다.",
);
assert.equal(
  getStudioTemplateKind(
    { metadata: { kind: "timetable" } },
    { requestedKind: "thumbnail" },
  ),
  "timetable",
  "문서에 기록된 kind가 요청 kind보다 우선한다.",
);

assert.equal(
  isStudioTemplateKindMatch({ metadata: { kind: "thumbnail" } }, "thumbnail"),
  true,
);
assert.equal(
  isStudioTemplateKindMatch({ metadata: { kind: "thumbnail" } }, "timetable"),
  false,
);
assert.equal(
  isStudioTemplateKindMatch({}, "thumbnail"),
  true,
  "판정할 수 없는 레거시 문서는 요청 kind를 거부하지 않는다.",
);
assert.equal(
  isStudioTemplateKindMatch({ metadata: { kind: "thumbnail" } }, "unknown"),
  false,
);

// Timetable recipes are unsupported; v8 is the canonical document.
const legacyDocument = createSampleStudioDocument();
assert.equal(migrateStudioTemplateDocument(legacyDocument).ok, false);
assert.equal(migrateStudioTemplateDocument(createStudioTimetableGraphDocument()).ok, true);

// 지원하지 않는 버전은 거부한다.
const futureDocument = JSON.parse(
  JSON.stringify(createSampleStudioDocument()),
) as Record<string, unknown>;
futureDocument.version = 99;
const rejected = migrateStudioTemplateDocument(futureDocument);
assert.equal(rejected.ok, false);

// --- 빈 썸네일 문서 팩토리 ---

const thumbnail = createThumbnailStudioDocument();
assert.equal(thumbnail.version, STUDIO_TEMPLATE_DOCUMENT_VERSION);
assert.equal(thumbnail.metadata.kind, "thumbnail");
assert.equal(thumbnail.canvas.width, THUMBNAIL_STUDIO_DEFAULT_CANVAS.width);
assert.equal(thumbnail.canvas.height, THUMBNAIL_STUDIO_DEFAULT_CANVAS.height);
assert.deepEqual(
  thumbnail.graph,
  { rootNodeIds: [], nodes: {} },
  "캔버스를 표현하기 위한 root node를 만들지 않는다.",
);
assert.equal(thumbnail.domains?.thumbnail?.version, 1);
assert.equal(thumbnail.domains?.thumbnail?.export.defaultFormat, "png");
assert.equal(
  thumbnail.domains?.timetable,
  undefined,
  "썸네일 문서는 시간표 도메인을 갖지 않는다.",
);
assert.deepEqual(blockingIds(thumbnail), [], "빈 썸네일 문서는 유효하다.");

const sized = createThumbnailStudioDocument({
  name: "  Custom  ",
  width: 1080,
  height: 1080,
  transparentBackground: true,
});
assert.equal(sized.metadata.name, "Custom");
assert.equal(sized.canvas.width, 1080);
assert.equal(sized.domains?.thumbnail?.export.transparentBackground, true);

// 팩토리 결과도 마이그레이션을 통과한다.
const thumbnailMigration = migrateStudioTemplateDocument(thumbnail);
assert.equal(thumbnailMigration.ok, true);
assert.equal(thumbnailMigration.document.metadata.kind, "thumbnail");

// --- kind와 도메인 불변식 ---

assert.deepEqual(
  blockingIds(createSampleStudioDocument()),
  [],
  "샘플 시간표 문서는 유효하다.",
);

const kindlessDocument = createSampleStudioDocument();
delete (kindlessDocument.metadata as { kind?: unknown }).kind;
assert.ok(
  blockingIds(kindlessDocument).includes("template-kind-missing"),
  "kind가 없는 문서는 저장·발행이 막힌다.",
);

const bothDomains = createSampleStudioDocument();
bothDomains.domains = {
  ...bothDomains.domains,
  thumbnail: {
    version: 1,
    export: { defaultFormat: "png", transparentBackground: false },
  },
};
const bothIds = blockingIds(bothDomains);
assert.ok(bothIds.includes("template-kind-both-domains"));
assert.ok(bothIds.includes("template-kind-domain-mismatch:timetable"));

const thumbnailWithTimetable = createThumbnailStudioDocument();
thumbnailWithTimetable.domains = {
  ...thumbnailWithTimetable.domains,
  timetable: createSampleStudioDocument().domains!.timetable,
};
assert.ok(
  blockingIds(thumbnailWithTimetable).includes(
    "template-kind-domain-mismatch:thumbnail",
  ),
);

const thumbnailWithoutDomain = createThumbnailStudioDocument();
delete thumbnailWithoutDomain.domains?.thumbnail;
assert.ok(
  blockingIds(thumbnailWithoutDomain).includes(
    "template-kind-domain-missing:thumbnail",
  ),
);

// --- textAppearance는 텍스트 노드에만 유효하다 ---

const appearanceDocument = createThumbnailStudioDocument();
appearanceDocument.graph.nodes.probe_group = {
  id: "probe_group",
  type: "group",
  label: "Probe Group",
  parentId: null,
  childIds: [],
  textAppearance: {
    fill: { type: "solid", color: "#000000", opacity: 1 },
    strokes: [],
  },
};
appearanceDocument.graph.rootNodeIds.push("probe_group");

const appearanceDiagnostics = validateStudioDocument(appearanceDocument);
const appearanceWarning = appearanceDiagnostics.find(
  (item) => item.id === "text-appearance-unsupported:probe_group",
);
assert.ok(appearanceWarning, "비텍스트 노드의 textAppearance는 경고 대상이다.");
assert.equal(
  appearanceWarning?.severity,
  "warning",
  "경고이므로 저장을 막지 않는다.",
);

console.log("Template Studio template kind checks passed.");
