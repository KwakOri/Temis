import assert from "node:assert/strict";
import type {
  FigmaNormalizedNode,
  StudioFigmaGridCandidate,
  StudioFigmaNodeReview,
} from "../src/types/template-studio-figma";
import type { StudioAsset } from "../src/types/template-studio";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { applyStudioFigmaGridCandidate } from "../src/utils/template-studio/figma-import/figma-component-import";
import { ensureStudioIndependentStatusVariants } from "../src/utils/template-studio/status-variants";
import { parseFigmaDesignUrl } from "../src/utils/template-studio/figma-import/figma-url";
import {
  adjustFigmaRectForCssCenterRotation,
  normalizeFigmaRotation,
} from "../src/utils/template-studio/figma-import/figma-rotation";
import {
  classifyFigmaTextNode,
  normalizeFigmaLayerName,
} from "../src/utils/template-studio/figma-import/figma-text-classifier";
import { convertFigmaGridCandidate } from "../src/utils/template-studio/figma-import/figma-node-converter";
import { applyStudioFigmaReviewEdits } from "../src/utils/template-studio/figma-import/figma-review-edits";
import {
  exportFigmaNodeAsDataUrl,
  fetchFigmaGridCandidates,
} from "../src/services/server/figmaTemplateStudioService";
import { planStudioAssetSync } from "../src/utils/template-studio/asset-sync";
import {
  reviewFigmaGridNodes,
  reviewFigmaGridNodesWithWarnings,
  type FigmaReviewInput,
} from "../src/services/server/figmaGridReviewService";
import { createFigmaGridAnalyzeHandler } from "../src/services/server/figmaGridAnalyzeHandler";

const validUrl =
  "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=1412-5814";

const runTask9AssetSyncChecks = () => {
  const dataUrls = [
    ["image/png", "iVBORw0KGgo="],
    ["image/jpeg", "/9j/4AAQ"],
    ["image/svg+xml", "PHN2Zz48L3N2Zz4="],
    ["image/webp", "UklGRg=="],
  ] as const;

  for (const [mimeType, payload] of dataUrls) {
    const src = `data:${mimeType};base64,${payload}`;
    const asset: StudioAsset = {
      id: `task9-${mimeType}`,
      label: `Task 9 ${mimeType}`,
      src,
    };
    const plan = planStudioAssetSync({
      assets: [asset],
      remoteAssets: [],
      localMetadataByAssetId: {},
    });
    assert.equal(
      plan.uploads.length,
      1,
      `${mimeType} data URL is planned for upload`,
    );
    assert.equal(plan.uploads[0]?.src, src);
    assert.equal(plan.patches.length, 0);
  }
};

