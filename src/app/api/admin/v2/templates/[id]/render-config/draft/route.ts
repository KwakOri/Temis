import { requireAdmin } from "@/lib/auth/middleware";
import { resolveAdminActorUserId } from "@/lib/auth/resolve-admin-actor-user-id";
import { supabase } from "@/lib/supabase";
import { Json } from "@/types/supabase";
import {
  v2_createEmptyTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from "@/utils/time-table/template-render-config";
import { NextRequest, NextResponse } from "next/server";

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const v2_parseTemplateId = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<string | null> => {
  const { id } = await params;
  if (!v2_TEMPLATE_ID_REGEX.test(id)) {
    return null;
  }
  return id;
};

const v2_assertTemplateExists = async (templateId: string) => {
  const { data: template, error: templateError } = await supabase
    .from("v2_templates")
    .select("id")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    if (templateError?.code === "PGRST116") {
      return null;
    }
    throw templateError;
  }
  return template;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const templateId = await v2_parseTemplateId({ params });
    if (!templateId) {
      return NextResponse.json(
        { error: "유효한 템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const template = await v2_assertTemplateExists(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const resolvedActor = await resolveAdminActorUserId(adminCheck.user);
    if (!resolvedActor.ok) {
      return NextResponse.json(
        {
          error:
            resolvedActor.reason === "invalid-token-user-id"
              ? "유효한 사용자 정보가 필요합니다."
              : "세션 사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.",
        },
        { status: 401 }
      );
    }
    const userId = resolvedActor.userId;

    const { data: draft, error: draftError } = await supabase
      .from("v2_template_render_config_drafts")
      .select(
        "id, config_version, render_config, base_revision_no, is_autosave, created_at, updated_at"
      )
      .eq("template_id", templateId)
      .eq("user_id", userId)
      .single();

    if (draftError && draftError.code !== "PGRST116") {
      throw draftError;
    }

    if (!draft) {
      return NextResponse.json({
        success: true,
        templateId,
        hasDraft: false,
        draft: null,
      });
    }

    return NextResponse.json({
      success: true,
      templateId,
      hasDraft: true,
      draft: {
        id: draft.id,
        configVersion: draft.config_version,
        renderConfig: v2_normalizeTemplateRenderConfig(draft.render_config),
        baseRevisionNo: draft.base_revision_no ?? null,
        isAutosave: Boolean(draft.is_autosave),
        createdAt: draft.created_at,
        updatedAt: draft.updated_at,
      },
    });
  } catch (error) {
    console.error("Admin v2 template render config draft fetch error:", error);
    return NextResponse.json(
      { error: "템플릿 렌더링 draft 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const templateId = await v2_parseTemplateId({ params });
    if (!templateId) {
      return NextResponse.json(
        { error: "유효한 템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const template = await v2_assertTemplateExists(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const resolvedActor = await resolveAdminActorUserId(adminCheck.user);
    if (!resolvedActor.ok) {
      return NextResponse.json(
        {
          error:
            resolvedActor.reason === "invalid-token-user-id"
              ? "유효한 사용자 정보가 필요합니다."
              : "세션 사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.",
        },
        { status: 401 }
      );
    }
    const userId = resolvedActor.userId;

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "요청 본문이 필요합니다." },
        { status: 400 }
      );
    }

    const rawRenderConfig =
      "renderConfig" in body
        ? (body as { renderConfig?: unknown }).renderConfig
        : body;

    const normalizedConfig = v2_normalizeTemplateRenderConfig(
      rawRenderConfig ?? v2_createEmptyTemplateRenderConfig()
    );

    const parsedVersion =
      typeof (body as { configVersion?: unknown }).configVersion === "number"
        ? (body as { configVersion: number }).configVersion
        : normalizedConfig.version;
    const configVersion =
      Number.isFinite(parsedVersion) && parsedVersion > 0
        ? Math.floor(parsedVersion)
        : normalizedConfig.version;

    const baseRevisionCandidate = (body as { baseRevisionNo?: unknown }).baseRevisionNo;
    const baseRevisionNo =
      typeof baseRevisionCandidate === "number" &&
      Number.isFinite(baseRevisionCandidate) &&
      baseRevisionCandidate > 0
        ? Math.floor(baseRevisionCandidate)
        : null;
    const isAutosave = (body as { isAutosave?: unknown }).isAutosave !== false;

    const { data: upsertedDraft, error: upsertError } = await supabase
      .from("v2_template_render_config_drafts")
      .upsert(
        {
          template_id: templateId,
          user_id: userId,
          config_version: configVersion,
          render_config: normalizedConfig as unknown as Json,
          base_revision_no: baseRevisionNo,
          is_autosave: isAutosave,
        },
        {
          onConflict: "template_id,user_id",
        }
      )
      .select(
        "id, config_version, render_config, base_revision_no, is_autosave, created_at, updated_at"
      )
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      templateId,
      hasDraft: true,
      draft: {
        id: upsertedDraft.id,
        configVersion: upsertedDraft.config_version,
        renderConfig: v2_normalizeTemplateRenderConfig(upsertedDraft.render_config),
        baseRevisionNo: upsertedDraft.base_revision_no ?? null,
        isAutosave: Boolean(upsertedDraft.is_autosave),
        createdAt: upsertedDraft.created_at,
        updatedAt: upsertedDraft.updated_at,
      },
    });
  } catch (error) {
    console.error("Admin v2 template render config draft save error:", error);
    return NextResponse.json(
      { error: "템플릿 렌더링 draft 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
