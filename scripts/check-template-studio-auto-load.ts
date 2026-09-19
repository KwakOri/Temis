import assert from "node:assert/strict";

import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";
import * as persistence from "../src/hooks/studio/use-studio-template-persistence";

type AutoLoadResolver = (
  remoteTemplate:
    | {
        draft?: {
          document: ReturnType<typeof createSampleStudioDocument>;
          runtimeValues: ReturnType<typeof createInitialStudioRuntimeValues>;
        } | null;
        document?: {
          document: ReturnType<typeof createSampleStudioDocument>;
          runtimeValues: ReturnType<typeof createInitialStudioRuntimeValues>;
        } | null;
      }
    | null
    | undefined,
  hasRemoteTemplateLoadError: boolean,
) => unknown;

const resolveStudioAutoLoad = (
  persistence as unknown as { resolveStudioAutoLoad?: AutoLoadResolver }
).resolveStudioAutoLoad;

assert.equal(
  typeof resolveStudioAutoLoad,
  "function",
  "The auto-load decision must be exposed for regression checks.",
);

const resolve = resolveStudioAutoLoad as AutoLoadResolver;
const document = createSampleStudioDocument();
const runtimeValues = createInitialStudioRuntimeValues(document);

assert.deepEqual(
  resolve({ draft: null, document: null }, false),
  { kind: "empty" },
  "A newly created template without a draft or document is a valid empty state.",
);
assert.deepEqual(
  resolve(undefined, false),
  { kind: "not-found", message: "Database template not found" },
  "A missing template must remain a load failure.",
);
assert.deepEqual(
  resolve(undefined, true),
  { kind: "load-failed", message: "Database load failed" },
  "A failed template query must remain a load failure.",
);
assert.deepEqual(
  resolve(
    {
      draft: { document, runtimeValues },
      document: null,
    },
    false,
  ),
  {
    kind: "replace",
    document,
    runtimeValues,
    message: "Loaded database draft",
  },
  "A saved draft must replace the local editor document.",
);
assert.deepEqual(
  resolve(
    {
      draft: null,
      document: { document, runtimeValues },
    },
    false,
  ),
  {
    kind: "replace",
    document,
    runtimeValues,
    message: "Loaded published document",
  },
  "A published document must replace the local editor document.",
);

console.log("Template Studio auto-load checks passed.");
