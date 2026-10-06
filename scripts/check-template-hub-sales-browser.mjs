import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.ADMIN_MANAGEMENT_TEST_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = "output/playwright/template-hub-sales";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const items = Array.from({ length: 25 }, (_, index) => ({
  id: `studio-${index}`,
  name: `Studio product ${index}`,
  description: "Sale fixture",
  templateEngine: "studio",
  templateKind: index < 20 ? "thumbnail" : "timetable",
  templateCategory:
    index < 20 ? "thumbnail" : index < 23 ? "timetable" : "team-timetable",
  publicationStatus: "published",
  salesType: "general",
  shopProductId: `product-${index}`,
  hasProduct: true,
  hasPurchasablePlan: true,
  pricePlans: [
    { plan: "lite", price: 0 },
    { plan: "pro", price: 12000 },
  ],
  isShopVisible: index === 0,
  linkedArtists: [{ id: "artist", name: "Fixture artist", isPrimary: true }],
  saleReadiness: { ready: true, reasons: [] },
  createdAt: "2026-10-05T00:00:00Z",
  updatedAt: "2026-10-05T00:00:00Z",
}));
items[2] = {
  ...items[2],
  publicationStatus: "draft",
  pricePlans: [],
  hasPurchasablePlan: false,
  saleReadiness: {
    ready: false,
    reasons: [
      { code: "NOT_PUBLISHED", message: "템플릿을 먼저 게시해 주세요." },
      {
        code: "PLAN_MISSING",
        message: "구매 가능한 가격 플랜을 먼저 등록해 주세요.",
      },
    ],
  },
};
items[3] = {
  ...items[3],
  salesType: "custom",
  hasProduct: false,
  shopProductId: null,
  pricePlans: [],
  hasPurchasablePlan: false,
  saleReadiness: {
    ready: false,
    reasons: [
      { code: "NOT_GENERAL_SALE", message: "기성품으로 전환해 주세요." },
      { code: "PRODUCT_MISSING", message: "상품 정보를 등록해 주세요." },
    ],
  },
};
items.push({
  ...items[1],
  id: "legacy",
  name: "Legacy product",
  templateEngine: "legacy",
  templateKind: null,
  templateCategory: "timetable",
});
let failList = false;
let lastParams;
const mutations = [];
const status = (item) =>
  item.isShopVisible
    ? "selling"
    : item.saleReadiness.ready
      ? "ready"
      : item.hasProduct
        ? "blocked"
        : "unconfigured";

// Every application API is intercepted, including mutations. No DB is modified.
await page.route("**/api/**", async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  if (url.pathname === "/api/auth/verify")
    return route.fulfill({
      json: {
        user: {
          id: "7",
          role: "admin",
          name: "Fixture admin",
          email: "admin@fixture.invalid",
          isAdmin: true,
        },
      },
    });
  if (url.pathname === "/api/admin/template-hub/templates") {
    lastParams = url.searchParams;
    assert.equal(
      lastParams.get("salesType"),
      "general",
      "Every sale view request excludes custom templates, including reset and pagination",
    );
    if (failList)
      return route.fulfill({
        status: 500,
        json: { code: "INTERNAL_ERROR", message: "Fixture list failure" },
      });
    const filtered = items.filter(
      (item) =>
        (!lastParams.get("engine") ||
          item.templateEngine === lastParams.get("engine")) &&
        (!lastParams.get("category") ||
          item.templateCategory === lastParams.get("category")) &&
        (!lastParams.get("search") ||
          item.name.includes(lastParams.get("search"))) &&
        (!lastParams.get("salesType") ||
          item.salesType === lastParams.get("salesType")) &&
        (!lastParams.get("saleStatus") ||
          status(item) === lastParams.get("saleStatus")) &&
        (!lastParams.get("publicationStatus") ||
          item.publicationStatus === lastParams.get("publicationStatus")) &&
        (!lastParams.has("hasProduct") ||
          item.hasProduct === (lastParams.get("hasProduct") === "true")),
    );
    const offset = Number(lastParams.get("offset")),
      limit = Number(lastParams.get("limit"));
    return route.fulfill({
      json: {
        items: filtered.slice(offset, offset + limit),
        pagination: { offset, limit, total: filtered.length },
        counts: {
          all: 26,
          studio: 25,
          legacy: 1,
          selling: 1,
          general: 25,
          custom: 1,
        },
      },
    });
  }
  const mutation =
    /^\/api\/admin\/template-hub\/templates\/([^/]+)\/(sale|sales-type)$/.exec(
      url.pathname,
    );
  if (mutation && request.method() === "PATCH") {
    const item = items.find((item) => item.id === mutation[1]);
    const body = request.postDataJSON();
    mutations.push({ id: item.id, action: mutation[2], body });
    if (mutation[2] === "sale") item.isShopVisible = body.visible;
    else {
      item.salesType = body.salesType;
      item.saleReadiness.reasons = item.saleReadiness.reasons.filter(
        (r) => r.code !== "NOT_GENERAL_SALE",
      );
    }
    return route.fulfill({ json: { item } });
  }
  return route.fulfill({ json: [] });
});

