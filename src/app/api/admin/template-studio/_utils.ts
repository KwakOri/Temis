import { requireAdmin } from "@/lib/auth/middleware";
import { resolveAdminActorUserId } from "@/lib/auth/resolve-admin-actor-user-id";
import { NextRequest, NextResponse } from "next/server";

const TEMPLATE_STUDIO_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TemplateStudioAdminActorResult =
  | {
      ok: true;
      userId: number;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export const parseTemplateStudioTemplateId = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<string | null> => {
  const { id } = await params;
  return TEMPLATE_STUDIO_TEMPLATE_ID_REGEX.test(id) ? id : null;
};

export const requireTemplateStudioAdminActor = async (
  request: NextRequest,
): Promise<TemplateStudioAdminActorResult> => {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return {
      ok: false,
      response: adminCheck,
    };
  }

  const resolvedActor = await resolveAdminActorUserId(adminCheck.user);
  if (!resolvedActor.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            resolvedActor.reason === "invalid-token-user-id"
              ? "유효한 사용자 정보가 필요합니다."
              : "세션 사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.",
        },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true,
    userId: resolvedActor.userId,
  };
};

export const templateStudioBadTemplateIdResponse = () =>
  NextResponse.json(
    { error: "유효한 Template Studio 템플릿 ID가 필요합니다." },
    { status: 400 },
  );

export const templateStudioTemplateNotFoundResponse = () =>
  NextResponse.json(
    { error: "Template Studio 템플릿을 찾을 수 없습니다." },
    { status: 404 },
  );
