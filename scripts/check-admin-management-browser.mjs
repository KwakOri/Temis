import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.ADMIN_MANAGEMENT_TEST_URL ?? "http://127.0.0.1:3000";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Use a local preview.",
);
const output = "output/playwright/admin-management";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const requests = [];
const studioTemplates = ["timetable", "thumbnail"].map(
  (templateKind, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index + 1}`,
    name: `${templateKind} fixture`,
    description: "",
    templateKind,
    status: "draft",
    createdAt: "2026-10-05T00:00:00Z",
    updatedAt: "2026-10-05T00:00:00Z",
  }),
);
const teams = ["legacy", "studio", "mixed", "unconnected"].map(
  (editorUsage) => ({
    id: editorUsage,
    name: `${editorUsage} fixture team`,
    editorUsage,
    description: "",
    is_active: true,
    members: [],
    memberCount: 0,
    created_at: "2026-10-05T00:00:00Z",
  }),
);
const statuses = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];
let rejectRename = false;
const legacyThumbnail = {
  id: "legacy-thumbnail",
  name: "Legacy thumbnail fixture",
  description: "",
  is_public: false,
  created_at: "2026-10-05T00:00:00Z",
};

// Intercept every application API, including mutations; no database is touched.
await page.route("**/api/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  requests.push({
    path: url.pathname,
    method: request.method(),
    params: Object.fromEntries(url.searchParams),
  });
  if (url.pathname === "/api/auth/verify")
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
  if (url.pathname === "/api/admin/teams") {
    const scope = url.searchParams.get("scope") ?? "all";
    return route.fulfill({
      json: {
        success: true,
        teams: teams.filter(
          (team) =>
            scope === "all" ||
            [scope, "mixed", "unconnected"].includes(team.editorUsage),
        ),
      },
    });
  }
  if (
    ["/api/admin/custom-orders", "/api/admin/custom-orders/thumbnail"].includes(
      url.pathname,
    )
  ) {
    const thumbnail = url.pathname.endsWith("thumbnail");
    const status = url.searchParams.get("status");
    const filtered = Array.from({ length: 25 }, (_, index) => ({
      id: `order-${index}`,
      status: statuses[index % statuses.length],
      users: { name: `Customer ${index}`, email: "customer@example.invalid" },
      order_requirements: "Timetable fixture",
      purpose: "Thumbnail fixture",
      requirements: "Fixture",
      created_at: "2026-10-05T00:00:00Z",
      deadline: null,
      files: [],
      template_grants: [],
    })).filter(
      (order) =>
        status === "all" ||
        (status === "default"
          ? !["completed", "cancelled"].includes(order.status)
          : order.status === status),
    );
    const currentPage = Number(url.searchParams.get("page"));
    const limit = Number(url.searchParams.get("limit"));
    return route.fulfill({
      json: {
        orders: filtered.slice((currentPage - 1) * limit, currentPage * limit),
        pagination: {
          page: currentPage,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
        thumbnail,
      },
    });
  }
  if (url.pathname === "/api/admin/template-studio/templates") {
    return route.fulfill({
      json: {
        templates: studioTemplates.filter(
          (template) => template.templateKind === url.searchParams.get("kind"),
        ),
      },
    });
  }
  if (
    url.pathname.startsWith("/api/admin/template-studio/templates/") &&
    request.method() === "PATCH"
  ) {
    if (rejectRename)
      return route.fulfill({
        status: 500,
        json: { error: "이름 저장 테스트 오류" },
      });
    const template = studioTemplates.find(
      (item) => item.id === url.pathname.split("/").at(-1),
    );
    template.name = request.postDataJSON().name;
    return route.fulfill({ json: { success: true, template } });
  }
  if (url.pathname === "/api/admin/templates")
    return route.fulfill({
      json: {
        templates: [
          {
            id: "catalog-fixture",
            name: "Catalog fixture",
            description: "",
            is_public: true,
            template_engine: "studio",
            template_kind: "timetable",
            status: "draft",
            shop_templates: [],
            template_plans: [],
            created_at: "2026-10-05T00:00:00Z",
          },
        ],
        pagination: {
          total: 1,
          publicCount: 1,
          privateCount: 0,
          limit: 20,
          offset: 0,
        },
      },
    });
  if (
    url.pathname === "/api/admin/templates/catalog-fixture" &&
    request.method() === "PATCH"
  ) {
    assert.deepEqual(request.postDataJSON(), { name: "Catalog renamed" });
    return route.fulfill({
      json: {
        success: true,
        template: { id: "catalog-fixture", name: "Catalog renamed" },
      },
    });
  }
  if (url.pathname === "/api/admin/legacy-template-assets")
    return route.fulfill({ json: { sets: [] } });
  if (url.pathname === "/api/admin/team-templates")
    return route.fulfill({
      json: { teamTemplates: [], pagination: { total: 0 } },
    });
  if (url.pathname === "/api/admin/thumbnails")
    return route.fulfill({
      json: {
        thumbnails: [legacyThumbnail],
        pagination: { total: 1, limit: 20, offset: 0 },
      },
    });
  if (
    url.pathname === "/api/admin/thumbnails/legacy-thumbnail" &&
    request.method() === "PATCH"
  ) {
    assert.deepEqual(request.postDataJSON(), {
      name: "Legacy thumbnail renamed",
    });
    legacyThumbnail.name = request.postDataJSON().name;
    return route.fulfill({
      json: { success: true, thumbnail: legacyThumbnail },
    });
  }
  return route.fulfill({
    json: { needsMigration: 0, options: [], artists: [] },
  });
});

try {
  await page.goto(`${base}/admin/custom-orders`);
  await page.getByText("Thumbnail fixture · Fixture").first().waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: "썸네일 주문 제작" })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "제작 대기", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await page.getByText("완료", { exact: true }).count(), 1); // filter only
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.getByText("2 / 2", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "시간표 주문 제작" }).click();
  await page
    .getByRole("cell", { name: "Timetable fixture..." })
    .first()
    .waitFor();
  assert.equal(await page.getByText("1 / 2", { exact: true }).count(), 1);
  await page.getByRole("button", { name: "전체", exact: true }).click();
  await page.getByText("1 / 3", { exact: true }).waitFor();
  await page.getByLabel("정렬 기준", { exact: true }).selectOption("deadline");
  await page.getByLabel("정렬 순서", { exact: true }).selectOption("asc");
  await page.getByRole("tab", { name: "썸네일 주문 제작" }).click();
  await page.getByText("2 / 2", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("정렬 기준", { exact: true }).inputValue(),
    "created_at",
  );
  await page.screenshot({
    path: `${output}/orders-desktop.png`,
    fullPage: true, animations: "disabled",
  });
  await page.getByRole("tab", { name: "썸네일 주문 제작" }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "시간표 주문 제작" })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    await page.getByLabel("정렬 기준", { exact: true }).inputValue(),
    "deadline",
  );
  assert.ok(
    requests.some(
      (request) =>
        request.path === "/api/admin/custom-orders" &&
        request.params.sortOrder === "asc",
    ),
  );

  await page.goto(`${base}/admin/legacy?section=teams`);
  await page.getByText("legacy fixture team", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("studio fixture team", { exact: true }).count(),
    0,
  );
  await page.getByText("mixed fixture team", { exact: true }).waitFor();
  await page.getByText("unconnected fixture team", { exact: true }).waitFor();
  await page.getByLabel("연결 용도").selectOption("mixed");
  assert.equal(
    await page.getByText("legacy fixture team", { exact: true }).count(),
    0,
  );
  await page.getByRole("tab", { name: "팀 템플릿", exact: true }).click();
  await page
    .getByRole("heading", { name: "팀 템플릿 관리", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "레거시 에셋", exact: true }).click();
  await page
    .getByRole("heading", { name: "레거시 에셋", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "썸네일 관리", exact: true }).click();
  await page
    .getByRole("heading", { name: "썸네일 관리", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Legacy thumbnail fixture 이름 수정" })
    .click();
  await page
    .getByRole("textbox", { name: "템플릿 이름" })
    .fill("Legacy thumbnail renamed");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Legacy thumbnail renamed 이름 수정" })
    .waitFor();
  await page.goto(`${base}/admin/studio-teams`);
  await page.getByText("studio fixture team", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("legacy fixture team", { exact: true }).count(),
    0,
  );
  await page.getByText("mixed fixture team", { exact: true }).waitFor();
  await page.screenshot({
    path: `${output}/teams-desktop.png`,
    fullPage: true, animations: "disabled",
  });

  for (const kind of ["timetable", "thumbnail"]) {
    await page.goto(
      `${base}/admin/${kind === "thumbnail" ? "thumbnail-studio" : "template-studio"}`,
    );
    await page
      .getByRole("button", { name: `${kind} fixture 이름 수정` })
      .click();
    const input = page.getByRole("textbox", { name: "템플릿 이름" });
    await page.waitForFunction((expected) => document.getElementById("template-studio-template-name")?.value === expected, `${kind} fixture`);
    assert.equal(await input.inputValue(), `${kind} fixture`);
    await input.fill("  ");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "템플릿 이름을 입력" })
      .waitFor();
    await input.fill(`${kind} renamed`);
    rejectRename = true;
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "이름 저장 테스트 오류" })
      .waitFor();
    assert.equal(await input.inputValue(), `${kind} renamed`);
    rejectRename = false;
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: `${kind} renamed 이름 수정` })
      .waitFor();
  }
  await page.goto(`${base}/admin/templates`);
  await page.getByRole("button", { name: "Catalog fixture 이름 수정" }).click();
  await page
    .getByRole("textbox", { name: "템플릿 이름" })
    .fill("Catalog renamed");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/admin/custom-orders`);
  await page.getByRole("tab", { name: "시간표 주문 제작" }).click();
  await page
    .getByRole("button", { name: "상세보기", exact: true })
    .first()
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.screenshot({
    path: `${output}/orders-mobile.png`,
    fullPage: true, animations: "disabled",
  });
  await page.goto(`${base}/admin/template-studio`);
  await page
    .getByRole("button", { name: "timetable renamed 이름 수정" })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({
    path: `${output}/rename-mobile.png`,
    fullPage: true, animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto(`${base}/admin/teams`);
  await page.getByRole("tab", { name: "레거시 팀 관리" }).waitFor();
  await page.getByText("legacy fixture team", { exact: true }).waitFor();
  await page.screenshot({
    path: `${output}/legacy-mobile.png`,
    fullPage: true, animations: "disabled",
  });
  assert.deepEqual(errors, []);
  console.log(
    "Admin browser checks passed: orders, preserved filters, legacy navigation, mixed teams, rename validation/retry, desktop and mobile.",
  );
} catch (error) {
  await page
    .screenshot({ path: `${output}/failure.png`, fullPage: true, animations: "disabled" })
    .catch(() => {});
  console.error("Browser errors:", errors);
  throw error;
} finally {
  await browser.close();
}