runTask9AssetSyncChecks();

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
  rotateDeg: -13.5,
  localSize: { width: 160, height: 100 },
};
assert.equal(metadataContract.rotateDeg, -13.5);
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
assert.equal(camelTitle.studioType, "flexibleText");

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
                        effects: [{ type: "DROP_SHADOW", radius: 8 }],
                        strokes: [{ type: "SOLID", opacity: 1 }],
                        style: {
                          textAlignHorizontal: "RIGHT",
                          textAlignVertical: "TOP",
                        },
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
                      {
                        id: "effect-leaf",
                        name: "Effect export",
                        type: "FRAME",
                        absoluteBoundingBox: {
                          x: 40,
                          y: 60,
                          width: 20,
                          height: 20,
                        },
                        effects: [{ type: "DROP_SHADOW", radius: 4 }],
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
                    children: [
                      {
                        id: "day-2",
                        name: "weekday",
                        type: "TEXT",
                        characters: "TUE",
                      },
                    ],
                  },
                  { id: "board", name: "board", type: "FRAME", children: [] },
                ],
              },
            },
          },
        });
      }
      if (url.includes("/v1/images/")) {
        if (url.includes("effect-leaf")) {
          return responseJson({
            images: { "effect-leaf": "https://temporary.example/effect.png" },
          });
        }
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
      if (url === "https://temporary.example/effect.png") {
        return new Response(new Uint8Array([137, 80, 78, 71, 1]), {
          headers: { "content-type": "image/png", "content-length": "5" },
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
    assert.equal(discovered.candidates[0]?.root.children?.[0]?.rotateDeg, 14.32);
    assert.deepEqual(discovered.candidates[0]?.root.children?.[0]?.fills, [
      { type: "SOLID", color: { r: 1, g: 0, b: 0 }, opacity: 0.5 },
    ]);
    assert.deepEqual(
      (discovered.candidates[0]?.root.children?.[0] as FigmaNormalizedNode & {
        effects?: unknown[];
        strokes?: unknown[];
      })?.effects,
      [{ type: "DROP_SHADOW", radius: 8 }],
    );
    assert.deepEqual(
      (discovered.candidates[0]?.root.children?.[0] as FigmaNormalizedNode & {
        effects?: unknown[];
        strokes?: unknown[];
      })?.strokes,
      [{ type: "SOLID", opacity: 1 }],
    );
    assert.equal(discovered.candidates[0]?.root.children?.[0]?.textAlignHorizontal, "RIGHT");
    assert.equal(discovered.candidates[0]?.root.children?.[0]?.textAlignVertical, "TOP");
    assert.match(
      discovered.candidates[0]?.assets[0]?.src ?? "",
      /^data:image\/png;base64,/,
    );
    assert.equal(discovered.candidates[0]?.assets[0]?.sourceNodeId, "asset-1");
    assert.equal(discovered.candidates[0]?.assets.length, 2);
    assert.match(
      discovered.candidates[0]?.assets.find((asset) => asset.sourceNodeId === "effect-leaf")?.src ?? "",
      /^data:image\/png;base64,/,
    );
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

    const defaultRouteHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
      reviewNodes: async (nodes) => ({
        reviews: nodes.map((node) => ({
          sourceNodeId: node.id,
          label: node.name,
          sourceType: node.type,
          suggestedRole: node.type === "TEXT" ? "unknown" : "decoration",
          suggestedStudioType: node.type === "TEXT"
            ? "text"
            : node.styleFlags.hasImageFill || node.type === "IMAGE"
              ? "image"
              : node.styleFlags.hasChildren
                ? "group"
                : "shape",
          suggestedBinding: {
            kind: "staticText",
            value: node.characters ?? "",
          },
          confidence: 0.8,
          source: "rule",
          reason: "Default converter route fixture.",
        })),
        warnings: [],
      }),
    });
    const defaultRouteResponse = await defaultRouteHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    const defaultRouteBody = await defaultRouteResponse.json() as {
      candidates: Array<{
        component: {
          nodes: Record<string, { label: string; type: string }>;
          rootNodeId: string;
          assets: Array<{ src: string }>;
        };
        warnings: string[];
      }>;
      warnings: string[];
    };
    assert.equal(defaultRouteResponse.status, 200);
    assert.equal(defaultRouteBody.candidates.length, 2);
    const defaultCandidate = defaultRouteBody.candidates[0];
    assert.ok(defaultCandidate?.component.rootNodeId);
    assert.equal(
      defaultCandidate?.component.nodes[defaultCandidate.component.rootNodeId]?.type,
      "group",
    );
    assert.ok(Object.keys(defaultCandidate?.component.nodes ?? {}).length > 0);
    assert.equal(
      Object.values(defaultCandidate?.component.nodes ?? {})
        .find((node) => node.label === "Effect export")?.type,
      "image",
    );
    assert.ok(defaultCandidate?.component.assets.every((asset) => asset.src.startsWith("data:image/")));
    assert.equal(defaultRouteBody.warnings.some((warning) => /graph conversion is not connected/i.test(warning)), false);
    assert.doesNotMatch(JSON.stringify(defaultRouteBody), new RegExp(privateFigmaUrl));
    assert.doesNotMatch(JSON.stringify(defaultRouteBody), new RegExp(secretToken));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN;
    else process.env.FIGMA_ACCESS_TOKEN = originalToken;
  }
};

const converterReview = (
  sourceNodeId: string,
  suggestedStudioType: StudioFigmaNodeReview["suggestedStudioType"],
  suggestedRole: StudioFigmaNodeReview["suggestedRole"] = "decoration",
): StudioFigmaNodeReview => ({
  sourceNodeId,
  label: sourceNodeId,
  sourceType: suggestedStudioType === "text" || suggestedStudioType === "flexibleText"
    ? "TEXT"
    : "FRAME",
  suggestedRole,
  suggestedStudioType,
  suggestedBinding: suggestedRole === "main_title"
    ? { kind: "builtinField", fieldId: "entry.main_title" }
    : { kind: "staticText", value: "Fallback static value" },
  confidence: 0.9,
  source: "rule",
  reason: "Converter fixture review.",
});

type FigmaVisualMetadataFixtureNode = FigmaNormalizedNode & {
  effects?: unknown[];
  strokes?: unknown[];
  children?: FigmaVisualMetadataFixtureNode[];
};

