import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import timetableFactory from "../src/utils/template-studio/timetable-graph-document.ts";
import inputValues from "../src/utils/template-studio/input-values.ts";
import capabilities from "../src/utils/template-studio/timetable-capabilities.ts";
import variants from "../src/utils/template-studio/component-variants.ts";
import entryGroups from "../src/utils/template-studio/entry-groups.ts";

// Run with node --import tsx; all APIs are fixtures and external requests are blocked.
const base = new URL(
  process.env.TIMETABLE_PRESERVATION_TEST_URL ?? "http://localhost:3000",
);
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const id = "00000000-0000-4000-8000-000000000019";
const ownerId = "timetable-preservation-fixture";
const imageInputId = "entry-image-regression";
const document = timetableFactory.createStudioTimetableGraphDocument();
const timetable = document.domains.timetable;
timetable.capabilities.multi.enabled = true;
capabilities.ensureStudioTimetableCapabilityStatus(timetable, "multi");
const component = timetable.components[timetable.entryComponentId];
const onlineGroup = entryGroups.getStudioVariantEntryGroups(
  document,
  component.variants.online,
)[0];
assert.ok(onlineGroup);
document.inputs[imageInputId] = {
  id: imageInputId,
  type: "image",
  scope: "entry",
  label: "Entry fixture image",
};
document.graph.nodes.fixtureEntryImage = {
  id: "fixtureEntryImage",
  type: "image",
  label: "Fixture entry image",
  parentId: onlineGroup.id,
  childIds: [],
  styleId: "fixtureEntryImage",
  binding: { kind: "inputImage", inputId: imageInputId },
};
document.styles.fixtureEntryImage = {
  left: 30,
  top: 30,
  width: 40,
  height: 40,
};
onlineGroup.childIds.push("fixtureEntryImage");
assert.equal(
  variants.cloneStudioComponentVariant(
    document,
    component.id,
    "online",
    "multi",
  ).ok,
  true,
);
const multiGroups = entryGroups.getStudioVariantEntryGroups(
  document,
  component.variants.multi,
);
assert.equal(multiGroups.length, 2);
for (const asset of Object.values(document.assets))
  asset.src = `${base.origin}/timetable-fixture.svg`;
