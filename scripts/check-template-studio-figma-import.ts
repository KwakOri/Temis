import assert from "node:assert/strict";
import type { FigmaNormalizedNode } from "../src/types/template-studio-figma";
import { parseFigmaDesignUrl } from "../src/utils/template-studio/figma-import/figma-url";
import {
  adjustFigmaRectForCssCenterRotation,
  normalizeFigmaRotation,
} from "../src/utils/template-studio/figma-import/figma-rotation";
import {
  classifyFigmaTextNode,
  normalizeFigmaLayerName,
} from "../src/utils/template-studio/figma-import/figma-text-classifier";
import {
  exportFigmaNodeAsDataUrl,
  fetchFigmaGridCandidates,
} from "../src/services/server/figmaTemplateStudioService";
import {
  reviewFigmaGridNodes,
  reviewFigmaGridNodesWithWarnings,
  type FigmaReviewInput,
} from "../src/services/server/figmaGridReviewService";
import { createFigmaGridAnalyzeHandler } from "../src/app/api/admin/template-studio/figma/analyze/route";

const validUrl =
  "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=1412-5814";

assert.deepEqual(parseFigmaDesignUrl(validUrl), {
  fileKey: "T2VDXkMPVFa6yEl9FnVvYo",
  nodeId: "1412:5814",
});
assert.deepEqual(
  parseFigmaDesignUrl(
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=12-34",
  ),
  { fileKey: "T2VDXkMPVFa6yEl9FnVvYo", nodeId: "12:34" },
);
assert.equal(
  parseFigmaDesignUrl(
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid",
  ),
  null,
);
assert.equal(
  parseFigmaDesignUrl(
    "https://www.figma.com/file/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=1-2",
  ),
  null,
);
assert.equal(
  parseFigmaDesignUrl("https://www.figma.com/design/file/name?node-id=1-2"),
  null,
);

const metadataContract: FigmaNormalizedNode = {
  id: "1:2",
  name: "Title",
  type: "TEXT",
  textAutoResize: "WIDTH_AND_HEIGHT",
  layoutSizingHorizontal: "HUG",
  rotation: -13.5,
  rotatedWidth: 160,
  rotatedHeight: 100,
};
assert.equal(metadataContract.rotation, -13.5);
assert.equal(metadataContract.textAutoResize, "WIDTH_AND_HEIGHT");

assert.equal(normalizeFigmaRotation(undefined), undefined);
assert.equal(normalizeFigmaRotation(0), 0);
assert.equal(normalizeFigmaRotation(Math.PI / 2), 90);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 10,
    top: 20,
    width: 40,
    height: 30,
    rotateDeg: 0,
  }),
  { left: 10, top: 20, width: 40, height: 30 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 31,
    top: 3,
    width: 160,
    height: 100,
    rotateDeg: -13.5,
  }),
  // Controller ruling: 20.29 is intentional. Absolute sine/cosine bounds
  // are the project contract; the brief's literal 19.52 is inconsistent.
  { left: 40.46, top: 20.29, width: 160, height: 100 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 5,
    top: 7,
    width: 20,
    height: 10,
    rotateDeg: 45,
    rotatedWidth: 30,
    rotatedHeight: 25,
  }),
  { left: 10, top: 14.5, width: 20, height: 10 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 5,
    top: 7,
    width: 20,
    height: 10,
    rotateDeg: 45,
  }),
  { left: 5.61, top: 12.61, width: 20, height: 10 },
);

assert.equal(normalizeFigmaLayerName("mainTitle"), "maintitle");
assert.equal(normalizeFigmaLayerName("main_title"), "maintitle");
assert.equal(normalizeFigmaLayerName("main-title"), "maintitle");
assert.equal(normalizeFigmaLayerName("MAIN TITLE"), "maintitle");

const title = classifyFigmaTextNode({
  name: "main_title",
  characters: "A title",
});
assert.equal(title.role, "main_title");
assert.ok(title.confidence > 0);
assert.match(title.reason, /semantic/i);
assert.equal(title.binding.kind, "builtinField");
if (title.binding.kind === "builtinField")
  assert.equal(title.binding.fieldId, "entry.main_title");

