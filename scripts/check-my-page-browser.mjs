import { chromium } from "playwright";

const BASE_URL = process.env.MY_PAGE_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = "user-template-ui-03@temis.local";
const TEAM_EMAIL = "user-template-ui-03-team@temis.local";
const PASSWORD = "temis-local-03";
const TEAM_TEMPLATE_HREF =
  "/team-time-table/f0305001-5001-5001-5001-010101010101";
const LEGACY_HREF = "/time-table/06d6401a-1b2a-4e98-a5d2-363984b3bfbb";
const TIMETABLE_HREF = "/template-studio/f0300002-0202-0202-0202-020202020202";
const THUMBNAIL_HREF = "/thumbnail/f0300003-0303-0303-0303-030303030303";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const localUrl = new URL(BASE_URL);
assert(
  localUrl.hostname === "127.0.0.1" || localUrl.hostname === "localhost",
  "Browser smoke refuses to run against a non-local URL.",
);

async function login(page, email = EMAIL) {
  const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password: PASSWORD },
  });
  assert(
    response.ok(),
    `Fixture login for ${email} failed with ${response.status()}.`,
  );
}

async function openMyPage(page) {
  await page.goto(`${BASE_URL}/my-page`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "마이페이지", exact: true })
    .waitFor();
  await page.getByRole("button", { name: /내 템플릿/ }).waitFor();
}

async function selectTopTab(page, name) {
  await page.getByRole("button", { name }).click();
}

async function selectFilter(page, name) {
  const button = page.getByRole("button", { name, exact: true });
  await button.click();
  assert(
    (await button.getAttribute("aria-pressed")) === "true",
    `${name} filter was not selected.`,
  );
}

async function assertLinkCount(page, href, expected) {
  const count = await page.locator(`a[href="${href}"]`).count();
  assert(
    count === expected,
    `${href} link count was ${count}, expected ${expected}.`,
  );
}

const USER_TEMPLATES_ROUTE = "**/api/user/templates";

async function checkLoadingState(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  let releaseRequest;
  const requestReleased = new Promise((resolve) => {
    releaseRequest = resolve;
  });

  await page.route(USER_TEMPLATES_ROUTE, async (route) => {
    await requestReleased;
    await route.continue();
  });

  await login(page);
  const navigation = page.goto(`${BASE_URL}/my-page?tab=templates`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("템플릿을 불러오는 중").waitFor();
  releaseRequest();
  await navigation;
  await page
    .getByRole("heading", { name: "마이페이지", exact: true })
    .waitFor();

  await context.close();
}

async function checkErrorState(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  let forceError = true;

  await page.route(USER_TEMPLATES_ROUTE, async (route) => {
    if (forceError) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "browser checker forced error" }),
      });
      return;
    }

    await route.continue();
  });

  await login(page);
  await page.goto(`${BASE_URL}/my-page?tab=templates`, {
    waitUntil: "domcontentloaded",
  });
  const section = page.locator(
    "section[aria-labelledby='purchase-template-heading']",
  );
  await section.getByRole("alert").waitFor();
  forceError = false;
  await section.getByRole("button", { name: "다시 시도" }).click();
  await page.locator(`a[href="${LEGACY_HREF}"]`).waitFor();

  await context.close();
}

async function fulfillUserTemplatesResponse(route, mutate) {
  const response = await route.fetch();
  const payload = await response.json();
  const headers = response.headers();
  delete headers["content-length"];
  await route.fulfill({
    status: response.status(),
    headers,
    body: JSON.stringify(mutate(payload)),
  });
}

async function checkEmptyStates(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.route(USER_TEMPLATES_ROUTE, (route) =>
    fulfillUserTemplatesResponse(route, (payload) => ({
      ...payload,
      purchase_templates: [],
      artist_templates: [],
      total_purchase: 0,
      total_artist: 0,
      total: 0,
    })),
  );
  await login(page);
  await page.goto(`${BASE_URL}/my-page?tab=templates`, {
    waitUntil: "domcontentloaded",
  });
  const emptySection = page.locator(
    "section[aria-labelledby='purchase-template-heading']",
  );
  await emptySection
    .getByRole("heading", { name: "템플릿이 없습니다" })
    .waitFor();
  await page.unroute(USER_TEMPLATES_ROUTE);

  await page.route(USER_TEMPLATES_ROUTE, (route) =>
    fulfillUserTemplatesResponse(route, (payload) => {
      const rows = [
        ...(payload.purchase_templates || []),
        ...(payload.artist_templates || []),
      ];
      const timetableRow = rows.find(
        (row) => row?.templates?.template_kind !== "thumbnail",
      );
      assert(
        timetableRow,
        "Could not find a timetable fixture for filter-empty check.",
      );

      return {
        ...payload,
        purchase_templates: [timetableRow],
        artist_templates: [],
        total_purchase: 1,
        total_artist: 0,
        total: 1,
      };
    }),
  );
  await page.goto(`${BASE_URL}/my-page?tab=templates`, {
    waitUntil: "domcontentloaded",
  });
  const filteredSection = page.locator(
    "section[aria-labelledby='purchase-template-heading']",
  );
  await filteredSection
    .getByRole("button", { name: "썸네일", exact: true })
    .click();
  await filteredSection
    .getByRole("heading", { name: "선택한 종류의 템플릿이 없습니다" })
    .waitFor();

  await context.close();
}

