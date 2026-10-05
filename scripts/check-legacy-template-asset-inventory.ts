import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLegacyAssetInventory } from "./lib/legacy-template-asset-inventory";

const fixture = mkdtempSync(path.join(os.tmpdir(), "temis-legacy-inventory-"));
const id = "00000000-0000-4000-8000-000000000001";
const directory = `src/app/(root)/time-table/${id}`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);
const write = (file: string, content: string | Buffer) => {
  const absolute = path.join(fixture, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
};

try {
  write(`${directory}/_img/main/frame.PNG`, png);
  write(`${directory}/_img/main/unused.png`, png);
  write("public/logo.png", png);
  write("src/app/(root)/_sample/_img/main/sample.png", png);
  write(
    `${directory}/_img/imgs.ts`,
    `
    import profileFrame from "./main/frame.PNG";
    // import ignored from "./main/commented.png";
    throw new Error("This source must never be executed by inventory");
    export const Imgs = ({
      first: { profileFrame, "profileBG": profileFrame },
      second: { profileFrame: profileFrame },
    } satisfies Record<string, unknown>);
  `,
  );
  write(
    `${directory}/_components/View.tsx`,
    `
    import { Imgs as Images } from "../_img/imgs";
    const unrelated = { first: { unused: "not an image" } };
    const cardName = "profileFrame";
    export const View = () => <>
      <img src={Images["first"].profileFrame.src} />
      <img src={Images.first["profileBG"].src} />
      <img src={Images["first"][cardName].src} />
      <p>{unrelated.first.unused}</p>
    </>;
  `,
  );
  const options = {
    catalog: [{ ownerKind: "timetable" as const, templateId: id }],
  };
  const inventory = createLegacyAssetInventory(fixture, options);
  assert.equal(inventory.summary.templates, 1);
  assert.equal(inventory.summary.slots, 3);
  assert.equal(inventory.summary.templateImageFiles, 2);
  assert.equal(inventory.summary.uniqueTemplateContents, 1);
  assert.equal(inventory.summary.unboundTemplateImages, 1);
  assert.equal(inventory.summary.projectImageFiles, 2);
  const template = inventory.templates[0];
  assert.equal(template.parentStatus, "linked");
  assert.equal(template.status, "needs_review");
  assert.deepEqual(Object.keys(template.bindings.first), [
    "profileFrame",
    "profileBG",
  ]);
  assert.equal(
    template.bindings.first.profileFrame,
    template.bindings.second.profileFrame,
  );
  assert.equal(
    template.bindings.first.profileBG,
    template.bindings.first.profileFrame,
  );
  assert.equal(
    template.assets.find((asset) => asset.originalFilename === "frame.PNG")
      ?.width,
    1,
  );
  assert.equal(
    template.assets.find((asset) => asset.originalFilename === "frame.PNG")
      ?.height,
    1,
  );
  assert.equal(template.dynamicReferences.length, 1);
  assert.ok(template.dynamicReferences[0].expression.includes("cardName"));
  assert.deepEqual(
    template.issues.map((issue) => issue.code),
    ["UNBOUND_IMAGE"],
  );
  assert.deepEqual(createLegacyAssetInventory(fixture, options), inventory);
  assert.equal(
    createLegacyAssetInventory(fixture).templates[0].parentStatus,
    "not_checked",
  );
  assert.equal(
    createLegacyAssetInventory(fixture, { catalog: [] }).templates[0].status,
    "blocked",
  );
  assert.equal(
    createLegacyAssetInventory(fixture, { ownerKind: "team_timetable" }).summary
      .templates,
    0,
  );

  write(
    `${directory}/_components/View.tsx`,
    `
    import { Imgs } from "../_img/imgs";
    export const View = () => <img src={Imgs.first.missing.src} />;
  `,
  );
  assert.ok(
    createLegacyAssetInventory(fixture, options).templates[0].issues.some(
      (issue) =>
        issue.code === "UNDECLARED_STATIC_SLOT" &&
        issue.detail === "first.missing",
    ),
  );

  // An archive must not hide an accidental missing file behind a static import.
  write(
    "scripts/data/legacy-template-removed-sources.json",
    JSON.stringify([template]),
  );
  rmSync(path.join(fixture, `${directory}/_img/main/frame.PNG`));
  write(
    `${directory}/_img/imgs.ts`,
    'import frame from "./main/frame.PNG"; export const Imgs = { first: { frame } };',
  );
  const missingOriginal = createLegacyAssetInventory(fixture, options)
    .templates[0];
  assert.ok(
    missingOriginal.issues.some((issue) => issue.code === "MISSING_IMAGE"),
  );
  assert.equal(
    missingOriginal.assets.find(
      (asset) => asset.originalFilename === "frame.PNG",
    )?.sourceRemoved,
    undefined,
  );
  write(`${directory}/_img/main/frame.PNG`, png);

  write(`${directory}/_img/main/broken.png`, "not an image");
  write(
    `${directory}/_img/imgs.ts`,
    `
    import missing from "./main/missing.png";
    export const Imgs = { first: { missing, ...unknown } };
  `,
  );
  const blocked = createLegacyAssetInventory(fixture, options).templates[0];
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.issues.some((issue) => issue.code === "MISSING_IMAGE"));
  assert.ok(blocked.issues.some((issue) => issue.code === "INVALID_IMAGE"));
  assert.ok(blocked.issues.some((issue) => issue.code === "UNSUPPORTED_SLOT"));
  console.log(
    "Legacy asset inventory checks passed: key preservation, aliases, shared files, deterministic IDs, dimensions, dynamic/static references, invalid files, and parent status.",
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