try {
  await page.goto(`${base}/admin/template-hub`);
  await page
    .getByRole("heading", { name: "템플릿 판매 관리", exact: true })
    .waitFor();
  const versions = page.getByRole("group", { name: "템플릿 버전" });
  assert.equal(
    await versions
      .getByRole("button", { name: "스튜디오", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByText("조회 24개", { exact: true }).waitFor();
  assert.equal(lastParams.get("engine"), "studio");
  assert.equal(
    await page.getByText("Legacy product", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("link", { name: "새 썸네일 템플릿" }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "필터 초기화" }).isDisabled(),
    true,
  );
  const row = (name) =>
    page
      .getByRole("row")
      .filter({ has: page.getByText(name, { exact: true }) });
  const ready = row("Studio product 1"),
    blocked = row("Studio product 2");
  assert.equal(await row("Studio product 3").count(), 0);
  assert.equal(await page.getByLabel("판매 분류", { exact: true }).count(), 0);
  assert.equal(
    await page
      .getByRole("button", { name: /기성품으로 전환|맞춤 제작으로 변경/ })
      .count(),
    0,
  );
  assert.ok((await ready.innerText()).includes("0원"));
  assert.ok((await ready.innerText()).includes("12,000원"));
  assert.equal(
    await ready
      .getByRole("link", { name: "상품·가격 편집" })
      .getAttribute("href"),
    "/admin/template-products/studio-1?returnTo=template-hub",
  );
  assert.equal(
    await blocked.getByRole("button", { name: "판매 시작" }).isDisabled(),
    true,
  );
  await blocked.getByText("게시 필요", { exact: true }).waitFor();
  await blocked.getByText("가격 설정", { exact: true }).waitFor();
  await ready.getByRole("button", { name: "판매 시작" }).click();
  await ready.getByRole("button", { name: "판매 중지" }).waitFor();
  page.once("dialog", (dialog) => dialog.accept());
  await ready.getByRole("button", { name: "판매 중지" }).click();
  await ready.getByRole("button", { name: "판매 시작" }).waitFor();
  await page.screenshot({ path: `${output}/desktop.png` });
  await page.getByRole("button", { name: "다음 페이지" }).click();
  await page.getByText("Studio product 24", { exact: true }).first().waitFor();
  const categories = page.getByRole("group", { name: "템플릿 종류" });
  await categories
    .getByRole("button", { name: "팀 시간표", exact: true })
    .click();
  await page.getByText("조회 2개", { exact: true }).waitFor();
  assert.equal(lastParams.get("offset"), "0");
  await row("Studio product 24")
    .getByText("템플릿 작업", { exact: true })
    .click();
  assert.equal(
    await row("Studio product 24")
      .getByRole("link", { name: "제작 화면" })
      .getAttribute("href"),
    "/admin/team-timetable-studio/studio-24/edit",
  );
  await categories.getByRole("button", { name: "시간표", exact: true }).click();
  await page.getByText("조회 3개", { exact: true }).waitFor();
  await categories.getByRole("button", { name: "썸네일", exact: true }).click();
  await page.getByText("조회 19개", { exact: true }).waitFor();
  await categories.getByRole("button", { name: "전체", exact: true }).click();
  await page.getByText("조회 24개", { exact: true }).waitFor();
  await versions.getByRole("button", { name: "레거시", exact: true }).click();
  await page.getByText("조회 1개", { exact: true }).waitFor();
  await page.getByText("Legacy product", { exact: true }).first().waitFor();
  assert.equal(lastParams.get("offset"), "0");
  await versions.getByRole("button", { name: "전체", exact: true }).click();
  await page.getByText("조회 25개", { exact: true }).waitFor();
  await categories.getByRole("button", { name: "시간표", exact: true }).click();
  await page.getByText("조회 4개", { exact: true }).waitFor();
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await page.getByText("조회 24개", { exact: true }).waitFor();
  assert.equal(
    await versions
      .getByRole("button", { name: "스튜디오", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await categories
      .getByRole("button", { name: "전체", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByLabel("판매 상태", { exact: true }).selectOption("selling");
  await page.getByText("조회 1개", { exact: true }).waitFor();
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await page.getByText("조회 24개", { exact: true }).waitFor();
  await page.getByLabel("템플릿 검색", { exact: true }).fill("no-results");
  await page
    .getByText("조건에 맞는 템플릿이 없습니다. 필터를 조정해 보세요.")
    .waitFor();
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await page.getByText("조회 24개", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/mobile.png` });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  failList = true;
  await page.reload();
  await page.getByText("Fixture list failure", { exact: true }).waitFor();
  failList = false;
  await page.getByRole("button", { name: "다시 시도" }).click();
  await page.getByText("조회 24개", { exact: true }).waitFor();
  assert.equal(mutations.length, 2);
  assert.ok(mutations.every((mutation) => mutation.action === "sale"));
  assert.deepEqual(errors, []);
  console.log(
    "Template Hub sales browser checks passed: default Studio, engine/filter reset, pagination, prices, general-only queries, category filters, sale actions, errors, mobile.",
  );
} finally {
  await browser.close();
}
