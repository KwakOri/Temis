import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

import type { Json } from "../src/types/supabase";

type FixtureQueryResult = { error: { message?: string } | null };
type FixtureQuery = PromiseLike<FixtureQueryResult> & {
  eq(column: string, value: unknown): FixtureQuery;
  insert(value: unknown): FixtureQuery;
  update(value: unknown): FixtureQuery;
  upsert(value: unknown, options?: { onConflict?: string }): FixtureQuery;
};
type FixtureSupabaseClient = {
  from(table: string): FixtureQuery;
};

const ROOT_DIR = path.resolve(process.cwd());
const BASE_URL =
  process.env.USER_TEMPLATE_UI_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const PASSWORD = "temis-local-03";
const ADMIN_EMAIL = "user-template-ui-07-admin@temis.local";
const BUYER_EMAIL = "user-template-ui-07@temis.local";
const FIXTURE_ADMIN_ID = 9390700;

const TEMPLATE_IDS = {
  legacy: "db8f0082-b6c4-4b8c-9dfc-ec336bea0566",
  timetable: "f0700002-0202-0202-0202-020202020202",
  thumbnail: "f0700003-0303-0303-0303-030303030303",
} as const;

const ROUTES = {
  legacy: `/time-table/${TEMPLATE_IDS.legacy}`,
  timetable: `/template-studio/${TEMPLATE_IDS.timetable}`,
  thumbnail: `/thumbnail/${TEMPLATE_IDS.thumbnail}`,
} as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const parseEnvOutput = (value: string): Record<string, string> => {
  const env: Record<string, string> = {};

  value.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    const separatorIndex = trimmed.indexOf("=");
    if (!trimmed || separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (key) env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  });

  return env;
};

const assertLocalUrl = (value: string, label: string) => {
  const url = new URL(value);
  assert(
    url.hostname === "127.0.0.1" || url.hostname === "localhost",
    `${label} must be local; refusing to run browser E2E against ${url.hostname}.`,
  );
};