const camelTitle = classifyFigmaTextNode({
  name: "mainTitle",
  characters: "A title",
});
assert.equal(camelTitle.role, "main_title");
assert.equal(camelTitle.studioType, "text");

const subTitle = classifyFigmaTextNode({
  name: "sub_title",
  characters: "Subtitle",
});
assert.equal(subTitle.role, "sub_title");
if (subTitle.binding.kind === "builtinField")
  assert.equal(subTitle.binding.fieldId, "entry.sub_title");

const time = classifyFigmaTextNode({
  name: "PM 8:00",
  characters: "PM 8:00",
  layoutSizingHorizontal: "FILL",
});
assert.equal(time.role, "time");
assert.equal(time.studioType, "text");
if (time.binding.kind === "builtinField")
  assert.equal(time.binding.fieldId, "entry.time");

const day = classifyFigmaTextNode({
  name: "MON",
  characters: "MON",
  textAutoResize: "WIDTH_AND_HEIGHT",
});
assert.equal(day.role, "day_label");
assert.equal(day.studioType, "text");
if (day.binding.kind === "builtinField")
  assert.equal(day.binding.fieldId, "day.short_label");

const date = classifyFigmaTextNode({
  name: "07",
  characters: "07",
  layoutSizingHorizontal: "FILL",
});
assert.equal(date.role, "date");
assert.equal(date.studioType, "text");
assert.deepEqual(date.binding, {
  kind: "builtinField",
  fieldId: "day.date",
  dateRangeFormat: "day",
});

const status = classifyFigmaTextNode({
  name: "ONLINE",
  characters: "ONLINE",
  layoutSizingHorizontal: "FILL",
});
assert.equal(status.role, "status_label");
assert.equal(status.studioType, "text");
if (status.binding.kind === "builtinField")
  assert.equal(status.binding.fieldId, "entry.status_label");

const dynamicTitle = classifyFigmaTextNode({
  name: "title",
  characters: "A long dynamic title",
  textAutoResize: "HEIGHT",
  layoutSizingHorizontal: "FILL",
});
assert.equal(dynamicTitle.role, "main_title");
assert.equal(dynamicTitle.studioType, "flexibleText");

const unknown = classifyFigmaTextNode({
  name: "mystery",
  characters: "Keep me",
});
assert.equal(unknown.role, "unknown");
assert.deepEqual(unknown.binding, { kind: "staticText", value: "Keep me" });
assert.match(unknown.reason, /review/i);

for (const [characters, role, fieldId] of [
  ["PM 8:00", "time", "entry.time"],
  ["MON", "day_label", "day.short_label"],
  ["07", "date", "day.date"],
  ["ONLINE", "status_label", "entry.status_label"],
] as const) {
  const protectedRole = classifyFigmaTextNode({
    name: "title",
    characters,
    layoutSizingHorizontal: "FILL",
  });
  assert.equal(protectedRole.role, role);
  assert.equal(protectedRole.studioType, "text");
  assert.equal(protectedRole.binding.kind, "builtinField");
  if (protectedRole.binding.kind === "builtinField")
    assert.equal(protectedRole.binding.fieldId, fieldId);
  assert.ok(protectedRole.confidence > 0);
  assert.match(protectedRole.reason, /semantic/i);
}

