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
const previewUrl =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#e0edff"/><text x="80" y="95" fill="#4d6480">Preview fixture</text></svg>',
  );
const coverUrl =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#ffe0bd"/><text x="80" y="95" fill="#76532f">Cover fixture</text></svg>',
  );
const imageFile = {
  name: "cover.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=",
    "base64",
  ),
};
const studioTemplates = ["timetable", "thumbnail"].map(
  (templateKind, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index + 1}`,
    name: `${templateKind} fixture`,
    description: "",
    templateKind,
    templateMode: templateKind === "timetable" ? "personal" : undefined,
    status: "draft",
    isPublic: false,
    thumbnailUrl: null,
    studioPreviewUrl: previewUrl,
    createdAt: "2026-10-05T00:00:00Z",
    updatedAt: "2026-10-05T00:00:00Z",
  }),
);
studioTemplates.push({
  ...studioTemplates[0],
  id: "00000000-0000-4000-8000-000000000003",
  name: "team timetable fixture",
  templateMode: "team",
});
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
let rejectClassification = false;
let rejectCover = false;
let catalogPublic = true;
let emptyOrders = false;
let studioConnectionsAvailable = true;
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
        studioConnectionsAvailable,
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
    if (emptyOrders) filtered.length = 0;
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
  const salesTypeMatch =
    /^\/api\/admin\/template-hub\/templates\/([^/]+)\/sales-type$/.exec(
      url.pathname,
    );
  if (salesTypeMatch && request.method() === "PATCH") {
    if (rejectClassification)
      return route.fulfill({
        status: 409,
        json: {
          code: "SALE_MUST_STOP_FIRST",
          message: "판매를 먼저 중지해 주세요.",
        },
      });
    const isPublic = request.postDataJSON().salesType === "general";
    const template = studioTemplates.find(
      (item) => item.id === salesTypeMatch[1],
    );
    if (template) template.isPublic = isPublic;
    else {
      assert.equal(salesTypeMatch[1], "catalog-fixture");
      catalogPublic = isPublic;
    }
    return route.fulfill({
      json: {
        item: {
          id: salesTypeMatch[1],
          salesType: isPublic ? "general" : "custom",
        },
      },
    });
  }
  const coverMatch = /^\/api\/admin\/templates\/([^/]+)\/catalog-cover$/.exec(
    url.pathname,
  );
  if (coverMatch) {
    if (rejectCover)
      return route.fulfill({
        status: 500,
        json: { error: "대표 이미지 저장 테스트 오류" },
      });
    const template = studioTemplates.find((item) => item.id === coverMatch[1]);
    assert.ok(template);
    if (request.method() === "POST") {
      assert.ok(
        request.headers()["content-type"].includes("multipart/form-data"),
      );
      assert.ok(
        request.postDataBuffer().toString().includes('filename="cover.png"'),
      );
      template.thumbnailUrl = coverUrl;
    } else {
      assert.equal(request.method(), "DELETE");
      template.thumbnailUrl = null;
    }
    return route.fulfill({
      json: {
        template: {
          id: template.id,
          thumbnail_url: template.thumbnailUrl || "",
        },
      },
    });
  }
  if (url.pathname === "/api/admin/template-studio/templates") {
    return route.fulfill({
      json: {
        templates: studioTemplates.filter(
          (template) =>
            template.templateKind === url.searchParams.get("kind") &&
            (!url.searchParams.get("mode") ||
              template.templateMode === url.searchParams.get("mode")),
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
            is_public: catalogPublic,
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
          publicCount: catalogPublic ? 1 : 0,
          privateCount: catalogPublic ? 0 : 1,
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
  assert.deepEqual(await page.getByRole("columnheader").allTextContents(), [
    "주문 정보",
    "고객 정보",
    "상태",
    "견적가격",
    "마감일",
    "생성일",
    "작업",
  ]);
  await page
    .getByRole("button", { name: "상세보기", exact: true })
    .first()
    .click();
  await page.getByText("썸네일 주문 상세", { exact: true }).waitFor();
  await page.getByRole("button", { name: "닫기", exact: true }).first().click();
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
  assert.deepEqual(await page.getByRole("columnheader").allTextContents(), [
    "주문 정보",
    "고객 정보",
    "상태",
    "견적가격",
    "마감일",
    "생성일",
    "작업",
  ]);
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
    fullPage: true,
    animations: "disabled",
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

  emptyOrders = true;
  await page.goto(`${base}/admin/custom-orders`);
  const emptyMessage = page.getByText("주문 내역이 없습니다.", { exact: true });
  await emptyMessage.waitFor();
  const thumbnailBounds = await emptyMessage.locator("..").boundingBox();
  await page.screenshot({
    path: `${output}/orders-empty-thumbnail.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("tab", { name: "시간표 주문 제작" }).click();
  await emptyMessage.waitFor();
  assert.deepEqual(
    await emptyMessage.locator("..").boundingBox(),
    thumbnailBounds,
  );
  await page.screenshot({
    path: `${output}/orders-empty-timetable.png`,
    fullPage: true,
    animations: "disabled",
  });
  emptyOrders = false;

  await page.goto(`${base}/admin/legacy?section=teams`);
  await page.getByText("legacy fixture team", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("studio fixture team", { exact: true }).count(),
    0,
  );
  await page.getByText("mixed fixture team", { exact: true }).waitFor();
  await page.getByText("unconnected fixture team", { exact: true }).waitFor();
  studioConnectionsAvailable = false;
  await page.reload();
  await page
    .getByRole("status")
    .filter({ hasText: "DB 업데이트가 필요합니다" })
    .waitFor();
  await page.getByText("legacy fixture team", { exact: true }).waitFor();
  studioConnectionsAvailable = true;
  await page.reload();
  await page.getByText("legacy fixture team", { exact: true }).waitFor();
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
    fullPage: true,
    animations: "disabled",
  });

  await page.goto(`${base}/admin/studio-templates`);
  const studioTabs = page.getByRole("tablist", { name: "템플릿 종류" });
  await studioTabs.getByRole("tab", { name: "시간표", exact: true }).waitFor();
  assert.equal(
    await studioTabs
      .getByRole("tab", { name: "시간표", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.getByText("timetable fixture", { exact: true }).first().waitFor();
  for (const [section, name] of [
    ["timetable", "timetable fixture"],
    ["team", "team timetable fixture"],
    ["thumbnail", "thumbnail fixture"],
  ]) {
    await page.goto(`${base}/admin/studio-templates?section=${section}`);
    const infoButton = page.getByRole("button", {
      name: `${name} 정보 수정`,
      exact: true,
    });
    await infoButton.click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("radio", { name: "개인 템플릿", exact: true })
      .waitFor();
    assert.equal(
      await dialog
        .getByRole("radio", { name: "개인 템플릿", exact: true })
        .isChecked(),
      true,
    );
    await dialog
      .getByRole("radio", { name: "일반 템플릿", exact: true })
      .check();
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      studioTemplates.find((item) => item.name === name).isPublic,
      false,
    );
    await infoButton.click();
    await dialog
      .getByRole("radio", { name: "일반 템플릿", exact: true })
      .check();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByText("일반 템플릿", { exact: true }).first().waitFor();
    assert.equal(
      await page.getByRole("button", { name: /템플릿으로 전환/ }).count(),
      0,
    );
    await infoButton.click();
    await dialog
      .getByRole("radio", { name: "개인 템플릿", exact: true })
      .check();
    rejectClassification = true;
    await dialog
      .getByRole("textbox", { name: "템플릿 이름" })
      .fill("Blocked name");
    const renameCount = requests.filter(
      (r) =>
        r.method === "PATCH" &&
        r.path.startsWith("/api/admin/template-studio/templates/"),
    ).length;
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await dialog
      .getByRole("alert")
      .filter({ hasText: "판매를 먼저 중지" })
      .waitFor();
    assert.equal(
      requests.filter(
        (r) =>
          r.method === "PATCH" &&
          r.path.startsWith("/api/admin/template-studio/templates/"),
      ).length,
      renameCount,
    );
    rejectClassification = false;
    await dialog.getByRole("textbox", { name: "템플릿 이름" }).fill(name);
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByText("개인 템플릿", { exact: true }).first().waitFor();
    assert.equal(
      await page.getByText("자동 미리보기 생성됨", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .getByText(studioTemplates.find((item) => item.name === name).id, {
          exact: true,
        })
        .count(),
      0,
    );
    await infoButton.click();
    await dialog
      .getByLabel("대표 이미지 파일")
      .setInputFiles({
        name: "bad.gif",
        mimeType: "image/gif",
        buffer: Buffer.from("invalid"),
      });
    await dialog.getByRole("alert").filter({ hasText: "10MB 이하" }).waitFor();
    await dialog.getByLabel("대표 이미지 파일").setInputFiles(imageFile);
    assert.equal(
      await dialog
        .getByRole("img", { name: "대표 이미지 미리보기" })
        .getAttribute("src")
        .then((src) => src.startsWith("blob:")),
      true,
    );
    if (section === "thumbnail") await page.screenshot({ path: `${output}/info-modal-desktop.png`, animations: "disabled" });
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      studioTemplates.find((item) => item.name === name).thumbnailUrl,
      coverUrl,
    );
    await infoButton.click();
    await dialog
      .getByRole("button", { name: "대표 이미지 제거", exact: true })
      .click();
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    assert.equal(
      studioTemplates.find((item) => item.name === name).thumbnailUrl,
      coverUrl,
    );
    await infoButton.click();
    await dialog
      .getByRole("button", { name: "대표 이미지 제거", exact: true })
      .click();
    await dialog.getByRole("button", { name: "저장", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      studioTemplates.find((item) => item.name === name).thumbnailUrl,
      null,
    );
  }
  await page.goto(`${base}/admin/studio-templates`);
  await page.getByText("timetable fixture", { exact: true }).first().waitFor();

  assert.equal(
    await page.getByText("team timetable fixture", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "새 템플릿", exact: true })
      .getAttribute("href"),
    "/admin/template-studio/create",
  );
  await studioTabs.getByRole("tab", { name: "팀시간표", exact: true }).click();
  await page
    .getByText("team timetable fixture", { exact: true })
    .first()
    .waitFor();
  assert.equal(
    await page.getByText("timetable fixture", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "새 템플릿", exact: true })
      .getAttribute("href"),
    "/admin/team-timetable-studio/create",
  );
  await studioTabs.getByRole("tab", { name: "썸네일", exact: true }).click();
  await page.getByText("thumbnail fixture", { exact: true }).first().waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "새 템플릿", exact: true })
      .getAttribute("href"),
    "/admin/thumbnail-studio/create",
  );
  await page.goBack();
  await page
    .getByText("team timetable fixture", { exact: true })
    .first()
    .waitFor();
  await page.screenshot({
    path: `${output}/studio-templates-desktop.png`,
    animations: "disabled",
  });
  for (const label of ["Template Studio", "Team Studio", "Thumbnail Studio"]) {
    assert.equal(
      await page.getByRole("button", { name: label, exact: true }).count(),
      0,
    );
  }
  await page.goto(`${base}/admin/team-timetable-studio`);
  assert.equal(
    await studioTabs
      .getByRole("tab", { name: "팀시간표", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await page
    .getByText("team timetable fixture", { exact: true })
    .first()
    .waitFor();

  for (const kind of ["timetable", "thumbnail"]) {
    await page.goto(
      `${base}/admin/${kind === "thumbnail" ? "thumbnail-studio" : "template-studio"}`,
    );
    await page
      .getByRole("button", { name: `${kind} fixture 정보 수정` })
      .click();
    const input = page.getByRole("textbox", { name: "템플릿 이름" });
    await page.waitForFunction(
      (expected) =>
        document.getElementById("template-studio-template-name")?.value ===
        expected,
      `${kind} fixture`,
    );
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
      .getByRole("button", { name: `${kind} renamed 정보 수정` })
      .waitFor();
  }
  await page.goto(`${base}/admin/studio-templates?section=thumbnail`);
  await page
    .getByRole("button", { name: "thumbnail renamed 정보 수정", exact: true })
    .click();
  const infoDialog = page.getByRole("dialog");
  await infoDialog
    .getByRole("radio", { name: "일반 템플릿", exact: true })
    .check();
  await infoDialog
    .getByRole("textbox", { name: "템플릿 이름" })
    .fill("thumbnail partial");
  await infoDialog.getByLabel("대표 이미지 파일").setInputFiles(imageFile);
  rejectCover = true;
  await infoDialog.getByRole("button", { name: "저장", exact: true }).click();
  await infoDialog
    .getByRole("alert")
    .filter({ hasText: "일부 변경은 저장되었습니다" })
    .waitFor();
  assert.equal(
    await infoDialog.getByRole("textbox", { name: "템플릿 이름" }).inputValue(),
    "thumbnail partial",
  );
  assert.equal(studioTemplates[1].isPublic, true);
  await infoDialog
    .getByRole("radio", { name: "개인 템플릿", exact: true })
    .check();
  await infoDialog
    .getByRole("textbox", { name: "템플릿 이름" })
    .fill("thumbnail renamed");
  rejectCover = false;
  await infoDialog.getByRole("button", { name: "저장", exact: true }).click();
  await infoDialog.waitFor({ state: "hidden" });
  assert.equal(studioTemplates[1].isPublic, false);
  assert.equal(studioTemplates[1].name, "thumbnail renamed");
  assert.equal(studioTemplates[1].thumbnailUrl, coverUrl);
  await page.goto(`${base}/admin/templates`);
  await page.getByRole("tab", { name: "템플릿 관리", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: "템플릿 관리", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.ok(
    requests.some(
      (request) =>
        request.path === "/api/admin/templates" &&
        request.params.engine === "legacy",
    ),
  );
  await page
    .getByRole("button", {
      name: "Catalog fixture 개인 템플릿으로 전환",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /^비공개 템플릿/ }).click();
  await page
    .getByRole("button", {
      name: "Catalog fixture 일반 템플릿으로 전환",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /^공개 템플릿/ }).click();
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
    fullPage: true,
    animations: "disabled",
  });
  await page.goto(`${base}/admin/template-studio`);
  await studioTabs.getByRole("tab", { name: "썸네일", exact: true }).click();
  await page
    .getByRole("button", { name: "thumbnail renamed 정보 수정" })
    .first()
    .waitFor();
  await page.screenshot({
    path: `${output}/studio-templates-mobile.png`,
    animations: "disabled",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await studioTabs.getByRole("tab", { name: "시간표", exact: true }).click();
  await page
    .getByRole("button", { name: "timetable renamed 정보 수정" })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({
    path: `${output}/rename-mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto(`${base}/admin/teams`);
  await page.getByRole("tab", { name: "레거시 팀 관리" }).waitFor();
  await page.getByText("legacy fixture team", { exact: true }).waitFor();
  await page.screenshot({
    path: `${output}/legacy-mobile.png`,
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  console.log(
    "Admin browser checks passed: orders, preserved filters, legacy navigation, mixed teams, info modal, classification guards, cover upload/removal/cancel, partial-save retry, rename validation, desktop and mobile.",
  );
} catch (error) {
  await page
    .screenshot({
      path: `${output}/failure.png`,
      fullPage: true,
      animations: "disabled",
    })
    .catch(() => {});
  console.error("Browser errors:", errors);
  throw error;
} finally {
  await browser.close();
}