let serverValues = inputValues.createStudioInitialRuntimeValues(document);
const writes = [];
const output = "output/playwright/timetable-runtime-preservation";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
let phase = "startup";
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1050 },
    serviceWorkers: "block",
  });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base.origin) return route.abort();
    if (url.pathname === "/timetable-fixture.svg")
      return route.fulfill({
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#e2e8f0"/></svg>',
        contentType: "image/svg+xml",
      });
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname === "/api/auth/verify")
      return route.fulfill({
        json: {
          user: {
            id: "19",
            name: "Fixture member",
            email: "fixture@example.invalid",
          },
        },
      });
    if (url.pathname === "/api/template-access")
      return route.fulfill({
        json: { hasAccess: true, isAdmin: false, reason: "template_access" },
      });
    if (url.pathname === `/api/user/templates/${id}/runtime`) {
      if (request.method() === "PUT") {
        const payload = request.postDataJSON();
        writes.push(structuredClone(payload.runtimeValues));
        serverValues = structuredClone(payload.runtimeValues);
        for (const inputs of Object.values(serverValues.entries))
          for (const entry of inputs) entry[imageInputId] = "";
        return route.fulfill({
          json: {
            runtimeValues: serverValues,
            baseRevisionNo: 1,
            updatedAt: "2026-10-06T00:00:00Z",
          },
        });
      }
      assert.equal(request.method(), "GET");
      return route.fulfill({
        json: {
          template: { id, name: "Timetable preservation fixture" },
          kind: "timetable",
          revisionNo: 1,
          document,
          runtimeValues: serverValues,
          baseRevisionNo: 1,
          hasSavedState: writes.length > 0,
          storageOwnerId: ownerId,
        },
      });
    }
    // No request is ever allowed to reach a real API.
    return route.fulfill({ status: 404, json: {} });
  });
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(0, 0, 16, 16);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page.goto(`${base.origin}/template-studio/${id}?lang=en`, {
    timeout: 120000,
  });
  const form = page.getByTestId("template-studio-runtime-form");
  await form.waitFor({ state: "visible", timeout: 120000 });
  const day = form.locator('[aria-labelledby="runtime-day-mon"]');
  const cards = () => day.locator("section");
  const imageField = (index) =>
    cards().nth(index).getByLabel("Entry fixture image", { exact: true });
  const previewDay = page.locator(
    '[data-testid="template-studio-preview-area"] [data-node-id="day-card:mon"]',
  );
  const upload = async (index, name) => {
    await cards()
      .nth(index)
      .locator('input[type="file"]')
      .setInputFiles({
        name: `${name}.png`,
        mimeType: "image/png",
        buffer: png,
      });
    await page.waitForFunction(
      ({ index }) => {
        const card = document
          .querySelector('[aria-labelledby="runtime-day-mon"]')
          .querySelectorAll("section")[index];
        const label = [...card.querySelectorAll("label")].find(
          (label) => label.textContent === "Entry fixture image",
        );
        return document.getElementById(label.htmlFor).value.startsWith("blob:");
      },
      { index },
    );
    return imageField(index).inputValue();
  };
  const title = (index) =>
    cards().nth(index).getByLabel("Main Title", { exact: true });
  const subTitle = (index) =>
    cards().nth(index).getByLabel("Sub Title", { exact: true });
  const time = (index) =>
    cards().nth(index).getByRole("button", { name: "Time", exact: true });
  const setTime = async (index, hour, minute) => {
    await time(index).click();
    await cards()
      .nth(index)
      .getByRole("listbox", { name: "Hour", exact: true })
      .getByRole("option", { name: hour, exact: true })
      .click();
    await time(index).click();
    await cards()
      .nth(index)
      .getByRole("listbox", { name: "Minute", exact: true })
      .getByRole("option", { name: minute, exact: true })
      .click();
  };
  const fetchBlob = (url) =>
    page.evaluate(async (url) => {
      try {
        const blob = await (await fetch(url)).blob();
        return { type: blob.type, size: blob.size };
      } catch {
        return null;
      }
    }, url);

  phase = "upload-delete-readd";
  await upload(0, "A");
  await day
    .getByRole("button", { name: "Add entry to Monday", exact: true })
    .click();
  const survivingUrl = await upload(1, "B");
  await title(1).fill("B surviving title");
  await subTitle(1).fill("B surviving subtitle");
  await setTime(1, "18", "35");
  await day
    .getByRole("button", { name: "Remove entry 1", exact: true })
    .click();
  assert.equal(await cards().count(), 1);
  assert.equal(await imageField(0).inputValue(), survivingUrl);
  await day
    .getByRole("button", { name: "Add entry to Monday", exact: true })
    .click();
  const addedUrl = await upload(1, "C");
  await title(1).fill("C new title");
  await subTitle(1).fill("C new subtitle");
  await setTime(1, "21", "10");
  assert.notEqual(addedUrl, survivingUrl);
  assert.equal(await imageField(0).inputValue(), survivingUrl);
  assert.ok(
    (await fetchBlob(survivingUrl))?.size > 0,
    "C upload must not revoke B's shifted image URL",
  );
  assert.equal((await fetchBlob(addedUrl))?.type, "image/png");
  assert.equal(
    await previewDay
      .locator(`[data-node-id="${component.variants.multi.rootNodeId}"]`)
      .count(),
    1,
  );
  for (const group of multiGroups)
    assert.equal(
      await previewDay.locator(`[data-node-id="${group.id}"]`).count(),
      1,
    );

  phase = "offline-online-preservation";
  const online = day.getByRole("switch", {
    name: "Monday Online",
    exact: true,
  });
  await online.click();
  assert.equal(await online.getAttribute("aria-checked"), "false");
  assert.equal(await cards().count(), 2, "Offline retains both input cards");
  assert.equal(
    await previewDay
      .locator(`[data-node-id="${component.variants.offline.rootNodeId}"]`)
      .count(),
    1,
    "Offline renders one card variant",
  );
  assert.equal(
    await previewDay
      .locator(`[data-node-id="${component.variants.multi.rootNodeId}"]`)
      .count(),
    0,
  );
  assert.equal(await title(0).inputValue(), "B surviving title");
  assert.equal(await title(1).inputValue(), "C new title");
  assert.equal(await imageField(0).inputValue(), survivingUrl);
  assert.equal(await imageField(1).inputValue(), addedUrl);
  await online.click();
  assert.equal(await online.getAttribute("aria-checked"), "true");
  assert.equal(await title(0).inputValue(), "B surviving title");
  assert.equal(await title(1).inputValue(), "C new title");
  assert.equal(await subTitle(0).inputValue(), "B surviving subtitle");
  assert.equal(await subTitle(1).inputValue(), "C new subtitle");
  assert.equal((await time(0).innerText()).trim(), "18:35");
  assert.equal((await time(1).innerText()).trim(), "21:10");
  assert.equal(await imageField(0).inputValue(), survivingUrl);
  assert.equal(await imageField(1).inputValue(), addedUrl);
  for (const group of multiGroups)
    assert.equal(
      await previewDay.locator(`[data-node-id="${group.id}"]`).count(),
      1,
    );
  assert.ok((await fetchBlob(survivingUrl))?.size > 0);
  await page.screenshot({ path: `${output}/preserved-online.png` });

  phase = "saved-state-and-indexeddb-rehydration";
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/user/templates/${id}/runtime`) &&
        response.request().method() === "GET",
    ),
    form.getByRole("button", { name: "Save content", exact: true }).click(),
  ]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].timetable.entriesByDay.mon.length, 2);
  assert.deepEqual(
    writes[0].timetable.entriesByDay.mon.map((entry) => [
      entry.mainTitle,
      entry.time,
    ]),
    [
      ["B surviving title", "18:35"],
      ["C new title", "21:10"],
    ],
  );
  await page.reload();
  await form.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const labels = [
      ...document
        .querySelector('[aria-labelledby="runtime-day-mon"]')
        .querySelectorAll("label"),
    ].filter((label) => label.textContent === "Entry fixture image");
    return (
      labels.length === 2 &&
      labels.every((label) =>
        document.getElementById(label.htmlFor).value.startsWith("blob:"),
      )
    );
  });
  assert.equal(await title(0).inputValue(), "B surviving title");
  assert.equal(await title(1).inputValue(), "C new title");
  assert.ok((await fetchBlob(await imageField(0).inputValue()))?.size > 0);
  assert.ok((await fetchBlob(await imageField(1).inputValue()))?.size > 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS timetable browser: A/B upload → A delete → C upload preserves B's Blob; Offline/Online retains two titles, subtitles, times and images, renders Offline once and restores Multi; saved state and stable IndexedDB images survive reload. All APIs mocked, external requests blocked.",
  );
  await context.close();
} catch (error) {
  console.error(`Timetable preservation phase: ${phase}`);
  await page?.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  if (page)
    console.error((await page.locator("body").innerText()).slice(0, 3000));
  throw error;
} finally {
  await browser.close();
}
