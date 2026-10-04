/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require("node:fs");
exports.install = async (page, file, options = {}) => {
  const fixture = JSON.parse(readFileSync(file, "utf8"));
  const { detail, assets, owner } = fixture;
  const stats = { proxyFetches: 0, applied: 0, restored: 0 };
  const runtime = (bindings) => ({
    mode: "r2",
    revisionId: detail.set.active_revision_id,
    images: Object.fromEntries(
      Object.entries(bindings).map(([theme, slots]) => [
        theme,
        Object.fromEntries(
          Object.entries(slots).map(([key, id]) => {
            const version = detail.versions.find((v) => v.id === id);
            return [
              key,
              {
                src: version.public_url,
                width: version.width,
                height: version.height,
              },
            ];
          }),
        ),
      ]),
    ),
  });
  await page.route("**/api/auth/verify", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "1",
          name: "Fixture admin",
          email: "fixture@example.invalid",
          role: "admin",
          isAdmin: true,
        },
      },
    }),
  );
  await page.route("**/api/template-access?*", (route) =>
    route.fulfill({ json: { hasAccess: true, isAdmin: true } }),
  );
  await page.route("https://legacy-assets.invalid/**", (route) => {
    if (route.request().resourceType() === "fetch")
      return route.abort("failed");
    const id = new URL(route.request().url()).pathname
      .slice(1)
      .replace(/\.png$/, "");
    const asset = assets[id];
    if (!asset) return route.fulfill({ status: 404 });
    // No CORS headers: <img> renders but export fetch must use the same-origin proxy.
    return route.fulfill({
      body: Buffer.from(asset.bytes, "base64"),
      contentType: asset.mimeType,
    });
  });
  await page.route("**/api/template-studio/assets/image?*", (route) => {
    stats.proxyFetches++;
    const source = new URL(
      new URL(route.request().url()).searchParams.get("url"),
    );
    const id = source.pathname.slice(1).replace(/\.png$/, "");
    const asset = assets[id];
    return route.fulfill({
      body: Buffer.from(asset.bytes, "base64"),
      contentType: asset.mimeType,
    });
  });
  await page.route("**/api/legacy-template-assets/**", (route) =>
    route.fulfill({
      json: runtime(
        detail.revisions.find((v) => v.id === detail.set.active_revision_id)
          .bindings,
      ),
    }),
  );
  let uploadedBytes;
  let pendingUpload;
  await page.route("**/fixture-asset-upload", async (route) => {
    uploadedBytes = route.request().postDataBuffer();
    await route.fulfill({ status: 200 });
  });
  await page.route("**/api/admin/legacy-template-assets**", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: new URL(route.request().url()).pathname.endsWith(
          "legacy-template-assets",
        )
          ? { sets: [detail.set] }
          : detail,
      });
    const body = route.request().postDataJSON();
    const current = detail.revisions.find(
      (v) => v.id === detail.set.active_revision_id,
    );
    if (body.action === "presign") {
      pendingUpload = body.upload;
      return route.fulfill({
        json: {
          uploadUrl: `${options.baseUrl ?? "http://127.0.0.1:3107"}/fixture-asset-upload`,
          headers: { "Content-Type": body.upload.mimeType },
          ticket: "fixture-ticket",
        },
      });
    }
    if (body.action === "verify") {
      const version = {
        ...detail.versions[0],
        id: "00000000-0000-4000-8000-000000000999",
        asset_id: pendingUpload.assetId,
        content_hash: pendingUpload.contentHash,
        byte_size: uploadedBytes.length,
        width: 2,
        height: 2,
        original_filename: pendingUpload.originalFilename,
        public_url: "https://legacy-assets.invalid/replacement.png",
        storage_path: "legacy-template-assets/fixture/replacement.png",
      };
      assets.replacement = {
        mimeType: pendingUpload.mimeType,
        bytes: uploadedBytes.toString("base64"),
      };
      detail.versions.unshift(version);
      return route.fulfill({ json: { version } });
    }
    let bindings = structuredClone(current.bindings);
    for (const change of body.changes ?? [])
      bindings[change.theme][change.key] = change.versionId;
    if (body.action === "preview")
      return route.fulfill({ json: runtime(bindings) });
    if (body.expectedRevisionId !== detail.set.active_revision_id)
      return route.fulfill({
        status: 409,
        json: { error: "Fixture conflict" },
      });
    if (body.action === "restore") {
      bindings = detail.revisions.find(
        (v) => v.id === body.revisionId,
      ).bindings;
      stats.restored++;
    }
    if (body.action === "apply") stats.applied++;
    if (body.action === "apply" || body.action === "restore")
      detail.set.mode = "r2";
    if (body.action === "mode") detail.set.mode = body.mode;
    const revision = {
      ...current,
      id: `00000000-0000-4000-8000-${String(detail.revisions.length + 10).padStart(12, "0")}`,
      revision_no: detail.revisions.length + 1,
      bindings,
      note: body.note ?? body.action,
      created_at: new Date().toISOString(),
    };
    detail.revisions.unshift(revision);
    detail.set.active_revision_id = revision.id;
    return route.fulfill({ json: { revisionId: revision.id } });
  });
  return { owner, detail, stats };
};