const gridReviewNodes: FigmaReviewInput[] = [
  {
    id: "grid-card-title",
    name: "Title",
    type: "TEXT",
    characters: "Weekly broadcast",
    textAutoResize: "HEIGHT",
    layoutSizingHorizontal: "FILL",
    absoluteBounds: { left: 20, top: 30, width: 120, height: 36 },
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "grid-card-day",
    name: "MON",
    type: "TEXT",
    characters: "MON",
    absoluteBounds: { left: 20, top: 10, width: 32, height: 18 },
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
];

const nonTextGridReviewNodes: FigmaReviewInput[] = [
  {
    id: "grid-decoration-image-1",
    name: "Image decoration one",
    type: "IMAGE",
    styleFlags: { hasSolidFill: false, hasImageFill: true, hasChildren: false },
  },
  {
    id: "grid-decoration-shape-1",
    name: "Shape decoration one",
    type: "RECTANGLE",
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "grid-decoration-group-1",
    name: "Group decoration one",
    type: "FRAME",
    styleFlags: { hasSolidFill: false, hasImageFill: false, hasChildren: true },
  },
  {
    id: "grid-decoration-image-2",
    name: "Image decoration two",
    type: "IMAGE",
    styleFlags: { hasSolidFill: false, hasImageFill: true, hasChildren: false },
  },
  {
    id: "grid-decoration-shape-2",
    name: "Shape decoration two",
    type: "RECTANGLE",
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "grid-decoration-group-2",
    name: "Group decoration two",
    type: "FRAME",
    styleFlags: { hasSolidFill: false, hasImageFill: false, hasChildren: true },
  },
];

const runReviewServiceChecks = async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.OPENAI_ACCESS_TOKEN;
  const originalModel = process.env.OPENAI_FIGMA_REVIEW_MODEL;
  const privateFigmaUrl =
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Private-Grid?node-id=1412-5814";
  const temporaryAssetUrl = "https://temporary.example/export.png";
  const openAiSecret = "openai-secret-token";

  const responseJson = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  try {
    delete process.env.OPENAI_ACCESS_TOKEN;
    delete process.env.OPENAI_FIGMA_REVIEW_MODEL;
    const rulesOnly = await reviewFigmaGridNodes(gridReviewNodes);
    assert.equal(rulesOnly.length, 2);
    assert.equal(rulesOnly[0]?.source, "rule");
    assert.equal(rulesOnly[0]?.suggestedRole, "main_title");
    assert.equal(rulesOnly[0]?.suggestedStudioType, "flexibleText");
    assert.equal(rulesOnly[1]?.suggestedRole, "day_label");

    const unavailable = await reviewFigmaGridNodesWithWarnings(gridReviewNodes);
    assert.equal(unavailable.reviews[0]?.source, "rule");
    assert.match(unavailable.warnings[0] ?? "", /automated review/i);

    process.env.OPENAI_ACCESS_TOKEN = openAiSecret;
    process.env.OPENAI_FIGMA_REVIEW_MODEL = "fixed-grid-review-model";
    let aiResponse: unknown = {
      reviews: [
        {
          sourceNodeId: "grid-card-title",
          suggestedRole: "main_title",
          suggestedStudioType: "flexibleText",
          confidence: 0.88,
          reason: "The GRID card title is dynamic.",
        },
      ],
    };
    let capturedOpenAiBody = "";
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(input), "https://api.openai.com/v1/chat/completions");
      capturedOpenAiBody = String(init?.body ?? "");
      return responseJson({
        choices: [{ message: { content: JSON.stringify(aiResponse) } }],
      });
    }) as typeof fetch;

    const redactionInput: FigmaReviewInput[] = [
      {
        ...gridReviewNodes[0]!,
        name: `Title ${privateFigmaUrl} ${temporaryAssetUrl}`,
        characters: `data:image/png;base64,AAAA ${openAiSecret}`,
      },
    ];
    const aiReview = await reviewFigmaGridNodesWithWarnings(redactionInput);
    assert.equal(aiReview.warnings.length, 0);
    assert.equal(aiReview.reviews[0]?.source, "ai");
    assert.equal(aiReview.reviews[0]?.suggestedStudioType, "flexibleText");
    assert.deepEqual(aiReview.reviews[0]?.suggestedBinding, {
      kind: "builtinField",
      fieldId: "entry.main_title",
    });
    assert.equal(JSON.parse(capturedOpenAiBody).model, "fixed-grid-review-model");
    assert.equal(capturedOpenAiBody.includes(privateFigmaUrl), false);
    assert.equal(capturedOpenAiBody.includes(temporaryAssetUrl), false);
    assert.equal(capturedOpenAiBody.includes(openAiSecret), false);
    assert.doesNotMatch(capturedOpenAiBody, /data:image\/png;base64/i);

    aiResponse = {
      reviews: nonTextGridReviewNodes.map((node, index) => ({
        sourceNodeId: node.id,
        suggestedRole: [
          "main_title",
          "sub_title",
          "time",
          "day_label",
          "date",
          "status_label",
        ][index],
        suggestedStudioType: node.type === "IMAGE"
          ? "image"
          : node.type === "FRAME"
            ? "group"
            : "shape",
        confidence: 0.99,
        reason: "The model incorrectly assigned a text-field role to decoration.",
      })),
    };
    const nonTextRejected = await reviewFigmaGridNodesWithWarnings(nonTextGridReviewNodes);
    assert.equal(nonTextRejected.reviews.length, nonTextGridReviewNodes.length);
    assert.ok(nonTextRejected.reviews.every((review) => review.source === "rule"));
    assert.ok(nonTextRejected.reviews.every((review) => review.suggestedRole === "decoration"));
    assert.ok(nonTextRejected.reviews.every((review) => review.suggestedBinding.kind === "staticText"));
    assert.deepEqual(nonTextRejected.reviews.map((review) => review.suggestedStudioType), [
      "image",
      "shape",
      "group",
      "image",
      "shape",
      "group",
    ]);
    assert.match(nonTextRejected.warnings[0] ?? "", /automated review/i);

    for (const invalidReview of [
      {
        sourceNodeId: "grid-card-title",
        suggestedRole: "administrator",
        suggestedStudioType: "text",
        confidence: 0.9,
        reason: "Unknown role.",
      },
      {
        sourceNodeId: "not-a-grid-node",
        suggestedRole: "main_title",
        suggestedStudioType: "text",
        confidence: 0.9,
        reason: "Unknown node.",
      },
      {
        sourceNodeId: "grid-card-title",
        suggestedRole: "main_title",
        suggestedStudioType: "autoText",
        confidence: 0.9,
        reason: "Invalid Studio type.",
      },
    ]) {
      aiResponse = { reviews: [invalidReview] };
      const rejected = await reviewFigmaGridNodesWithWarnings(gridReviewNodes);
      assert.ok(rejected.reviews.every((review) => review.source === "rule"));
      assert.match(rejected.warnings[0] ?? "", /automated review/i);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.OPENAI_ACCESS_TOKEN;
    else process.env.OPENAI_ACCESS_TOKEN = originalToken;
    if (originalModel === undefined) delete process.env.OPENAI_FIGMA_REVIEW_MODEL;
    else process.env.OPENAI_FIGMA_REVIEW_MODEL = originalModel;
  }
};

