/* eslint-disable @next/next/no-img-element -- Verify ordinary image rendering. */
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import publicCovers from "../src/utils/legacy-template-assets/public-project-covers.json";
import {
  requiresLegacyAssetR2,
  resolveCatalogCoverUrl,
} from "../src/utils/legacy-template-assets/source-policy";
import { createLegacyAssetInventory } from "./lib/legacy-template-asset-inventory";
import { createProjectAssetTemplates } from "./lib/project-asset-inventory";
import { HOMEPAGE_IMAGE_FILES } from "../src/utils/legacy-template-assets/project-assets";
import type {
  LegacyAssetRevision,
  LegacyAssetVersion,
  LegacyAssetDetail,
} from "../src/types/legacy-template-assets";

async function main() {
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture_only";
  process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://assets.invalid";
  const { buildProjectAssetManifest } =
    await import("../src/services/server/projectAssetManifestService");
  const { ManagedCatalogImage } =
    await import("../src/components/common/ManagedCatalogImage");
  const { TemplateCover } =
    await import("../src/components/templates/template-cover");
  const coverId = "8f9bb89d-34f5-45c1-b923-16366197af33";
  const cover = {
    id: "cover-set",
    template_id: coverId,
    team_template_id: null,
    thumbnail_id: null,
    site_key: null,
    purpose: "cover",
    mode: "r2",
    active_revision_id: "cover-revision",
    expected_slots: { first: ["cover"] },
  };
  const version = {
    id: "cover-version",
    asset_set_id: cover.id,
    storage_path: "legacy-template-assets/fixture/cover.png",
    width: 1280,
    height: 720,
  } as LegacyAssetVersion;
  const revision = {
    id: cover.active_revision_id,
    asset_set_id: cover.id,
    revision_no: 1,
    note: "fixture",
    created_at: "2026-10-04T00:00:00Z",
    created_by: null,
    bindings: { first: { cover: version.id } },
  } as LegacyAssetRevision;
  const manifest = buildProjectAssetManifest([cover], [revision], [version]);
  const local = `/thumbnail/${coverId}.png`;
  assert.equal(
    manifest.covers[local].src,
    "https://assets.invalid/legacy-template-assets/fixture/cover.png",
  );
  assert.deepEqual(
    buildProjectAssetManifest([{ ...cover, mode: "local" }], [], []).covers,
    {},
  );
  assert.deepEqual(
    buildProjectAssetManifest([{ ...cover, purpose: "runtime" }], [], [])
      .covers,
    {},
  );
  assert.deepEqual(
    buildProjectAssetManifest(
      [{ ...cover, template_id: "00000000-0000-4000-8000-000000000000" }],
      [],
      [],
    ).covers,
    {},
  );
  assert.throws(() => buildProjectAssetManifest([cover], [], [version]));
  assert.throws(() =>
    buildProjectAssetManifest(
      [cover],
      [revision],
      [{ ...version, asset_set_id: "other-set" }],
    ),
  );
  const site = {
    ...cover,
    id: "site-set",
    template_id: null,
    site_key: "homepage",
    purpose: "site",
    active_revision_id: "site-revision",
    expected_slots: Object.fromEntries(
      Object.entries(HOMEPAGE_IMAGE_FILES).map(([theme, slots]) => [
        theme,
        Object.keys(slots),
      ]),
    ),
  };
  const siteVersion = { ...version, id: "site-version", asset_set_id: site.id };
  const siteRevision = {
    ...revision,
    id: site.active_revision_id,
    asset_set_id: site.id,
    bindings: Object.fromEntries(
      Object.entries(site.expected_slots).map(([theme, keys]) => [
        theme,
        Object.fromEntries(keys.map((key) => [key, siteVersion.id])),
      ]),
    ),
  };
  const homepage = buildProjectAssetManifest(
    [site],
    [siteRevision],
    [siteVersion],
  ).homepage;
  assert.equal(homepage.mode, "r2");
  assert.equal(Object.values(homepage.images).flatMap(Object.keys).length, 14);
  assert.deepEqual(
    Object.keys(homepage.images.first),
    Object.keys(HOMEPAGE_IMAGE_FILES.first),
  );
  const client = new QueryClient();
  client.setQueryData(
    ["legacy-template-assets", "public-project-manifest"],
    manifest,
  );
  const render = () =>
    renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ManagedCatalogImage src={local} alt="cover" />
        <TemplateCover src={local} alt="cover" kind="timetable" />
      </QueryClientProvider>,
    );
  process.env.NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED = "false";
  assert.equal(render().split('src="https://assets.invalid').length - 1, 2);
  process.env.NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED = "true";
  assert.equal(render().split('src="https://assets.invalid').length - 1, 2);
  assert.ok(!render().includes(`src="${local}"`));
  client.clear();
  assert.match(render(), /role="status"/);
  assert.ok(
    !render().includes(`src="${local}"`),
    "Loading fetched a local cover",
  );
  client.setQueryData(["legacy-template-assets", "public-project-manifest"], {
    ...manifest,
    covers: {},
  });
  assert.match(render(), /role="alert"/);
  assert.ok(
    !render().includes(`src="${local}"`),
    "Missing manifest fell back locally",
  );
  assert.equal(
    resolveCatalogCoverUrl("https://studio.invalid/cover.png", undefined),
    "https://studio.invalid/cover.png",
  );
  assert.equal(
    resolveCatalogCoverUrl("/landing/sample.png", undefined),
    "/landing/sample.png",
  );
  assert.throws(() =>
    resolveCatalogCoverUrl(local, {
      ...manifest,
      covers: { [local]: { src: local, width: 1, height: 1 } },
    }),
  );

  const archived = JSON.parse(
    readFileSync("scripts/data/legacy-cover-removed-sources.json", "utf8"),
  ) as ReturnType<typeof createProjectAssetTemplates>;
  const inventory = createProjectAssetTemplates(
    process.cwd(),
    createLegacyAssetInventory(process.cwd()),
  );
  assert.equal(archived.length, 97);
  assert.equal(inventory.length, 97);
  assert.equal(
    inventory.reduce((n, item) => n + item.assets[0].byteSize, 0),
    206574623,
  );
  for (const saved of archived) {
    assert.equal(requiresLegacyAssetR2(saved), true);
    const asset = saved.assets[0];
    assert.ok(
      publicCovers.some(
        (entry) => entry.localUrl === asset.file.replace(/^public/, ""),
      ),
    );
    assert.equal(existsSync(asset.file), false);
    const before = execFileSync("git", ["show", `79b1e341:${asset.file}`], {
      maxBuffer: 32 * 1024 * 1024,
    });
    assert.equal(
      createHash("sha256").update(before).digest("hex"),
      asset.contentHash,
    );
    assert.equal(before.length, asset.byteSize);
    const current = inventory.find(
      (item) =>
        item.templateId === saved.templateId &&
        item.ownerKind === saved.ownerKind,
    )!;
    assert.equal(current.assets[0].sourceRemoved, true);
    assert.deepEqual(current.bindings, saved.bindings);
  }
  const { applyLegacyAssetRevision, buildLegacyAssetRuntime } =
    await import("../src/services/server/legacyTemplateAssetService");
  const localCover = {
    set: {
      ...archived[0],
      name: "fixture cover",
      id: "fixture",
      mode: "local",
      active_revision_id: "revision",
      expected_slots: { first: ["cover"] },
      updated_at: "",
    },
    versions: [],
    revisions: [],
  } as LegacyAssetDetail;
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Unexpected network call");
  };
  try {
    assert.throws(() => buildLegacyAssetRuntime(localCover), /R2 적용/);
    await assert.rejects(
      applyLegacyAssetRevision(
        localCover,
        "revision",
        {},
        1,
        "fixture",
        "local",
      ),
      /로컬 모드/,
    );
  } finally {
    globalThis.fetch = fetchBefore;
  }
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  const { signJWT } = await import("../src/lib/auth/jwt");
  const token = await signJWT({ userId: 1, role: "admin" });
  const thumbnailRoute =
    await import("../src/app/api/admin/templates/thumbnails/route");
  let active = true;
  globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL
        ? input.toString()
        : input.url,
    );
    assert.equal(url.origin, "http://127.0.0.1:1");
    assert.ok(!init?.method || init.method === "GET");
    const table = url.pathname.split("/").pop();
    const rows =
      table === "legacy_template_asset_sets"
        ? active
          ? [cover]
          : []
        : table === "legacy_template_asset_revisions"
          ? [revision]
          : table === "legacy_template_asset_versions"
            ? [version]
            : null;
    assert.ok(rows, `Unexpected fixture table ${table}`);
    return new Response(JSON.stringify(rows), {
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const request = (authenticated = true) =>
      new NextRequest(
        `http://localhost/api/admin/templates/thumbnails?template_id=${coverId}`,
        {
          headers: authenticated ? { Authorization: `Bearer ${token}` } : {},
        },
      );
    assert.equal((await thumbnailRoute.GET(request(false))).status, 401);
    for (const flag of ["false", "true"]) {
      process.env.NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED = flag;
      active = true;
      const response = await thumbnailRoute.GET(request());
      assert.equal(response.status, 200);
      assert.equal(
        (await response.json()).thumbnail.url,
        manifest.covers[local].src,
      );
      active = false;
      assert.equal((await thumbnailRoute.GET(request())).status, 503);
    }
  } finally {
    globalThis.fetch = fetchBefore;
  }
  const { HomepageAssetsProvider, useLegacyAssetUrl, useLegacyTemplateImages } =
    await import("../src/contexts/LegacyTemplateAssetsContext");
  const localImages = { first: { bg: { src: "/local-home-bg.png" } } };
  function LocalHomeProbe() {
    assert.equal(useLegacyTemplateImages(localImages), localImages);
    const src = useLegacyAssetUrl(
      "site",
      "feature_money",
      "/landing/money.png",
    );
    return <img src={src} alt="local home" />;
  }
  // No QueryClientProvider: the normal homepage must not need the asset query.
  assert.ok(
    renderToStaticMarkup(
      <HomepageAssetsProvider>
        <LocalHomeProbe />
      </HomepageAssetsProvider>,
    ).includes('src="/landing/money.png"'),
  );
  client.clear();
  const route = await import("../src/app/api/project-assets/route");
  assert.equal(typeof route.GET, "function");
  assert.equal("POST" in route, false);
  assert.equal("PUT" in route, false);
  assert.equal("DELETE" in route, false);
  console.log(
    "Project asset checks passed: 97 archived covers (206574623 bytes), R2-only resolution regardless of flag, loading/missing/invalid errors without local fallback, local-mode guard, public allowlist, local homepage and GET-only API.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
