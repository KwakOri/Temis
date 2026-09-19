import assert from "node:assert/strict";
import { requestAiReviews } from "../src/services/server/figmaGridReviewService";

const originalFetch = globalThis.fetch;
let requestBody: Record<string, unknown> | undefined;
const testNodes = [
  {
    id: "node-1",
    name: "MON",
    type: "TEXT",
    characters: "MON",
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "node-2",
    name: "Card background",
    type: "FRAME",
    styleFlags: { hasSolidFill: false, hasImageFill: false, hasChildren: true },
  },
];
let responseReviews = [
  {
    sourceNodeId: "node-1",
    suggestedRole: "day_label",
    suggestedStudioType: "text",
    confidence: 0.98,
    reason: "The text matches a weekday label.",
  },
  {
    sourceNodeId: "node-2",
    suggestedRole: "decoration",
    suggestedStudioType: "group",
    confidence: 0.8,
    reason: "The frame is a decorative group.",
  },
];

globalThis.fetch = async (_input, init) => {
  requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              reviews: responseReviews,
            }),
          },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};

const main = async () => {
  try {
    await requestAiReviews(
      {
        nodes: testNodes,
        evidenceBySourceNodeId: {},
      },
      "test-token",
      "gpt-5.6-luna",
    );

    assert.ok(requestBody, "The OpenAI request body should be captured.");
    assert.equal(requestBody.temperature, undefined, "Luna requests must use the model default temperature.");
    const responseFormat = requestBody.response_format as {
      type?: unknown;
      json_schema?: {
        name?: unknown;
        strict?: unknown;
        schema?: Record<string, unknown>;
      };
    };
    assert.equal(responseFormat.type, "json_schema");
    assert.equal(responseFormat.json_schema?.name, "figma_grid_review_v1");
    assert.equal(responseFormat.json_schema?.strict, true);

    const schema = responseFormat.json_schema?.schema;
    assert.ok(schema, "The Structured Outputs schema should be present.");
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.required, ["reviews"]);

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const reviews = properties.reviews;
    assert.equal(reviews.type, "array");
    assert.equal(reviews.minItems, 2);
    assert.equal(reviews.maxItems, 2);

    const reviewItem = reviews.items as Record<string, unknown>;
    const variants = reviewItem.anyOf as Array<Record<string, unknown>>;
    assert.equal(variants.length, 2);
    for (const variant of variants) {
      assert.equal(variant.type, "object");
      assert.equal(variant.additionalProperties, false);
      assert.deepEqual(variant.required, [
        "sourceNodeId",
        "suggestedRole",
        "suggestedStudioType",
        "confidence",
        "reason",
      ]);
      const reviewProperties = variant.properties as Record<string, Record<string, unknown>>;
      assert.deepEqual(reviewProperties.confidence, { type: "number", minimum: 0, maximum: 1 });
      assert.deepEqual(reviewProperties.reason, { type: "string", maxLength: 500 });
    }
    const textProperties = variants[0]?.properties as Record<string, Record<string, unknown>>;
    assert.deepEqual(textProperties.sourceNodeId.enum, ["node-1"]);
    assert.deepEqual(textProperties.suggestedRole.enum, [
      "main_title",
      "sub_title",
      "time",
      "day_label",
      "date",
      "status_label",
      "decoration",
      "unknown",
    ]);
    assert.deepEqual(textProperties.suggestedStudioType.enum, ["text", "flexibleText"]);

    const nonTextProperties = variants[1]?.properties as Record<string, Record<string, unknown>>;
    assert.deepEqual(nonTextProperties.sourceNodeId.enum, ["node-2"]);
    assert.deepEqual(nonTextProperties.suggestedRole.enum, ["decoration"]);
    assert.deepEqual(nonTextProperties.suggestedStudioType.enum, ["group"]);

    responseReviews = [responseReviews[0]!];
    await assert.rejects(
      requestAiReviews(
        { nodes: testNodes, evidenceBySourceNodeId: {} },
        "test-token",
        "gpt-5.6-luna",
      ),
      /Invalid review count/,
    );
    console.log("figma grid review request check passed");
  } finally {
    globalThis.fetch = originalFetch;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
