import { NextRequest } from "next/server";

import { GET as templateAccessGET } from "../src/app/api/template-access/route";
import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";

const ADMIN_USER_ID = 9100001;
const APPROVED_USER_ID = 9100002;
const OTHER_USER_ID = 9100003;
const ARTIST_USER_ID = 9100004;

const routeBaseUrl = "http://127.0.0.1/template-entitlement-check";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";

  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error(
      "Refusing to run template entitlement check against a non-local Supabase URL.",
    );
  }
};

const upsertUser = async (id: number, email: string, role: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    {
      id,
      created_at: now,
      updated_at: now,
      name: `Entitlement Check ${id}`,
      email,
      password: "local-only",
      role,
    },
    { onConflict: "id" },
  );

  if (error) throw error;
};

const insertTemplate = async (input: {
  name: string;
  isPublic: boolean;
  status: "draft" | "published" | "archived";
}): Promise<string> => {
  const { data, error } = await supabaseAdminServer
    .from("templates")
    .insert({
      name: input.name,
      description: "Entitlement check fixture.",
      template_engine: "legacy",
      status: input.status,
      is_public: input.isPublic,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to insert template fixture.");
  return (data as { id: string }).id;
};

const grantAccess = async (templateId: string, userId: number) => {
  const { error } = await supabaseAdminServer.from("template_access").insert({
    template_id: templateId,
    user_id: userId,
    granted_by: ADMIN_USER_ID,
    access_level: "read",
  });

  if (error) throw error;
};

const insertArtistLinkedToUser = async (userId: number): Promise<string> => {
  const { data, error } = await supabaseAdminServer
    .from("artists")
    .insert({
      name: `Entitlement Check Artist ${userId}`,
      user_id: userId,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to insert artist fixture.");
  return (data as { id: string }).id;
};

const linkArtistToTemplate = async (templateId: string, artistId: string) => {
  const { error } = await supabaseAdminServer.from("template_artists").insert({
    template_id: templateId,
    artist_id: artistId,
  });

  if (error) throw error;
};

const checkAccess = async (
  templateId: string,
  userId: number,
  token: string,
): Promise<{ hasAccess: boolean; isAdmin: boolean; reason: string }> => {
  const request = new NextRequest(
    `${routeBaseUrl}/api/template-access?templateId=${templateId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const response = await templateAccessGET(request);
  assert(
    response.status === 200,
    `template-access route returned ${response.status} for user ${userId} / template ${templateId}`,
  );
  return response.json();
};

const main = async () => {
  assertLocalSupabaseUrl();

  await upsertUser(ADMIN_USER_ID, "entitlement-admin@temis.com", "admin");
  await upsertUser(APPROVED_USER_ID, "entitlement-approved@temis.com", "user");
  await upsertUser(OTHER_USER_ID, "entitlement-other@temis.com", "user");
  await upsertUser(ARTIST_USER_ID, "entitlement-artist@temis.com", "user");

  const adminToken = await signJWT(
    { userId: ADMIN_USER_ID, email: "entitlement-admin@temis.com", role: "admin" },
    "1h",
  );
  const approvedToken = await signJWT(
    {
      userId: APPROVED_USER_ID,
      email: "entitlement-approved@temis.com",
      role: "user",
    },
    "1h",
  );
  const otherToken = await signJWT(
    { userId: OTHER_USER_ID, email: "entitlement-other@temis.com", role: "user" },
    "1h",
  );
  const artistToken = await signJWT(
    { userId: ARTIST_USER_ID, email: "entitlement-artist@temis.com", role: "user" },
    "1h",
  );

  const templateIds: string[] = [];
  let artistId: string | null = null;

  try {
    const generalTemplateId = await insertTemplate({
      name: "Entitlement Check General Sale",
      isPublic: true,
      status: "published",
    });
    templateIds.push(generalTemplateId);
    await grantAccess(generalTemplateId, APPROVED_USER_ID);

    const privateTemplateId = await insertTemplate({
      name: "Entitlement Check Private Custom",
      isPublic: false,
      status: "published",
    });
    templateIds.push(privateTemplateId);
    await grantAccess(privateTemplateId, APPROVED_USER_ID);

    const draftTemplateId = await insertTemplate({
      name: "Entitlement Check Draft",
      isPublic: true,
      status: "draft",
    });
    templateIds.push(draftTemplateId);
    await grantAccess(draftTemplateId, APPROVED_USER_ID);

    const archivedTemplateId = await insertTemplate({
      name: "Entitlement Check Archived",
      isPublic: true,
      status: "archived",
    });
    templateIds.push(archivedTemplateId);
    await grantAccess(archivedTemplateId, APPROVED_USER_ID);

    const artistTemplateId = await insertTemplate({
      name: "Entitlement Check Artist Owned",
      isPublic: false,
      status: "published",
    });
    templateIds.push(artistTemplateId);
    artistId = await insertArtistLinkedToUser(ARTIST_USER_ID);
    await linkArtistToTemplate(artistTemplateId, artistId);

    // 1. 일반 판매 템플릿 + 미구매 사용자: 거부
    const generalOther = await checkAccess(generalTemplateId, OTHER_USER_ID, otherToken);
    assert(
      generalOther.hasAccess === false,
      "General-sale template must deny a user without a grant.",
    );

    // 2. 일반 판매 템플릿 + 승인된 사용자: 허용
    const generalApproved = await checkAccess(
      generalTemplateId,
      APPROVED_USER_ID,
      approvedToken,
    );
    assert(
      generalApproved.hasAccess === true,
      "General-sale template must allow a user with a template_access grant.",
    );

    // 3. 개인 맞춤 템플릿 + 지정 사용자: 허용
    const privateApproved = await checkAccess(
      privateTemplateId,
      APPROVED_USER_ID,
      approvedToken,
    );
    assert(
      privateApproved.hasAccess === true,
      "Private/custom template must allow the specifically granted user.",
    );

    // 4. 개인 맞춤 템플릿 + 타 사용자: 거부
    const privateOther = await checkAccess(privateTemplateId, OTHER_USER_ID, otherToken);
    assert(
      privateOther.hasAccess === false,
      "Private/custom template must deny a different user even though is_public is false.",
    );

    // 5. 연결 작가와 관리자: 허용
    const artistAccess = await checkAccess(
      artistTemplateId,
      ARTIST_USER_ID,
      artistToken,
    );
    assert(
      artistAccess.hasAccess === true,
      "Template must allow a user linked via template_artists even without a template_access row.",
    );

    const adminAccess = await checkAccess(generalTemplateId, ADMIN_USER_ID, adminToken);
    assert(
      adminAccess.hasAccess === true && adminAccess.isAdmin === true,
      "Admins must always have access regardless of grants.",
    );

    // 6. draft/archived 템플릿: 일반 사용자 거부 (등록된 grant가 있어도 거부되어야 함)
    const draftAccess = await checkAccess(draftTemplateId, APPROVED_USER_ID, approvedToken);
    assert(
      draftAccess.hasAccess === false,
      "Draft-status template must deny access even with an existing template_access grant.",
    );

    const archivedAccess = await checkAccess(
      archivedTemplateId,
      APPROVED_USER_ID,
      approvedToken,
    );
    assert(
      archivedAccess.hasAccess === false,
      "Archived-status template must deny access even with an existing template_access grant.",
    );

    console.log("Template entitlement check passed.");
  } finally {
    if (templateIds.length > 0) {
      await supabaseAdminServer.from("templates").delete().in("id", templateIds);
    }
    if (artistId) {
      await supabaseAdminServer.from("artists").delete().eq("id", artistId);
    }
    await supabaseAdminServer
      .from("users")
      .delete()
      .in("id", [ADMIN_USER_ID, APPROVED_USER_ID, OTHER_USER_ID, ARTIST_USER_ID]);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