const runConverterChecks = () => {
  const root = {
    id: "figma-card-root",
    name: "Monday card",
    type: "FRAME",
    absoluteBounds: { left: 100, top: 200, width: 300, height: 180 },
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.9 }],
    style: { cornerRadius: 12, clipsContent: true },
    children: [
      {
        id: "figma-entry",
        name: "Entry",
        type: "FRAME",
        absoluteBounds: { left: 110, top: 215, width: 220, height: 120 },
        children: [
          {
            id: "figma-title",
            name: "Title",
            type: "TEXT",
            characters: "Weekly broadcast",
            absoluteBounds: { left: 120, top: 225, width: 180, height: 24 },
            opacity: 0.8,
            effects: [{ type: "DROP_SHADOW", radius: 8 }],
            strokes: [{ type: "SOLID", opacity: 1 }],
            textAlignHorizontal: "RIGHT",
            textAlignVertical: "TOP",
            fills: [{ type: "SOLID", color: { r: 0.1, g: 0.2, b: 0.3 }, opacity: 0.5 }],
            style: {
              fontFamily: "Inter",
              fontSize: 20,
              fontWeight: 700,
              fontStyle: "italic",
              letterSpacing: 0.4,
              lineHeightPx: 28,
              lineHeightPercentFontSize: 125,
              textAlignHorizontal: "RIGHT",
              textAlignVertical: "TOP",
              unsupportedFigmaProperty: { nested: true },
            },
          },
          {
            id: "figma-image",
            name: "Banner decoration",
            type: "IMAGE",
            absoluteBounds: { left: 130, top: 260, width: 80, height: 40 },
          },
          {
            id: "figma-solid-shape",
            name: "Accent block",
            type: "RECTANGLE",
            absoluteBounds: { left: 220, top: 260, width: 40, height: 20 },
            fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0.5 }, opacity: 0.25 }],
          },
          {
            id: "figma-rotated-text",
            name: "Rotated label",
            type: "TEXT",
            characters: "NEW",
            absoluteBounds: { left: 160, top: 240, width: 20, height: 40 },
            absoluteRenderBounds: { left: 150, top: 250, width: 40, height: 20 },
            rotateDeg: 90,
            fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }],
            style: { fontSize: 12, fontWeight: 600 },
          },
          {
            id: "figma-missing-image",
            name: "Missing decoration",
            type: "IMAGE",
            absoluteBounds: { left: 270, top: 260, width: 20, height: 20 },
          },
          {
            id: "figma-effect-leaf",
            name: "Effect export",
            type: "FRAME",
            absoluteBounds: { left: 300, top: 260, width: 20, height: 20 },
            effects: [{ type: "LAYER_BLUR" }],
          },
        ],
      },
      {
        id: "figma-background",
        name: "Card background",
        type: "RECTANGLE",
        absoluteBounds: { left: 100, top: 200, width: 300, height: 180 },
        fills: [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }],
      },
    ],
  } as FigmaVisualMetadataFixtureNode;
  const reviews = [
    converterReview("figma-entry", "group"),
    converterReview("figma-title", "flexibleText", "main_title"),
    converterReview("figma-image", "image"),
    converterReview("figma-solid-shape", "shape"),
    converterReview("figma-rotated-text", "text", "unknown"),
    converterReview("figma-missing-image", "image"),
    converterReview("figma-effect-leaf", "group"),
    converterReview("figma-background", "shape"),
  ];
  const exportedAssets = [
    {
      sourceNodeId: "figma-image",
      src: "data:image/png;base64,AA==",
      mimeType: "image/png" as const,
      byteSize: 1,
    },
    {
      sourceNodeId: "figma-effect-leaf",
      src: "data:image/svg+xml;base64,AA==",
      mimeType: "image/svg+xml" as const,
      byteSize: 1,
    },
  ];
  const before = JSON.stringify({ root, reviews, exportedAssets });

  const candidate = convertFigmaGridCandidate({ root, reviews, exportedAssets });

  assert.equal(JSON.stringify({ root, reviews, exportedAssets }), before);
  assert.match(candidate.candidateId, /^candidate_/);
  assert.deepEqual(candidate.frame, { left: 0, top: 0, width: 300, height: 180 });
  assert.deepEqual(
    candidate.reviews.map((review) => review.sourceNodeId),
    reviews.map((review) => review.sourceNodeId),
    "Reviewed choices remain available to Task 7/8.",
  );
  assert.equal(
    candidate.reviewNodeIds?.["figma-title"],
    Object.values(candidate.component.nodes).find((node) => node.label === "Title")?.id,
    "Figma source review IDs map to converted graph IDs exactly.",
  );

  const nodes = Object.values(candidate.component.nodes);
  const nodeByLabel = (label: string) => nodes.find((node) => node.label === label);
  const candidateRoot = candidate.component.nodes[candidate.component.rootNodeId];
  const entry = nodeByLabel("Entry");
  const titleNode = nodeByLabel("Title");
  const imageNode = nodeByLabel("Banner decoration");
  const shapeNode = nodeByLabel("Accent block");
  const rotatedText = nodeByLabel("Rotated label");
  const missingImage = nodeByLabel("Missing decoration");
  const effectLeaf = nodeByLabel("Effect export");
  const backgroundNode = nodeByLabel("Card background");
  assert.ok(candidateRoot);
  assert.equal(candidateRoot?.parentId, null);
  assert.equal(candidateRoot?.type, "group");
  assert.deepEqual(candidateRoot?.childIds.map((id) => candidate.component.nodes[id]?.label), [
    "Entry",
    "Card background",
  ]);
  assert.equal(entry?.type, "group");
  assert.deepEqual(entry?.meta?.entrySlot, { index: 0 });
  assert.equal(nodes.filter((node) => node.meta?.entrySlot?.index === 0).length, 1);
  assert.deepEqual(entry?.childIds.map((id) => candidate.component.nodes[id]?.label), [
    "Title",
    "Banner decoration",
    "Accent block",
    "Rotated label",
    "Missing decoration",
    "Effect export",
  ]);
  assert.equal(titleNode?.type, "flexibleText");
  assert.deepEqual(titleNode?.binding, { kind: "builtinField", fieldId: "entry.main_title" });
  assert.equal(imageNode?.type, "image");
  assert.equal(imageNode?.fit, "cover");
  assert.equal(imageNode?.binding?.kind, "staticAsset");
  assert.equal(missingImage?.type, "image");
  assert.equal(missingImage?.binding, undefined);
  assert.equal(effectLeaf?.type, "image");
  assert.equal(effectLeaf?.binding?.kind, "staticAsset");
  assert.equal(shapeNode?.type, "shape");
  assert.deepEqual(shapeNode?.shapeFill, { type: "solid", color: "rgba(255, 0, 128, 0.25)" });
  assert.equal(backgroundNode?.type, "shape");

  const rootStyle = candidateRoot?.styleId
    ? candidate.component.styles[candidateRoot.styleId]
    : undefined;
  const entryStyle = entry?.styleId ? candidate.component.styles[entry.styleId] : undefined;
  const titleStyle = titleNode?.styleId ? candidate.component.styles[titleNode.styleId] : undefined;
  const rotatedTextStyle = rotatedText?.styleId
    ? candidate.component.styles[rotatedText.styleId]
    : undefined;
  assert.deepEqual(
    [rootStyle?.left, rootStyle?.top, rootStyle?.width, rootStyle?.height],
    [0, 0, 300, 180],
  );
  assert.deepEqual(
    [entryStyle?.left, entryStyle?.top, entryStyle?.width, entryStyle?.height],
    [10, 15, 220, 120],
  );
  assert.deepEqual([titleStyle?.left, titleStyle?.top], [10, 10]);
  assert.deepEqual(
    [rotatedTextStyle?.left, rotatedTextStyle?.top, rotatedTextStyle?.rotateDeg],
    [50, 25, 90],
  );
  assert.deepEqual(Object.keys(titleStyle ?? {}).sort(), [
    "alignItems",
    "color",
    "display",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "height",
    "justifyContent",
    "left",
    "letterSpacing",
    "lineHeight",
    "opacity",
    "position",
    "textAlign",
    "top",
    "width",
  ]);
  assert.equal(titleStyle?.color, "rgba(26, 51, 77, 0.5)");
  assert.equal(titleStyle?.lineHeight, "28px");
  assert.deepEqual(
    {
      textAlign: titleStyle?.textAlign,
      justifyContent: titleStyle?.justifyContent,
      alignItems: titleStyle?.alignItems,
    },
    {
      textAlign: "right",
      justifyContent: "flex-end",
      alignItems: "flex-start",
    },
  );
  assert.deepEqual(titleNode?.textAppearance, {
    fill: { type: "solid", color: "rgba(26, 51, 77, 0.5)", opacity: 1 },
    strokes: [],
  });
  assert.ok(candidate.warnings.some((warning) => /shadow|stroke|effect/i.test(warning)));
  assert.ok(candidate.warnings.some((warning) => /missing decoration.*unbound/i.test(warning)));
  assert.equal(candidate.component.assets.length, 2);
  assert.match(candidate.component.assets[0]?.id ?? "", /^asset_/);
  assert.match(candidate.component.assets[0]?.src ?? "", /^data:image\/png;base64,/);
  assert.ok(candidate.component.assets.every((asset) => /^data:image\/(?:png|svg\+xml);base64,/.test(asset.src)));
  assert.ok(candidate.component.assets.every((asset) => !/figma|temporary|https?:/i.test(asset.src)));

  const roleEditedCandidate = structuredClone(candidate);
  roleEditedCandidate.reviews = roleEditedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? { ...review, suggestedRole: "time" as const, suggestedStudioType: "text" as const }
      : review,
  );
  const roleEditedGraphCandidate = applyStudioFigmaReviewEdits(roleEditedCandidate);
  const roleEditedNodeId = roleEditedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    roleEditedNodeId ? roleEditedGraphCandidate.component.nodes[roleEditedNodeId]?.binding : undefined,
    { kind: "builtinField", fieldId: "entry.time" },
    "A role edit derives the matching builtin binding on the mapped graph node.",
  );

  const untouchedImageGraphCandidate = applyStudioFigmaReviewEdits(candidate);
  const untouchedImageNodeId = untouchedImageGraphCandidate.reviewNodeIds?.["figma-image"];
  assert.deepEqual(
    untouchedImageNodeId
      ? untouchedImageGraphCandidate.component.nodes[untouchedImageNodeId]?.binding
      : undefined,
    imageNode?.binding,
    "An untouched decoration image keeps its staticAsset binding without a touched map.",
  );

  const bindingEditedCandidate = structuredClone(candidate);
  bindingEditedCandidate.reviews = bindingEditedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? {
          ...review,
          suggestedRole: "main_title" as const,
          suggestedStudioType: "text" as const,
          suggestedBinding: { kind: "builtinField" as const, fieldId: "entry.time" },
        }
      : review,
  );
  const bindingEditedGraphCandidate = applyStudioFigmaReviewEdits(
    bindingEditedCandidate,
    { "figma-title": true },
  );
  const bindingEditedNodeId = bindingEditedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    bindingEditedNodeId
      ? bindingEditedGraphCandidate.component.nodes[bindingEditedNodeId]?.binding
      : undefined,
    { kind: "builtinField", fieldId: "entry.time" },
    "An explicitly edited binding wins over the review role.",
  );

  const roleThenReselectedBindingCandidate = structuredClone(candidate);
  roleThenReselectedBindingCandidate.reviews = roleThenReselectedBindingCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? {
          ...review,
          suggestedRole: "time" as const,
          suggestedStudioType: "text" as const,
          suggestedBinding: { kind: "builtinField" as const, fieldId: "entry.main_title" },
        }
      : review,
  );
  const roleThenReselectedGraphCandidate = applyStudioFigmaReviewEdits(
    roleThenReselectedBindingCandidate,
    { "figma-title": true },
  );
  const roleThenReselectedNodeId = roleThenReselectedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    roleThenReselectedNodeId
      ? roleThenReselectedGraphCandidate.component.nodes[roleThenReselectedNodeId]?.binding
      : undefined,
    { kind: "builtinField", fieldId: "entry.main_title" },
    "A touched binding preserves the explicitly re-selected original binding.",
  );

  const imageBindingEditedCandidate = structuredClone(candidate);
  imageBindingEditedCandidate.reviews = imageBindingEditedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-image"
      ? {
          ...review,
          suggestedRole: "decoration" as const,
          suggestedStudioType: "image" as const,
          suggestedBinding: { kind: "inputImage" as const, inputId: "image-source" },
        }
      : review,
  );
  const imageBindingEditedGraphCandidate = applyStudioFigmaReviewEdits(
    imageBindingEditedCandidate,
    { "figma-image": true },
  );
  const imageBindingEditedNodeId = imageBindingEditedGraphCandidate.reviewNodeIds?.["figma-image"];
  assert.deepEqual(
    imageBindingEditedNodeId
      ? imageBindingEditedGraphCandidate.component.nodes[imageBindingEditedNodeId]?.binding
      : undefined,
    { kind: "inputImage", inputId: "image-source" },
    "A touched decoration image preserves its explicitly selected image binding.",
  );

  const unknownRoleCandidate = structuredClone(candidate);
  unknownRoleCandidate.reviews = unknownRoleCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? { ...review, suggestedRole: "unknown" as const }
      : review,
  );
  const unknownRoleGraphCandidate = applyStudioFigmaReviewEdits(unknownRoleCandidate);
  const unknownRoleNodeId = unknownRoleGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    unknownRoleNodeId
      ? unknownRoleGraphCandidate.component.nodes[unknownRoleNodeId]?.binding
      : undefined,
    { kind: "staticText", value: "Weekly broadcast" },
    "An unknown role falls back to the source characters as safe static text.",
  );

  const editedCandidate = structuredClone(candidate);
  editedCandidate.reviews = editedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? {
          ...review,
          suggestedRole: "decoration" as const,
          suggestedStudioType: "shape" as const,
          suggestedBinding: { kind: "staticText" as const, value: "ignored for shape" },
        }
      : review,
  );
  const editedGraphCandidate = applyStudioFigmaReviewEdits(editedCandidate);
  const editedTitleNodeId = editedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.ok(editedTitleNodeId);
  const editedTitleNode = editedGraphCandidate.component.nodes[editedTitleNodeId!];
  assert.equal(editedTitleNode?.type, "shape");
  assert.equal(editedTitleNode?.binding, undefined);
  assert.equal(editedTitleNode?.textAppearance, undefined);

  const duplicateLabelRoot: FigmaNormalizedNode = {
    id: "duplicate-label-root",
    name: "Grid",
    type: "FRAME",
    absoluteBounds: { left: 0, top: 0, width: 100, height: 100 },
    children: [
      { id: "duplicate-a", name: "Duplicate", type: "TEXT", characters: "A", absoluteBounds: { left: 0, top: 0, width: 40, height: 20 } },
      { id: "duplicate-b", name: "Duplicate", type: "TEXT", characters: "B", absoluteBounds: { left: 0, top: 20, width: 40, height: 20 } },
    ],
  };
  const duplicateLabelCandidate = convertFigmaGridCandidate({
    root: duplicateLabelRoot,
    reviews: [
      converterReview("duplicate-a", "text", "main_title"),
      converterReview("duplicate-b", "text", "sub_title"),
    ],
    exportedAssets: [],
  });
  assert.notEqual(
    duplicateLabelCandidate.reviewNodeIds?.["duplicate-a"],
    duplicateLabelCandidate.reviewNodeIds?.["duplicate-b"],
    "Duplicate Figma labels keep distinct exact review mappings.",
  );

  const ids = [
    ...nodes.map((node) => node.id),
    ...Object.keys(candidate.component.styles),
    ...candidate.component.assets.map((asset) => asset.id),
  ];
  const sourceIds = new Set([
    "figma-card-root",
    "figma-entry",
    "figma-title",
    "figma-image",
    "figma-solid-shape",
    "figma-rotated-text",
    "figma-missing-image",
    "figma-effect-leaf",
    "figma-background",
  ]);
  const allowedStyleKeys = new Set([
    "position", "left", "top", "width", "height", "opacity", "rotateDeg",
    "backgroundColor", "borderRadius", "overflow", "fontFamily", "fontSize",
    "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "textAlign",
    "display", "alignItems", "justifyContent", "color",
  ]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => !sourceIds.has(id)));
  assert.ok(Object.values(candidate.component.styles).every((style) =>
    Object.keys(style).every((key) => allowedStyleKeys.has(key)),
  ));
  assert.equal(JSON.stringify(candidate.component).includes("unsupportedFigmaProperty"), false);

  const generatedEntrySource = structuredClone(root);
  generatedEntrySource.children![0]!.name = "Content";
  generatedEntrySource.children![0]!.children!.push({
    id: "figma-nested-entry",
    name: "entry-slot",
    type: "FRAME",
    absoluteBounds: { left: 115, top: 220, width: 100, height: 40 },
  });
  const generatedEntryCandidate = convertFigmaGridCandidate({
    root: generatedEntrySource,
    reviews,
    exportedAssets,
  });
  const generatedEntries = Object.values(generatedEntryCandidate.component.nodes)
    .filter((node) => node.meta?.entrySlot?.index === 0);
  const nestedEntry = Object.values(generatedEntryCandidate.component.nodes)
    .find((node) => node.label === "entry-slot");
  assert.equal(generatedEntries.length, 1);
  assert.equal(nestedEntry?.type, "group");
  assert.equal(nestedEntry?.meta, undefined);
  assert.deepEqual(
    generatedEntryCandidate.component.nodes[generatedEntryCandidate.component.rootNodeId]?.childIds,
    [generatedEntries[0]?.id],
  );
  assert.ok(
    generatedEntries[0]?.childIds.some((childId) =>
      Object.values(generatedEntryCandidate.component.nodes).some(
        (node) => node.id === childId && node.label === "Content",
      ),
    ),
  );
};

