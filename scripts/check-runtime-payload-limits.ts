/**
 * P2 follow-up: verifies the server-side runtime payload/image limits added
 * to PUT /api/user/templates/{id}/runtime reject oversized or malformed
 * values instead of storing them unbounded.
 */
import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { deleteTemplateStudioTemplate } from "../src/services/server/templateStudioPersistenceService";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";

const ADMIN_ID = 9100701;
const ADMIN_EMAIL = "payload-check-admin@temis.com";
const BUYER_ID = 9100702;
const BUYER_EMAIL = "payload-check-buyer@temis.com";

type RouteContext = { params: Promise<{ id: string }> };
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
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
    { id, created_at: now, updated_at: now, name: `Payload Check ${id}`, email, password: "local-only", role },
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

const base = "http://127.0.0.1/runtime-payload-limits-check";

const main = async () => {
  assertLocalSupabaseUrl();
  await upsertUser(ADMIN_ID, ADMIN_EMAIL, "admin");
  await upsertUser(BUYER_ID, BUYER_EMAIL, "user");

  const [draftRoutes, publishRoutes, runtimeRoutes] = await Promise.all([
    import("../src/app/api/admin/template-studio/templates/[id]/draft/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/publish/route"),
    import("../src/app/api/user/templates/[id]/runtime/route"),
  ]);
  const templateRoutes = await import("../src/app/api/admin/template-studio/templates/route");

  const adminToken = await signJWT({ userId: ADMIN_ID, email: ADMIN_EMAIL, role: "admin" }, "1h");
  const buyerToken = await signJWT({ userId: BUYER_ID, email: BUYER_EMAIL, role: "user" }, "1h");

  let templateId: string | null = null;

  try {
    const created = await json<{ template: { id: string } }>(
      await templateRoutes.POST(
        req(`${base}/api/admin/template-studio/templates`, adminToken, {
          method: "POST",
          body: JSON.stringify({ name: "Payload Limits Check", description: "P2 verification only" }),
        }),
      ),
    );
    assert(created.status === 200, `create failed: ${created.status}`);
    templateId = created.body!.template.id;
    const ctx = { params: Promise.resolve({ id: templateId }) };

    const document = createSampleStudioDocument();
    document.metadata.name = "Payload Limits Check";
    const runtimeValues = createInitialStudioRuntimeValues(document);

    await (draftRoutes.PUT as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/draft`, adminToken, {
        method: "PUT",
        body: JSON.stringify({ document, runtimeValues, isAutosave: true }),
      }),
      ctx,
    );
    const publishResp = await (publishRoutes.POST as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/publish`, adminToken, {
        method: "POST",
        body: JSON.stringify({ document, runtimeValues }),
      }),
      ctx,
    );
    assert(publishResp.status === 200, `publish failed: ${publishResp.status}`);

    await supabaseAdminServer.from("template_access").upsert(
      {
        template_id: templateId,
        user_id: BUYER_ID,
        access_level: "write",
        granted_by: ADMIN_ID,
      },
      { onConflict: "template_id,user_id" },
    );

    const runtimeCtx = { params: Promise.resolve({ id: templateId }) };
    const firstGet = await json<{ runtimeValues: typeof runtimeValues }>(
      await (runtimeRoutes.GET as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken),
        runtimeCtx,
      ),
    );
    assert(firstGet.status === 200, `first GET failed: ${firstGet.status}`);
    const baseValues = firstGet.body!.runtimeValues;
    const firstDayId = document.domains!.timetable!.dayIds[0];

    const putWith = async (mutate: (v: typeof baseValues) => void) => {
      const edited = JSON.parse(JSON.stringify(baseValues)) as typeof baseValues;
      mutate(edited);
      return (runtimeRoutes.PUT as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken, {
          method: "PUT",
          body: JSON.stringify({ runtimeValues: edited }),
        }),
        runtimeCtx,
      );
    };

    // 1. Oversized total payload is rejected. Filler must land somewhere
    // that survives document-contract pruning (arbitrary global input ids
    // the sample document doesn't declare get stripped before the size
    // check runs), so it goes into the day's offline memo field instead.
    const oversized = await putWith((v) => {
      v.timetable.offlineMemoByDay = v.timetable.offlineMemoByDay ?? {};
      v.timetable.offlineMemoByDay[firstDayId] = "y".repeat(6_000_000);
    });
    assert(oversized.status === 400, `expected 400 for oversized payload, got ${oversized.status}`);

    // 2. Overly long entry mainTitle is rejected.
    const longTitle = await putWith((v) => {
      v.timetable.entriesByDay[firstDayId][0].mainTitle = "a".repeat(600);
    });
    assert(longTitle.status === 400, `expected 400 for long mainTitle, got ${longTitle.status}`);

    // 3. A non-image data URI claiming to be an image input is rejected, if
    // the sample document exposes an image input; otherwise this step is a
    // structural no-op (still exercises the general text-length checks above).
    const imageInputId = Object.keys(document.inputs).find(
      (id) => document.inputs[id].type === "image",
    );
    if (imageInputId) {
      const badMime = await putWith((v) => {
        v.global = {
          ...v.global,
          [imageInputId]: "data:text/plain;base64,aGVsbG8=",
        };
      });
      assert(badMime.status === 400, `expected 400 for bad image MIME, got ${badMime.status}`);

      const tooLargeImage = await putWith((v) => {
        v.global = {
          ...v.global,
          [imageInputId]: `data:image/png;base64,${"A".repeat(6_000_000)}`,
        };
      });
      assert(
        tooLargeImage.status === 400,
        `expected 400 for oversized image, got ${tooLargeImage.status}`,
      );
    }

    // 4. A normal, in-bounds edit still succeeds.
    const ok = await putWith((v) => {
      v.timetable.entriesByDay[firstDayId][0].mainTitle = "Normal edit";
    });
    assert(ok.status === 200, `expected 200 for a normal edit, got ${ok.status}`);

    console.log("Runtime payload limits check passed.");
  } finally {
    await supabaseAdminServer.from("template_access").delete().eq("user_id", BUYER_ID);
    if (templateId) {
      await deleteTemplateStudioTemplate(templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