const loadLocalSupabaseEnv = (): string => {
  let output: string;
  try {
    output = execFileSync(
      "supabase",
      ["status", "-o", "env", "--workdir", ROOT_DIR],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    throw new Error(
      "Local Supabase is not running. Start it with `npm run dev:local`, then retry this check.",
    );
  }

  const statusEnv = parseEnvOutput(output);
  const apiUrl = statusEnv.API_URL ?? statusEnv.KONG_URL;
  const dbUrl = statusEnv.DB_URL ?? statusEnv.POSTGRES_URL;
  const publishableKey = statusEnv.PUBLISHABLE_KEY;
  const secretKey = statusEnv.SECRET_KEY;

  assert(
    apiUrl && dbUrl && publishableKey && secretKey,
    "Local Supabase status is incomplete.",
  );
  assertLocalUrl(apiUrl, "Supabase API URL");
  assertLocalUrl(dbUrl.replace(/^postgresql:/, "http:"), "Supabase DB URL");

  process.env.SUPABASE_URL = apiUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = publishableKey;
  process.env.SUPABASE_SECRET_KEY = secretKey;
  return dbUrl;
};

const runSqlFile = (dbUrl: string, fileName: string) => {
  execFileSync(
    "psql",
    [
      dbUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-f",
      path.join(ROOT_DIR, "scripts", fileName),
    ],
    { cwd: ROOT_DIR, stdio: "inherit" },
  );
};

const asJson = (value: unknown): Json => value as Json;

const throwOnError = (error: { message?: string } | null, label: string) => {
  if (error) throw new Error(`${label}: ${error.message ?? "unknown error"}`);
};

const thumbnailImageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#bfdbfe"/><circle cx="320" cy="180" r="110" fill="#2563eb"/></svg>`)}`;

const createBrowserThumbnailDocument = async () => {
  const { createThumbnailStudioDocument } =
    await import("../src/utils/thumbnail-studio/document-factory");

  const document = createThumbnailStudioDocument({
    name: "[07 browser-e2e] Studio thumbnail",
    description: "Local browser E2E thumbnail fixture",
    width: 1200,
    height: 630,
    background: "#ffffff",
  });

  document.inputs = {
    title: {
      id: "title",
      type: "text",
      scope: "global",
      label: "E2E 제목",
      placeholder: "제목을 입력하세요",
      defaultValue: "브라우저 E2E 초기 제목",
      presentation: { order: 0, groupId: "내용" },
    },
    photo: {
      id: "photo",
      type: "image",
      scope: "global",
      label: "E2E 이미지",
      defaultUrl: thumbnailImageUrl,
      policy: {
        allowFitChange: true,
        allowFocusChange: true,
        allowReplace: true,
        allowCrop: false,
        recommendedAspectRatio: 16 / 9,
      },
      presentation: { order: 1, groupId: "내용" },
    },
  };
  document.styles = {
    titleStyle: {
      position: "absolute",
      left: 70,
      top: 45,
      width: 1060,
      height: 90,
      fontSize: 44,
      fontWeight: 800,
      color: "#111827",
      display: "flex",
      alignItems: "center",
    },
    photoStyle: {
      position: "absolute",
      left: 70,
      top: 180,
      width: 520,
      height: 300,
      borderRadius: 24,
      overflow: "hidden",
    },
  };
  document.graph.rootNodeIds = ["e2e-title", "e2e-photo"];
  document.graph.nodes = {
    "e2e-title": {
      id: "e2e-title",
      type: "text",
      label: "E2E title",
      parentId: null,
      childIds: [],
      styleId: "titleStyle",
      binding: { kind: "inputText", inputId: "title" },
    },
    "e2e-photo": {
      id: "e2e-photo",
      type: "image",
      label: "E2E photo",
      parentId: null,
      childIds: [],
      styleId: "photoStyle",
      fit: "cover",
      binding: { kind: "inputImage", inputId: "photo" },
    },
  };

  return document;
};

const replacePublishedDocument = async (
  supabase: FixtureSupabaseClient,
  templateId: string,
  document: Awaited<ReturnType<typeof createBrowserThumbnailDocument>>,
  runtimeValues: unknown,
) => {
  const revisionResult = await supabase
    .from("template_studio_document_revisions")
    .upsert(
      {
        template_id: templateId,
        revision_no: 1,
        document_version: document.version,
        document: asJson(document),
        runtime_values: asJson(runtimeValues),
        source: "system",
        created_by: FIXTURE_ADMIN_ID,
      },
      { onConflict: "template_id,revision_no" },
    );
  throwOnError(
    revisionResult.error,
    `Could not seed revision for ${templateId}`,
  );

  const documentResult = await supabase
    .from("template_studio_documents")
    .upsert(
      {
        template_id: templateId,
        document_version: document.version,
        document: asJson(document),
        runtime_values: asJson(runtimeValues),
        published_revision_no: 1,
      },
      { onConflict: "template_id" },
    );
  throwOnError(
    documentResult.error,
    `Could not seed document for ${templateId}`,
  );
};

const seedBrowserFixture = async (supabase: FixtureSupabaseClient) => {
  const { createInitialStudioRuntimeValues, createSampleStudioDocument } =
    await import("../src/utils/template-studio/sample-document");

  const timetableDocument = createSampleStudioDocument();
  timetableDocument.metadata.name = "[07 browser-e2e] Studio timetable";
  await replacePublishedDocument(
    supabase,
    TEMPLATE_IDS.timetable,
    timetableDocument,
    createInitialStudioRuntimeValues(timetableDocument),
  );

  const thumbnailDocument = await createBrowserThumbnailDocument();
  await replacePublishedDocument(
    supabase,
    TEMPLATE_IDS.thumbnail,
    thumbnailDocument,
    createInitialStudioRuntimeValues(thumbnailDocument),
  );
};

const login = async (context: BrowserContext, email: string): Promise<Page> => {
  const page = await context.newPage();
  const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password: PASSWORD },
  });
  assert(
    response.ok(),
    `Fixture login failed for ${email}: ${response.status()}`,
  );
  return page;
};

const assertLinkCount = async (page: Page, href: string, expected: number) => {
  const count = await page.locator(`a[href="${href}"]`).count();
  assert(
    count === expected,
    `${href} link count was ${count}; expected ${expected}.`,
  );
};