const createComponentImportCandidate = (): StudioFigmaGridCandidate => ({
  candidateId: "figma-source-card-1412:5814",
  label: "Monday card",
  frame: { left: 10, top: 20, width: 240, height: 140 },
  component: {
    rootNodeId: "figma-root",
    nodes: {
      "figma-root": {
        id: "figma-root",
        type: "group",
        label: "Monday card",
        parentId: null,
        childIds: ["figma-entry"],
        styleId: "figma-root-style",
      },
      "figma-entry": {
        id: "figma-entry",
        type: "group",
        label: "Entry",
        parentId: "figma-root",
        childIds: ["figma-title", "figma-image"],
        styleId: "figma-entry-style",
        meta: { entrySlot: { index: 0 } },
      },
      "figma-title": {
        id: "figma-title",
        type: "flexibleText",
        label: "Title",
        parentId: "figma-entry",
        childIds: [],
        styleId: "figma-title-style",
        binding: { kind: "builtinField", fieldId: "entry.main_title" },
      },
      "figma-image": {
        id: "figma-image",
        type: "image",
        label: "Decoration",
        parentId: "figma-entry",
        childIds: [],
        styleId: "figma-image-style",
        binding: { kind: "staticAsset", assetId: "figma-asset" },
        fit: "cover",
      },
    },
    styles: {
      "figma-root-style": { position: "absolute", left: 0, top: 0, width: 240, height: 140 },
      "figma-entry-style": { position: "absolute", left: 0, top: 0, width: 240, height: 140 },
      "figma-title-style": { position: "absolute", left: 18, top: 20, width: 180, height: 36, fontSize: 24, color: "#111827" },
      "figma-image-style": { position: "absolute", left: 12, top: 76, width: 80, height: 42 },
    },
    assets: [
      {
        id: "figma-asset",
        label: "Decoration",
        src: "data:image/png;base64,AA==",
        mimeType: "image/png",
        byteSize: 1,
      },
    ],
  },
  reviewNodeIds: {
    "figma-title": "figma-title",
    "figma-image": "figma-image",
  },
  reviews: [],
  warnings: ["Unsupported Figma shadow was omitted."],
});