async function checkRuntimeErrorBackLinks(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await login(page);
  await page.route("**/api/user/templates/*/runtime**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "browser checker forced runtime error" }),
    });
  });
  await page.goto(`${BASE_URL}${TIMETABLE_HREF}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "템플릿을 실행할 수 없습니다" })
    .waitFor();
  await page.locator('a[href="/my-page"]').waitFor();

  await page.goto(`${BASE_URL}${THUMBNAIL_HREF}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "썸네일을 열 수 없습니다" })
    .waitFor();
  await page.locator('a[href="/my-page"]').waitFor();

  await context.close();
}

async function checkDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  let missingCoverRequests = 0;

  page.on("request", (request) => {
    if (request.url().endsWith("/03-fixture-missing-cover.png")) {
      missingCoverRequests += 1;
    }
  });

  await login(page);
  await openMyPage(page);
  await selectTopTab(page, /내 템플릿/);
  await page.locator(`a[href="${THUMBNAIL_HREF}"]`).waitFor();
  await assertLinkCount(page, LEGACY_HREF, 1);
  await assertLinkCount(page, THUMBNAIL_HREF, 1);
  await assertLinkCount(page, TIMETABLE_HREF, 0);
  await page.getByText("썸네일 이미지 없음", { exact: true }).waitFor();

  await selectFilter(page, "시간표");
  await assertLinkCount(page, LEGACY_HREF, 1);
  await assertLinkCount(page, THUMBNAIL_HREF, 0);

  await selectFilter(page, "썸네일");
  await assertLinkCount(page, LEGACY_HREF, 0);
  await assertLinkCount(page, THUMBNAIL_HREF, 1);

  await selectTopTab(page, /내 작업물/);
  await page.locator(`a[href="${TIMETABLE_HREF}"]`).waitFor();
  await assertLinkCount(page, TIMETABLE_HREF, 1);
  await assertLinkCount(page, LEGACY_HREF, 0);
  await page.getByText("시간표 이미지 없음", { exact: true }).waitFor();
  assert(
    missingCoverRequests === 1,
    `Missing cover was requested ${missingCoverRequests} times, expected once.`,
  );

  const timetableLink = page.locator(`a[href="${TIMETABLE_HREF}"]`);
  await timetableLink.focus();
  assert(
    await timetableLink.evaluate(
      (element) => element === document.activeElement,
    ),
    "Card link did not receive keyboard focus.",
  );
  await page.keyboard.press("Enter");
  await page.waitForURL(`**${TIMETABLE_HREF}`);
  await page.locator('a[href="/my-page"]').waitFor();

  await page.goto(`${BASE_URL}/my-page?tab=templates`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: /내 템플릿/ }).waitFor();
  await page.locator(`a[href="${THUMBNAIL_HREF}"]`).click();
  await page.waitForURL(`**${THUMBNAIL_HREF}`);
  await page.locator('a[href="/my-page"]').waitFor();

  await page.goto(`${BASE_URL}${LEGACY_HREF}`, {
    waitUntil: "domcontentloaded",
  });
  assert(
    new URL(page.url()).pathname === LEGACY_HREF,
    "Legacy route did not open the route-backed page.",
  );

  await context.close();
}

async function checkMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await login(page);
  await openMyPage(page);
  await selectTopTab(page, /내 템플릿/);

  const section = page.locator(
    "section[aria-labelledby='purchase-template-heading']",
  );
  await section.waitFor();
  const columns = await section
    .locator(".grid")
    .last()
    .evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
          .length,
    );
  assert(columns === 1, `Mobile template grid rendered ${columns} columns.`);

  await selectFilter(page, "썸네일");
  await assertLinkCount(page, THUMBNAIL_HREF, 1);
  const sectionFitsViewport = await section.evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  );
  assert(
    sectionFitsViewport,
    "Mobile template section overflows horizontally.",
  );

  await context.close();
}

async function checkTeamTemplates(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await login(page, TEAM_EMAIL);
  await openMyPage(page);
  await page.getByRole("heading", { name: "팀 템플릿", exact: true }).waitFor();

  const teamTemplateHeading = page.getByRole("heading", {
    name: "[03 my-page] team template",
    exact: true,
  });
  await teamTemplateHeading.waitFor();
  await teamTemplateHeading.click();
  await page.waitForURL(`**${TEAM_TEMPLATE_HREF}`);

  assert(
    new URL(page.url()).pathname === TEAM_TEMPLATE_HREF,
    "Team template card did not open the existing team timetable route.",
  );

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await checkLoadingState(browser);
    await checkErrorState(browser);
    await checkEmptyStates(browser);
    await checkRuntimeErrorBackLinks(browser);
    await checkDesktop(browser);
    await checkMobile(browser);
    await checkTeamTemplates(browser);
    console.log(
      "03 my-page desktop/mobile, states, runtime errors, and team-template browser smoke passed.",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