const runRouteContractChecks = async () => {
  const secretToken = "figma-secret-token";
  const privateFigmaUrl =
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Private-Grid?node-id=1412-5814";
  const invalidFigmaUrl = "https://example.test/private?token=" + secretToken;
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.FIGMA_ACCESS_TOKEN;
  let selectedRootName = "GRID";
  let selectedRootType = "FRAME";
  let figmaFetchCount = 0;
  let streamingAssetPulls = 0;

  const responseJson = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  try {
    delete process.env.FIGMA_ACCESS_TOKEN;
    const missingTokenHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    });
    const missingTokenResponse = await missingTokenHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    const missingTokenBody = await missingTokenResponse.text();
    assert.equal(missingTokenResponse.status, 503);
    assert.doesNotMatch(missingTokenBody, new RegExp(secretToken));
    assert.doesNotMatch(missingTokenBody, new RegExp(privateFigmaUrl));

    const invalidPayloadHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    });
    const invalidPayloadResponse = await invalidPayloadHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: 42 }),
      }),
    );
    assert.equal(invalidPayloadResponse.status, 400);

    const invalidUrlResponse = await invalidPayloadHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({
          figmaUrl: invalidFigmaUrl,
        }),
      }),
    );
    const invalidUrlBody = await invalidUrlResponse.text();
    assert.equal(invalidUrlResponse.status, 400);
    assert.doesNotMatch(invalidUrlBody, new RegExp(secretToken));
    assert.doesNotMatch(invalidUrlBody, new RegExp(invalidFigmaUrl));

    process.env.FIGMA_ACCESS_TOKEN = secretToken;
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      figmaFetchCount += 1;
      if (url.includes("/v1/files/")) {
        return responseJson({
          nodes: {
            "1412:5814": {
              document: {
                id: "1412:5814",
                name: selectedRootName,
                type: selectedRootType,
                absoluteBoundingBox: { x: 0, y: 0, width: 1000, height: 400 },
                children: [
                  {
                    id: "profile",
                    name: "PROFILE",
                    type: "FRAME",
                    children: [],
                  },
                  {
                    id: "card-1",
                    name: "Monday card",
                    type: "FRAME",
                    absoluteBoundingBox: {
                      x: 10,
                      y: 20,
                      width: 140,
                      height: 180,
                    },
                    children: [
                      {
                        id: "title-1",
                        name: "Title",
                        type: "TEXT",
                        characters: "Hello",
                        textAutoResize: "HEIGHT",
                        rotation: 0.25,
                        visible: true,
                        fills: [
                          {
                            type: "SOLID",
                            color: { r: 1, g: 0, b: 0 },
                            opacity: 0.5,
                          },
                        ],
                      },
                      { id: "asset-1", name: "Decoration", type: "IMAGE" },
                      {
                        id: "large-asset",
                        name: "Large decoration",
                        type: "IMAGE",
                      },
                    ],
                  },
                  {
                    id: "card-2",
                    name: "Tuesday card",
                    type: "FRAME",
                    absoluteBoundingBox: {
                      x: 160,
                      y: 20,
                      width: 140,
                      height: 180,
                    },
                    children: [],
                  },
                  { id: "board", name: "board", type: "FRAME", children: [] },
                ],
              },
            },
          },
        });
      }
      if (url.includes("/v1/images/")) {
        return responseJson({
          images: url.includes("large-asset")
            ? { "large-asset": "https://temporary.example/large.png" }
            : url.includes("stream-asset")
              ? { "stream-asset": "https://temporary.example/stream.png" }
              : { "asset-1": "https://temporary.example/asset.png" },
        });
      }
      if (url === "https://temporary.example/asset.png") {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png", "content-length": "4" },
        });
      }
      if (url === "https://temporary.example/large.png") {
        return new Response(null, {
          headers: {
            "content-type": "image/png",
            "content-length": String(10 * 1024 * 1024 + 1),
          },
        });
      }
      if (url === "https://temporary.example/stream.png") {
        const chunks = [
          new Uint8Array(10 * 1024 * 1024),
          new Uint8Array([1]),
          new Uint8Array([2]),
        ];
        return new Response(
          new ReadableStream<Uint8Array>(
            {
              pull(controller) {
                const chunk = chunks[streamingAssetPulls++];
                if (chunk) controller.enqueue(chunk);
                else controller.close();
              },
            },
            { highWaterMark: 0 },
          ),
          { headers: { "content-type": "image/png" } },
        );
      }
      throw new Error("Unexpected mocked request");
    }) as typeof fetch;

    const fetchesBeforeDeniedAuth = figmaFetchCount;
    const deniedAuthResponse = await createFigmaGridAnalyzeHandler({
      requireActor: async () => ({
        ok: false as const,
        response: new Response("denied", { status: 401 }),
      }),
    })(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    assert.equal(deniedAuthResponse.status, 401);
    assert.equal(figmaFetchCount, fetchesBeforeDeniedAuth);

    selectedRootName = "PROFILE";
    const nonGridRouteResponse = await createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    })(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    const nonGridRouteBody = await nonGridRouteResponse.text();
    assert.equal(nonGridRouteResponse.status, 422);
    assert.doesNotMatch(nonGridRouteBody, new RegExp(secretToken));
    assert.doesNotMatch(nonGridRouteBody, new RegExp(privateFigmaUrl));

    selectedRootName = "GRID";
    selectedRootType = "GROUP";
    const unsupportedRootTypeResponse = await createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    })(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    assert.equal(unsupportedRootTypeResponse.status, 422);

    selectedRootType = "FRAME";

    const discovered = await fetchFigmaGridCandidates({
      fileKey: "T2VDXkMPVFa6yEl9FnVvYo",
      nodeId: "1412:5814",
    });
    assert.equal(discovered.candidates.length, 2);
    assert.equal(discovered.candidates[0]?.root.id, "card-1");
    assert.equal(
      discovered.candidates[0]?.root.children?.[0]?.textAutoResize,
      "HEIGHT",
    );
    assert.equal(discovered.candidates[0]?.root.children?.[0]?.rotation, 14.32);
    assert.deepEqual(discovered.candidates[0]?.root.children?.[0]?.fills, [
      { type: "SOLID", color: { r: 1, g: 0, b: 0 }, opacity: 0.5 },
    ]);
    assert.match(
      discovered.candidates[0]?.assets[0]?.src ?? "",
      /^data:image\/png;base64,/,
    );
    assert.equal(discovered.candidates[0]?.assets[0]?.sourceNodeId, "asset-1");
    assert.equal(discovered.candidates[0]?.assets.length, 1);
    assert.match(discovered.candidates[0]?.warnings[0] ?? "", /10 MiB/);

    const asset = await exportFigmaNodeAsDataUrl(
      "T2VDXkMPVFa6yEl9FnVvYo",
      "asset-1",
      "png",
    );
    assert.equal(asset.mimeType, "image/png");
    assert.equal(asset.byteSize, 4);
    assert.match(asset.src, /^data:image\/png;base64,/);

    await assert.rejects(
      exportFigmaNodeAsDataUrl("T2VDXkMPVFa6yEl9FnVvYo", "stream-asset", "png"),
      /maximum size/,
    );
    assert.equal(streamingAssetPulls, 2);

    const routeHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
      reviewNodes: async (nodes) => ({
        reviews: nodes.map((node) => ({
          sourceNodeId: node.id,
          label: node.name,
          sourceType: node.type,
          suggestedRole: "unknown",
          suggestedStudioType: "text",
          suggestedBinding: { kind: "staticText", value: node.characters ?? "" },
          confidence: 0.2,
          source: "rule",
          reason: "Route propagation fixture.",
        })),
        warnings: ["Automated review was unavailable; deterministic suggestions are shown."],
      }),
      toCandidates: async ({ candidates }) => {
        assert.match(candidates[0]?.reviews?.[0]?.reason ?? "", /Route propagation fixture/);
        return candidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          label: candidate.label,
          frame: { left: 10, top: 20, width: 140, height: 180 },
          component: {
            nodes: {
              "fixture-root": {
                id: "fixture-root",
                type: "group",
                label: "Fixture root",
                parentId: null,
                childIds: [],
              },
            },
            styles: {},
            rootNodeId: "fixture-root",
            assets: [],
          },
          reviews: candidate.reviews ?? [],
          warnings: candidate.warnings,
        }));
      },
    });
    const routeResponse = await routeHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    const routeBody = await routeResponse.text();
    assert.equal(routeResponse.status, 200);
    assert.doesNotMatch(routeBody, new RegExp(secretToken));
    assert.doesNotMatch(routeBody, new RegExp(privateFigmaUrl));
    assert.doesNotMatch(routeBody, /temporary\.example/);
    assert.match(routeBody, /Monday card/);
    assert.match(routeBody, /10 MiB/);
    assert.match(routeBody, /Automated review was unavailable/);
    assert.match(routeBody, /Route propagation fixture/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN;
    else process.env.FIGMA_ACCESS_TOKEN = originalToken;
  }
};

void runReviewServiceChecks()
  .then(runRouteContractChecks)
  .then(() => console.log("Figma import contract checks passed"))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
