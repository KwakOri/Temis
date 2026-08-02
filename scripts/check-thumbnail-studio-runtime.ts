import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const files = {
  userPage: "src/app/(root)/thumbnail/[templateId]/page.tsx",
  userClient:
    "src/app/(root)/thumbnail/_components/thumbnail-runtime-client.tsx",
  shell: "src/app/(root)/thumbnail/_components/thumbnail-runtime-shell.tsx",
  form: "src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx",
  adminPage:
    "src/app/(root)/admin/thumbnail-studio/[templateId]/preview/page.tsx",
  adminClient:
    "src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-preview-client.tsx",
  exportRoot: "src/components/studio/runtime/studio-export-root.tsx",
  exporter: "src/utils/template-studio/png-export.ts",
};

for (const [name, path] of Object.entries(files)) {
  assert.ok(existsSync(path), `${name} is missing: ${path}`);
}

const source = (path: string) => readFileSync(path, "utf8");
const shell = source(files.shell);
const form = source(files.form);
const exporter = source(files.exporter);
const exportRoot = source(files.exportRoot);
const route = source("src/app/api/user/templates/[id]/runtime/route.ts");

assert.match(shell, /StudioExportRoot/);
assert.match(shell, /fontsReady/);
assert.match(shell, /imagesReady/);
assert.match(shell, /layoutReady/);
assert.match(shell, /disabled={!isReady/);
assert.match(form, /getThumbnailStudioInputGroups/);
assert.match(form, /setStudioRuntimeInputValue/);
assert.match(form, /putStudioRuntimeImage/);
assert.match(form, /StudioRuntimeImageCropModal/);
assert.match(exportRoot, /StudioRenderer/);
assert.match(exporter, /modern-screenshot/);
assert.doesNotMatch(exporter, /html-to-image/);
assert.match(route, /searchParams\.get\("kind"\)/);
assert.match(route, /Template kind mismatch/);

console.log("Thumbnail Studio runtime contract checks passed.");
