/**
 * P0 follow-up: exercises the admin/user routes that write to
 * templates / artists / template_artists / template_plans / shop_templates
 * directly (not covered by check:pilot-e2e), to confirm the anon->service-role
 * client swap in these files didn't break anything after the step-11 GRANT
 * revocation (20260715080000_revoke_anon_write_catalog_tables.sql).
 */
import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";

const ADMIN_ID = 9100501;
const ADMIN_EMAIL = "catalog-check-admin@temis.com";
const ARTIST_USER_ID = 9100502;
const ARTIST_USER_EMAIL = "catalog-check-artist-user@temis.com";

type RouteContext = { params: Promise<{ id: string }> };
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error("Refusing to run against a non-local Supabase URL.");
  }
};

const upsertUser = async (id: number, email: string, role: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    { id, created_at: now, updated_at: now, name: `Catalog Check ${id}`, email, password: "local-only", role },
    { onConflict: "id" },
  );
  if (error) throw error;
};

const req = (
  url: string,
  token: string,
  init: { body?: BodyInit | null; method?: string } = {},
): NextRequest =>
  new NextRequest(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

const json = async <T>(response: NextResponse): Promise<{ status: number; body: T | null }> => {
  const body = await response.json().catch(() => null);
  return { status: response.status, body: body as T | null };
};

const base = "http://127.0.0.1/catalog-writes-check";

const main = async () => {
  assertLocalSupabaseUrl();
  await upsertUser(ADMIN_ID, ADMIN_EMAIL, "admin");
  await upsertUser(ARTIST_USER_ID, ARTIST_USER_EMAIL, "user");

  const [templatesRoute, templateItemRoute, artistsRoute, artistItemRoute, templateArtistsRoute, artistProfileRoute] =
    await Promise.all([
      import("../src/app/api/admin/templates/route"),
      import("../src/app/api/admin/templates/[id]/route"),
      import("../src/app/api/admin/artists/route"),
      import("../src/app/api/admin/artists/[id]/route"),
      import("../src/app/api/admin/template-artists/route"),
      import("../src/app/api/user/artist-profile/route"),
    ]);

  const adminToken = await signJWT({ userId: ADMIN_ID, email: ADMIN_EMAIL, role: "admin" }, "1h");
  const artistUserToken = await signJWT(
    { userId: ARTIST_USER_ID, email: ARTIST_USER_EMAIL, role: "user" },
    "1h",
  );

  let templateId: string | null = null;
  let artistId: string | null = null;

  try {
    // 1. Admin creates a legacy template.
    const createTemplate = await json<{ template: { id: string } }>(
      await templatesRoute.POST(
        req(`${base}/api/admin/templates`, adminToken, {
          method: "POST",
          body: JSON.stringify({
            name: `Catalog Writes Check Template ${Date.now()}`,
            description: "P0 verification only",
            is_public: false,
          }),
        }),
      ),
    );
    assert(createTemplate.status === 200 || createTemplate.status === 201, `template create failed: ${createTemplate.status}`);
    templateId = createTemplate.body!.template.id;
    assert(templateId, "template create response missing id");

    // 2. Admin updates it.
    const updateTemplate = await (templateItemRoute.PATCH as RouteHandler)(
      req(`${base}/api/admin/templates/${templateId}`, adminToken, {
        method: "PATCH",
        body: JSON.stringify({ description: "Updated by check-admin-catalog-writes" }),
      }),
      { params: Promise.resolve({ id: templateId }) },
    );
    assert(updateTemplate.status === 200, `template update failed: ${updateTemplate.status}`);

    const { data: templateRow } = await supabaseAdminServer
      .from("templates")
      .select("description")
      .eq("id", templateId)
      .single();
    assert(
      templateRow?.description === "Updated by check-admin-catalog-writes",
      "template update did not persist",
    );

    // 3. Admin creates an artist.
    const createArtist = await json<{ artist: { id: string } } | { id: string }>(
      await artistsRoute.POST(
        req(`${base}/api/admin/artists`, adminToken, {
          method: "POST",
          body: JSON.stringify({
            name: "Catalog Writes Check Artist",
            slug: `catalog-writes-check-${Date.now()}`,
            user_id: ARTIST_USER_ID,
          }),
        }),
      ),
    );
    assert(createArtist.status === 200 || createArtist.status === 201, `artist create failed: ${createArtist.status}`);
    const createdArtistBody = createArtist.body as { id?: string; artist?: { id: string } };
    artistId = createdArtistBody.artist?.id ?? createdArtistBody.id ?? null;
    assert(artistId, "artist create response missing id");

    // 4. Admin updates the artist.
    const updateArtist = await (artistItemRoute.PATCH as RouteHandler)(
      req(`${base}/api/admin/artists/${artistId}`, adminToken, {
        method: "PATCH",
        body: JSON.stringify({ bio: "Updated bio" }),
      }),
      { params: Promise.resolve({ id: artistId! }) },
    );
    assert(updateArtist.status === 200, `artist update failed: ${updateArtist.status}`);

    // 5. Admin links the artist to the template.
    const linkArtist = await templateArtistsRoute.PUT(
      req(`${base}/api/admin/template-artists`, adminToken, {
        method: "PUT",
        body: JSON.stringify({
          template_id: templateId,
          relations: [{ artist_id: artistId, is_primary: true, display_order: 0 }],
        }),
      }),
    );
    assert(linkArtist.status === 200, `template-artists link failed: ${linkArtist.status}`);

    const { data: linkRow } = await supabaseAdminServer
      .from("template_artists")
      .select("id")
      .eq("template_id", templateId)
      .eq("artist_id", artistId);
    assert((linkRow ?? []).length === 1, "template_artists link did not persist");

    // 6. The linked user manages their own artist profile.
    const getProfile = await artistProfileRoute.GET(
      req(`${base}/api/user/artist-profile`, artistUserToken),
    );
    assert(getProfile.status === 200, `artist-profile GET failed: ${getProfile.status}`);

    const patchProfile = await artistProfileRoute.PATCH(
      req(`${base}/api/user/artist-profile`, artistUserToken, {
        method: "PATCH",
        body: JSON.stringify({ bio: "Self-updated bio" }),
      }),
    );
    assert(patchProfile.status === 200, `artist-profile PATCH failed: ${patchProfile.status}`);

    const { data: artistRowAfterSelfEdit } = await supabaseAdminServer
      .from("artists")
      .select("bio")
      .eq("id", artistId)
      .single();
    assert(
      artistRowAfterSelfEdit?.bio === "Self-updated bio",
      "self artist-profile update did not persist",
    );

    console.log("Admin catalog writes check passed.");
  } finally {
    if (templateId) {
      await supabaseAdminServer.from("template_artists").delete().eq("template_id", templateId);
      await supabaseAdminServer.from("templates").delete().eq("id", templateId);
    }
    if (artistId) {
      await supabaseAdminServer.from("artists").delete().eq("id", artistId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