const checkShopFilters = async (page: Page) => {
  await page.goto(`${BASE_URL}/shop`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "템플릿 상점", exact: true })
    .waitFor();
  await page.locator(`a[href="/shop/${TEMPLATE_IDS.legacy}"]`).waitFor();
  await page.locator(`a[href="/shop/${TEMPLATE_IDS.timetable}"]`).waitFor();

  const timetableTab = page.getByRole("tab", { name: "시간표", exact: true });
  assert(
    (await timetableTab.getAttribute("aria-selected")) === "true",
    "시간표 shop tab was not selected by default.",
  );
  await assertLinkCount(page, `/shop/${TEMPLATE_IDS.legacy}`, 1);
  await assertLinkCount(page, `/shop/${TEMPLATE_IDS.timetable}`, 1);
  await assertLinkCount(page, `/shop/${TEMPLATE_IDS.thumbnail}`, 0);

  await page.getByRole("tab", { name: "썸네일", exact: true }).click();
  await page.waitForURL("**/shop?kind=thumbnail");
  await assertLinkCount(page, `/shop/${TEMPLATE_IDS.thumbnail}`, 1);
  await assertLinkCount(page, `/shop/${TEMPLATE_IDS.legacy}`, 0);
};

const submitPurchaseRequest = async (
  page: Page,
  templateId: string,
  marker: string,
) => {
  await page.goto(`${BASE_URL}/shop/${templateId}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("button", { name: "구매 신청하기", exact: true })
    .click();

  const form = page.locator("form").filter({
    has: page.getByPlaceholder("계좌 이체 시 사용할 입금자명을 입력하세요"),
  });
  await form.waitFor();

  const planButton = page.getByRole("button", { name: /LITE|PRO/ }).first();
  await planButton.click();
  await form
    .getByPlaceholder("계좌 이체 시 사용할 입금자명을 입력하세요")
    .fill("브라우저 E2E 입금자");
  await form
    .getByPlaceholder("추가 요청사항이 있으시면 적어주세요")
    .fill(marker);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/template-purchase-requests") &&
      response.request().method() === "POST",
  );
  await form.getByRole("button", { name: "구매 신청", exact: true }).click();
  const response = await responsePromise;
  assert(
    response.status() === 201,
    `Purchase request returned ${response.status()}.`,
  );
  await page.getByText("구매 신청 대기중", { exact: true }).waitFor();
};

const approveLatestRequest = async (page: Page, marker: string) => {
  await page.goto(`${BASE_URL}/admin/purchases`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "결제 대기 목록", exact: true })
    .waitFor();

  const row = page.locator("tr").filter({ hasText: marker }).first();
  await row.waitFor();
  const approveButton = row.getByRole("button", {
    name: "결제확인 및 권한부여",
    exact: true,
  });

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/purchase-requests/") &&
      response.url().endsWith("/approve") &&
      response.request().method() === "POST",
  );
  await approveButton.click();
  const response = await responsePromise;
  assert(response.ok(), `Purchase approval returned ${response.status()}.`);
  await row.waitFor({ state: "detached" });
};

const checkPurchaseAndApprovalFlow = async (browser: Browser) => {
  const buyerContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const buyerPage = await login(buyerContext, BUYER_EMAIL);
  const adminPage = await login(adminContext, ADMIN_EMAIL);

  buyerPage.on("dialog", (dialog) => void dialog.accept());
  adminPage.on("dialog", (dialog) => void dialog.accept());

  try {
    await checkShopFilters(buyerPage);

    const orderedTemplates = [
      TEMPLATE_IDS.legacy,
      TEMPLATE_IDS.timetable,
      TEMPLATE_IDS.thumbnail,
    ] as const;

    for (const templateId of orderedTemplates) {
      const marker = `[07 browser-e2e] ${templateId}`;
      await submitPurchaseRequest(buyerPage, templateId, marker);
      await approveLatestRequest(adminPage, marker);
    }
  } finally {
    await buyerContext.close();
    await adminContext.close();
  }
};

const checkMyPageAfterApproval = async (browser: Browser) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await login(context, BUYER_EMAIL);

  try {
    await page.goto(`${BASE_URL}/my-page?tab=templates`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("heading", { name: "마이페이지", exact: true })
      .waitFor();
    await page.getByRole("button", { name: /내 템플릿/ }).waitFor();
    await page.locator(`a[href="${ROUTES.legacy}"]`).waitFor();
    await page.locator(`a[href="${ROUTES.timetable}"]`).waitFor();
    await page.locator(`a[href="${ROUTES.thumbnail}"]`).waitFor();
  } finally {
    await context.close();
  }
};

const checkLegacyRuntime = async (page: Page) => {
  await page.goto(`${BASE_URL}${ROUTES.legacy}`, {
    waitUntil: "domcontentloaded",
  });
  assert(
    new URL(page.url()).pathname === ROUTES.legacy,
    "Legacy runtime did not stay on the route-backed page.",
  );
  assert(
    !(await page.locator("body").innerText()).includes(
      "템플릿을 실행할 수 없습니다",
    ),
    "Legacy runtime rendered the Studio error state.",
  );
};

const checkTimetableRuntime = async (page: Page) => {
  await page.goto(`${BASE_URL}${ROUTES.timetable}?lang=ko`, {
    waitUntil: "domcontentloaded",
  });
  const form = page.getByTestId("template-studio-runtime-form");
  await form.waitFor();

  const title = form.getByLabel("메인 타이틀", { exact: true }).first();
  await title.fill("[07 browser-e2e] 저장 확인");

  const saveResponse = page.waitForResponse(
    (response) =>
      response
        .url()
        .endsWith(`/api/user/templates/${TEMPLATE_IDS.timetable}/runtime`) &&
      response.request().method() === "PUT" &&
      response.ok(),
  );
  await form.getByRole("button", { name: "저장", exact: true }).click();
  await saveResponse;

  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadedForm = page.getByTestId("template-studio-runtime-form");
  await reloadedForm.waitFor();
  assert(
    (await reloadedForm
      .getByLabel("메인 타이틀", { exact: true })
      .first()
      .inputValue()) === "[07 browser-e2e] 저장 확인",
    "Timetable runtime value was not restored after reload.",
  );
};

const checkThumbnailRuntime = async (page: Page) => {
  await page.goto(`${BASE_URL}${ROUTES.thumbnail}`, {
    waitUntil: "domcontentloaded",
  });
  const form = page.getByTestId("thumbnail-runtime-form");
  await form.waitFor();
  await form
    .getByLabel("E2E 제목", { exact: true })
    .fill("[07 browser-e2e] PNG 확인");

  const imageInput = form.locator('input[type="file"]').first();
  await imageInput.setInputFiles({
    name: "browser-e2e.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });

  const exportButton = form.getByRole("button", {
    name: "PNG 저장",
    exact: true,
  });
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.includes("PNG 저장"),
    );
    return Boolean(button && !(button as HTMLButtonElement).disabled);
  });

  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  assert(
    download.suggestedFilename().toLowerCase().endsWith(".png"),
    `Thumbnail export filename was ${download.suggestedFilename()}.`,
  );
};

const checkRuntimeRoutes = async (browser: Browser) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await login(context, BUYER_EMAIL);
  page.on("dialog", (dialog) => void dialog.accept());

  try {
    await checkLegacyRuntime(page);
    await checkTimetableRuntime(page);
    await checkThumbnailRuntime(page);
  } finally {
    await context.close();
  }
};

const checkMobileMyPage = async (browser: Browser) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await login(context, BUYER_EMAIL);

  try {
    await page.goto(`${BASE_URL}/my-page?tab=templates`, {
      waitUntil: "domcontentloaded",
    });
    const section = page.locator(
      "section[aria-labelledby='purchase-template-heading']",
    );
    await section.waitFor();
    await section.locator(`a[href="${ROUTES.thumbnail}"]`).waitFor();
    assert(
      await section.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
      "My page overflows horizontally at the mobile viewport.",
    );
  } finally {
    await context.close();
  }
};

const main = async () => {
  assertLocalUrl(BASE_URL, "Browser E2E base URL");
  const dbUrl = loadLocalSupabaseEnv();
  const { supabaseAdminServer } =
    await import("../src/lib/supabase-admin-server");
  const fixtureSupabase =
    supabaseAdminServer as unknown as FixtureSupabaseClient;
  let fixtureCreated = false;
  let browser: Browser | null = null;

  try {
    runSqlFile(dbUrl, "fixtures-07-browser-e2e-cleanup.sql");
    runSqlFile(dbUrl, "fixtures-07-browser-e2e-create.sql");
    fixtureCreated = true;
    await seedBrowserFixture(fixtureSupabase);

    browser = await chromium.launch({ headless: true });
    await checkPurchaseAndApprovalFlow(browser);
    await checkMyPageAfterApproval(browser);
    await checkRuntimeRoutes(browser);
    await checkMobileMyPage(browser);
    console.log(
      "07 user-template browser E2E passed: shop filters, purchase approval, My Page, legacy/timetable/thumbnail runtimes, timetable save/reload, thumbnail PNG export, and mobile overflow.",
    );
  } finally {
    if (browser) await browser.close();
    if (fixtureCreated) {
      runSqlFile(dbUrl, "fixtures-07-browser-e2e-cleanup.sql");
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
