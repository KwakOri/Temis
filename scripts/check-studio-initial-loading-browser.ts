import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";
import {
  createStudioTeamDocument,
  createStudioTeamPreview,
} from "../src/utils/template-studio/team-timetable";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";

const base = process.env.STUDIO_LOADING_TEST_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = "output/playwright/studio-initial-loading";
mkdirSync(output, { recursive: true });
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const scenario of [
      "thumbnail",
      "timetable",
      "team",
      "unconnected-team",
      "empty",
      "document-error",
      "team-error",
    ] as const) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const isTeam = ["team", "unconnected-team", "team-error"].includes(
        scenario,
      );
      const document = isTeam
        ? createStudioTeamDocument(3)
        : scenario === "thumbnail"
          ? createThumbnailStudioDocument()
          : createStudioTimetableGraphDocument();
      const runtimeValues = createStudioInitialRuntimeValues(document);
      if (isTeam) {
        runtimeValues.team = createStudioTeamPreview(document);
        for (const member of Object.values(runtimeValues.team.members))
          member.name = "Lucent stale member";
      } else {
        const timetable = document.domains?.timetable;
        const parentId = timetable
          ? timetable.components[timetable.entryComponentId].variants.online
              .rootNodeId
          : null;
        document.graph.nodes["loaded-marker"] = {
          id: "loaded-marker",
          type: "text",
          label: "Loaded fixture",
          parentId,
          childIds: [],
          styleId: "loaded-marker-style",
          binding: { kind: "staticText", value: "Loaded fixture" },
        };
        document.styles["loaded-marker-style"] = {
          left: 20,
          top: 20,
          width: 350,
          height: 50,
          fontSize: 32,
          color: "#111111",
        };
        if (parentId)
          document.graph.nodes[parentId].childIds.push("loaded-marker");
        else document.graph.rootNodeIds.push("loaded-marker");
      }
      const id = "00000000-0000-4000-8000-000000000071";
      const teamId = "00000000-0000-4000-8000-000000000072";
      const documentRequested = gate(),
        documentResponse = gate();
      const connectionRequested = gate(),
        connectionResponse = gate();
      const weekRequested = gate(),
        weekResponse = gate();
      let failDocument = scenario === "document-error";
      let failWeek = scenario === "team-error";
      let mutations = 0;
      await context.addInitScript(() => {
        (window as Window & { staleFrames?: string[] }).staleFrames = [];
        new MutationObserver(() => {
          const canvas = window.document.querySelector(
            "[data-studio-preview-canvas-root]",
          );
          if (canvas?.textContent?.includes("Lucent stale member")) {
            (window as Window & { staleFrames?: string[] }).staleFrames!.push(
              canvas.textContent,
            );
          }
        }).observe(window.document, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
      await context.route("**/api/**", async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (route.request().method() !== "GET") mutations++;
        if (pathname === "/api/auth/verify")
          return route.fulfill({
            json: {
              user: {
                id: "7",
                name: "Fixture admin",
                email: "fixture@example.invalid",
                role: "admin",
                isAdmin: true,
              },
            },
          });
        if (pathname.endsWith("/team-connection/week")) {
          weekRequested.release();
          await weekResponse.promise;
          if (failWeek)
            return route.fulfill({
              status: 503,
              json: { error: "fixture week unavailable" },
            });
          return route.fulfill({
            json: {
              team: { id: teamId, name: "Current team" },
              weekStartDate: "2026-10-05",
              members: [1, 2, 3].map((index) => ({
                userId: index + 6,
                name: `Current member ${index}`,
              })),
              schedules: [],
            },
          });
        }
        if (pathname.endsWith("/team-connection")) {
          connectionRequested.release();
          await connectionResponse.promise;
          return route.fulfill({
            json: {
              connection:
                scenario === "unconnected-team"
                  ? null
                  : {
                      templateId: id,
                      teamId,
                      memberBindings: {
                        "member-a": 7,
                        "member-b": 8,
                        "member-c": 9,
                      },
                    },
            },
          });
        }
        if (pathname === `/api/admin/template-studio/templates/${id}`) {
          documentRequested.release();
          await documentResponse.promise;
          if (failDocument)
            return route.fulfill({
              status: 503,
              json: { error: "fixture document unavailable" },
            });
          return route.fulfill({
            json: {
              success: true,
              template: {
                id,
                name: "Loading fixture",
                templateKind:
                  scenario === "thumbnail" ? "thumbnail" : "timetable",
                status: "draft",
              },
              draft: scenario === "empty" ? null : { document, runtimeValues },
              document: null,
              assets: [],
              latestRevisionNo: 0,
            },
          });
        }
        return route.fulfill({ status: 404, json: {} });
      });
      const route = isTeam
        ? "team-timetable-studio"
        : scenario === "thumbnail"
          ? "thumbnail-studio"
          : "template-studio";
      await page.goto(`${base}/admin/${route}/${id}/edit`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await documentRequested.promise;
      const loading = page.locator("[data-studio-initial-loading]");
      await loading.getByRole("status").waitFor();
      const assertHidden = async () => {
        assert.equal(
          await page.locator("[data-studio-preview-canvas-root]").count(),
          0,
        );
        assert.equal(
          await page
            .getByRole("button", { name: "Cards", exact: true })
            .count(),
          0,
        );
        assert.equal(await page.locator("[data-node-id]").count(), 0);
      };
      await assertHidden();
      await page.keyboard.press("Meta+s");
      assert.equal(
        mutations,
        0,
        "Initial keyboard shortcuts must not save the sample document",
      );
      await page.screenshot({
        path: `${output}/${scenario}-document-loading.png`,
      });
      documentResponse.release();
      if (isTeam) {
        await connectionRequested.promise;
        await assertHidden();
        await loading.getByRole("status").waitFor();
        connectionResponse.release();
        if (scenario !== "unconnected-team") {
          await weekRequested.promise;
          await assertHidden();
          await loading.getByRole("status").waitFor();
          await page.screenshot({
            path: `${output}/${scenario}-team-loading.png`,
          });
          weekResponse.release();
        }
      }
      if (scenario === "document-error" || scenario === "team-error") {
        await loading.getByRole("alert").waitFor({ timeout: 60000 });
        await assertHidden();
        failDocument = false;
        failWeek = false;
        await page
          .getByRole("button", { name: "다시 불러오기", exact: true })
          .click();
      }
      await page
        .locator("[data-studio-preview-canvas-root]")
        .first()
        .waitFor({ timeout: 60000 });
      assert.equal(await loading.count(), 0);
      if (isTeam && scenario !== "unconnected-team") {
        assert.ok(
          (
            await page
              .locator("[data-studio-preview-canvas-root]")
              .textContent()
          )?.includes("Current member 1"),
        );
        assert.deepEqual(
          await page.evaluate(
            () => (window as Window & { staleFrames?: string[] }).staleFrames,
          ),
          [],
        );
      }
      if (!isTeam && scenario !== "empty")
        assert.equal(
          await page.locator('[data-node-id="loaded-marker"]').count(),
          1,
        );
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${scenario}: initial editor hidden until data applied; errors recover without showing samples`,
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