const runComponentImportChecks = () => {
  const unsafeCandidateDocument = createSampleStudioDocument();
  const unsafeCandidateBefore = JSON.stringify(unsafeCandidateDocument);
  const unsafeCandidate = createComponentImportCandidate();
  unsafeCandidate.component.nodes["figma-title"]!.binding = {
    kind: "staticText",
    value: "https://www.figma.com/design/private-grid?node-id=1412-5814",
  };
  const unsafeCandidateResult = applyStudioFigmaGridCandidate(
    unsafeCandidateDocument,
    unsafeCandidate,
  );
  assert.equal(
    unsafeCandidateResult.ok,
    false,
    "A candidate containing a remote Figma URL is rejected before persistence.",
  );
  assert.equal(JSON.stringify(unsafeCandidateDocument), unsafeCandidateBefore);

  const transientSourceUrlCandidate = createComponentImportCandidate();
  const transientSourceUrlReview: StudioFigmaNodeReview = {
    sourceNodeId: "figma-title",
    label: "Title",
    sourceType: "TEXT",
    suggestedRole: "main_title",
    suggestedStudioType: "flexibleText",
    suggestedBinding: { kind: "builtinField", fieldId: "entry.main_title" },
    sourceCharacters: "https://example.com/live",
    confidence: 0.9,
    source: "rule",
    reason: "Fixture",
  };
  transientSourceUrlCandidate.reviews = [transientSourceUrlReview];
  transientSourceUrlCandidate.reviewDefaults = {
    "figma-title": structuredClone(transientSourceUrlReview),
  };
  assert.equal(
    applyStudioFigmaGridCandidate(createSampleStudioDocument(), transientSourceUrlCandidate).ok,
    true,
    "Transient source text URLs do not block a dynamic binding from being imported.",
  );

  const document = createSampleStudioDocument();
  const timetable = document.domains?.timetable;
  assert.ok(timetable);
  if (!timetable) return;
  timetable.days.mon!.componentId = timetable.entryComponentId;
  const originalEntryComponentId = timetable.entryComponentId;
  const originalDayComponentIds = JSON.stringify(
    Object.fromEntries(timetable.dayIds.map((dayId) => [dayId, timetable.days[dayId]?.componentId])),
  );
  const candidate = createComponentImportCandidate();
  const result = applyStudioFigmaGridCandidate(document, candidate);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.notEqual(result.componentId, originalEntryComponentId);
  assert.equal(timetable.entryComponentId, originalEntryComponentId);
  assert.equal(
    JSON.stringify(Object.fromEntries(timetable.dayIds.map((dayId) => [dayId, timetable.days[dayId]?.componentId]))),
    originalDayComponentIds,
  );
  const component = timetable.components[result.componentId];
  assert.ok(component);
  assert.deepEqual(Object.keys(component?.variants ?? {}).sort(), ["offline", "online"]);
  const onlineRootId = component?.variants.online?.rootNodeId;
  const offlineRootId = component?.variants.offline?.rootNodeId;
  assert.ok(onlineRootId && offlineRootId && onlineRootId !== offlineRootId);
  const collectSubtreeStyleIds = (rootId: string) => {
    const styleIds = new Set<string>();
    const visit = (nodeId: string) => {
      const node = document.graph.nodes[nodeId];
      if (!node) return;
      if (node.styleId) styleIds.add(node.styleId);
      node.childIds.forEach(visit);
    };
    visit(rootId);
    return styleIds;
  };
  const onlineStyleIds = collectSubtreeStyleIds(onlineRootId!);
  const offlineStyleIds = collectSubtreeStyleIds(offlineRootId!);
  assert.equal([...onlineStyleIds].some((styleId) => offlineStyleIds.has(styleId)), false);
  for (const rootId of [onlineRootId!, offlineRootId!]) {
    const directEntryGroups = document.graph.nodes[rootId]?.childIds
      .map((nodeId) => document.graph.nodes[nodeId])
      .filter((node) => node?.meta?.entrySlot?.index === 0);
    assert.equal(directEntryGroups?.length, 1);
  }
  assert.equal(JSON.stringify(document).includes("https://www.figma.com/design/private-grid"), false);
  assert.equal(JSON.stringify(document).includes("reviewNodeIds"), false);
  assert.equal(JSON.stringify(document).includes("bindingTouchedSourceNodeIds"), false);
  assert.ok(result.warnings.some((warning) => /Unsupported Figma shadow/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /multi/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /offline memo/i.test(warning)));

  const duplicate = applyStudioFigmaGridCandidate(document, candidate);
  assert.equal(duplicate.ok, true);
  if (!duplicate.ok) return;
  assert.notEqual(duplicate.componentId, result.componentId);
  assert.notEqual(
    timetable.components[duplicate.componentId]?.label,
    timetable.components[result.componentId]?.label,
  );

  const capabilityDocument = createSampleStudioDocument();
  const capabilityTimetable = capabilityDocument.domains?.timetable;
  assert.ok(capabilityTimetable);
  if (!capabilityTimetable) return;
  capabilityTimetable.capabilities!.multi.enabled = true;
  capabilityTimetable.capabilities!.offlineMemo.enabled = true;
  ensureStudioIndependentStatusVariants(capabilityDocument);
  const existingCapabilityComponents = structuredClone(capabilityTimetable.components);
  const capabilityDayAssignments = JSON.stringify(
    Object.fromEntries(
      capabilityTimetable.dayIds.map((dayId) => [dayId, capabilityTimetable.days[dayId]?.componentId]),
    ),
  );
  const capabilityImport = applyStudioFigmaGridCandidate(
    capabilityDocument,
    createComponentImportCandidate(),
  );
  assert.equal(capabilityImport.ok, true);
  if (!capabilityImport.ok) return;
  const capabilityComponent = capabilityTimetable.components[capabilityImport.componentId];
  assert.ok(capabilityComponent);
  assert.deepEqual(Object.keys(capabilityComponent?.variants ?? {}).sort(), [
    "multi",
    "offline",
    "offlineMemo",
    "online",
  ]);
  assert.notEqual(
    capabilityComponent?.variants.multi?.rootNodeId,
    capabilityComponent?.variants.online?.rootNodeId,
  );
  assert.notEqual(
    capabilityComponent?.variants.offlineMemo?.rootNodeId,
    capabilityComponent?.variants.offline?.rootNodeId,
  );
  assert.ok(
    Object.values(capabilityComponent?.variants ?? {}).every(
      (variant) => capabilityDocument.graph.rootNodeIds.includes(variant.rootNodeId),
    ),
  );
  assert.ok(
    Object.values(capabilityComponent?.variants.offlineMemo
      ? capabilityDocument.graph.nodes[capabilityComponent.variants.offlineMemo.rootNodeId]?.childIds.map(
          (nodeId) => capabilityDocument.graph.nodes[nodeId],
        ) ?? []
      : [],
    ).some(
      (node) =>
        node?.binding?.kind === "builtinField" &&
        node.binding.fieldId === "day.offline_memo",
    ),
  );
  Object.entries(existingCapabilityComponents).forEach(([componentId, componentBeforeImport]) => {
    assert.deepEqual(capabilityTimetable.components[componentId], componentBeforeImport);
  });
  assert.equal(
    JSON.stringify(
      Object.fromEntries(
        capabilityTimetable.dayIds.map((dayId) => [dayId, capabilityTimetable.days[dayId]?.componentId]),
      ),
    ),
    capabilityDayAssignments,
  );
  assert.ok(capabilityImport.warnings.some((warning) => /synthesized.*multi/i.test(warning)));
  assert.ok(capabilityImport.warnings.some((warning) => /synthesized.*offline memo/i.test(warning)));

  for (const unsafeSource of [
    "https://www.figma.com/api/temporary-export.png",
    "https://temporary.figma.com/export.png",
  ]) {
    const rejectedDocument = createSampleStudioDocument();
    const rejectedBefore = JSON.stringify(rejectedDocument);
    const remoteAssetCandidate = createComponentImportCandidate();
    remoteAssetCandidate.component.assets[0]!.src = unsafeSource;
    const rejected = applyStudioFigmaGridCandidate(rejectedDocument, remoteAssetCandidate);
    assert.deepEqual(rejected, { ok: false, reason: "Candidate asset source must be a supported data URL" });
    assert.equal(JSON.stringify(rejectedDocument), rejectedBefore);
  }

  const malformedDocument = createSampleStudioDocument();
  const malformedBefore = JSON.stringify(malformedDocument);
  const malformedCandidate = createComponentImportCandidate();
  malformedCandidate.component.nodes["figma-entry"]!.childIds.push("figma-root");
  const malformed = applyStudioFigmaGridCandidate(malformedDocument, malformedCandidate);
  assert.equal(malformed.ok, false);
  assert.equal(JSON.stringify(malformedDocument), malformedBefore);

  const orphanDocument = createSampleStudioDocument();
  const orphanBefore = JSON.stringify(orphanDocument);
  const orphanCandidate = createComponentImportCandidate();
  delete orphanCandidate.component.nodes["figma-title"];
  const orphan = applyStudioFigmaGridCandidate(orphanDocument, orphanCandidate);
  assert.equal(orphan.ok, false);
  assert.equal(JSON.stringify(orphanDocument), orphanBefore);

  const multiParentDocument = createSampleStudioDocument();
  const multiParentBefore = JSON.stringify(multiParentDocument);
  const multiParentCandidate = createComponentImportCandidate();
  multiParentCandidate.component.nodes["figma-root"]!.childIds.push("figma-title");
  const multiParent = applyStudioFigmaGridCandidate(multiParentDocument, multiParentCandidate);
  assert.equal(multiParent.ok, false);
  assert.equal(JSON.stringify(multiParentDocument), multiParentBefore);

  const unsafeBindingDocument = createSampleStudioDocument();
  const unsafeBindingBefore = JSON.stringify(unsafeBindingDocument);
  const unsafeBindingCandidate = createComponentImportCandidate();
  unsafeBindingCandidate.component.nodes["figma-title"]!.binding = {
    kind: "staticText",
    value: "https://www.figma.com/design/private-grid?node-id=1412-5814",
  };
  const unsafeBinding = applyStudioFigmaGridCandidate(unsafeBindingDocument, unsafeBindingCandidate);
  assert.equal(unsafeBinding.ok, false);
  assert.equal(JSON.stringify(unsafeBindingDocument), unsafeBindingBefore);

  const nonDataAssetDocument = createSampleStudioDocument();
  const nonDataAssetBefore = JSON.stringify(nonDataAssetDocument);
  const nonDataAssetCandidate = createComponentImportCandidate();
  nonDataAssetCandidate.component.assets[0]!.src = "data:text/html;base64,PGh0bWw+";
  const nonDataAsset = applyStudioFigmaGridCandidate(nonDataAssetDocument, nonDataAssetCandidate);
  assert.equal(nonDataAsset.ok, false);
  assert.equal(JSON.stringify(nonDataAssetDocument), nonDataAssetBefore);
};

void runReviewServiceChecks()
  .then(runRouteContractChecks)
  .then(runConverterChecks)
  .then(runComponentImportChecks)
  .then(() => console.log("Figma import contract checks passed"))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
