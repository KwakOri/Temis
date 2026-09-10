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

const runRouteContractChecks = async () => {
  const secretToken = "figma-secret-token";
  const privateFigmaUrl =
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Private-Grid?node-id=1412-5814";
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.FIGMA_ACCESS_TOKEN;

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
          figmaUrl: "https://example.test/private?token=" + secretToken,
        }),
      }),
    );
    const invalidUrlBody = await invalidUrlResponse.text();
    assert.equal(invalidUrlResponse.status, 400);
    assert.doesNotMatch(invalidUrlBody, new RegExp(secretToken));

    process.env.FIGMA_ACCESS_TOKEN = secretToken;
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/v1/files/")) {
        return responseJson({
          nodes: {
            "1412:5814": {
              document: {
                id: "1412:5814",
                name: "GRID",
                type: "FRAME",
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
      throw new Error("Unexpected mocked request");
    }) as typeof fetch;

    const discovered = await fetchFigmaGridCandidates({
      fileKey: "T2VDXkMPVFa6yEl9FnVvYo",
      nodeId: "1412:5814",
    });
    assert.equal(discovered.candidates.length, 1);
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

    const routeHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
      toCandidates: async ({ candidates }) =>
        candidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          label: candidate.label,
          frame: { left: 10, top: 20, width: 140, height: 180 },
          component: { nodes: {}, styles: {}, rootNodeId: "", assets: [] },
          reviews: [],
          warnings: candidate.warnings,
        })),
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
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN;
    else process.env.FIGMA_ACCESS_TOKEN = originalToken;
  }
};

void runRouteContractChecks()
  .then(() => console.log("Figma import contract checks passed"))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
