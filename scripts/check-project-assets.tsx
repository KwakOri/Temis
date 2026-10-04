import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HOMEPAGE_IMAGE_FILES } from "../src/utils/legacy-template-assets/project-assets";
import type {
  LegacyAssetRevision,
  LegacyAssetVersion,
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
  assert.ok(
    !render().includes("https://assets.invalid"),
    "Disabled flag used a cached R2 URL",
  );
  process.env.NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED = "true";
  assert.equal(render().split('src="https://assets.invalid').length - 1, 2);
  client.clear();
  const route = await import("../src/app/api/project-assets/route");
  assert.equal(typeof route.GET, "function");
  assert.equal("POST" in route, false);
  assert.equal("PUT" in route, false);
  assert.equal("DELETE" in route, false);
  console.log(
    "Project asset checks passed: public allowlist, private/local exclusion, version ownership, 14 home slots, cached flag isolation and GET-only API.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
