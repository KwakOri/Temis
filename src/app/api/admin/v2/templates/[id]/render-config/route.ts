import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { Json } from "@/types/supabase";
import {
  v2_createDefaultTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from "@/utils/time-table/template-render-config";
import { NextRequest, NextResponse } from "next/server";

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;

    if (!v2_TEMPLATE_ID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "유효한 템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id")
      .eq("id", id)
      .single();

    if (templateError || !template) {
      if (templateError?.code === "PGRST116") {
        return NextResponse.json(
          { error: "템플릿을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      throw templateError;
    }

    const { data: storedConfig, error: configError } = await supabase
      .from("template_render_configs")
      .select("id, config_version, render_config, created_at, updated_at")
      .eq("template_id", id)
      .single();

    if (configError && configError.code !== "PGRST116") {
      throw configError;
    }

    const hasStoredConfig = Boolean(storedConfig);
    const normalizedConfig = hasStoredConfig
      ? v2_normalizeTemplateRenderConfig(storedConfig?.render_config)
      : v2_createDefaultTemplateRenderConfig();

    return NextResponse.json({
      success: true,
      templateId: id,
      source: hasStoredConfig ? "db" : "default",
      configVersion: storedConfig?.config_version ?? normalizedConfig.version,
      renderConfig: normalizedConfig,
      createdAt: storedConfig?.created_at ?? null,
      updatedAt: storedConfig?.updated_at ?? null,
    });
  } catch (error) {
    console.error("Admin v2 template render config fetch error:", error);
    return NextResponse.json(
      { error: "템플릿 렌더링 설정 조회 중 오류가 발생했습니다." },
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
    const { id } = await params;

    if (!v2_TEMPLATE_ID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "유효한 템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id")
      .eq("id", id)
      .single();

    if (templateError || !template) {
      if (templateError?.code === "PGRST116") {
        return NextResponse.json(
          { error: "템플릿을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      throw templateError;
    }

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

    const normalizedConfig = v2_normalizeTemplateRenderConfig(rawRenderConfig);

    const parsedVersion =
      typeof (body as { configVersion?: unknown }).configVersion === "number"
        ? (body as { configVersion: number }).configVersion
        : normalizedConfig.version;

    const configVersion =
      Number.isFinite(parsedVersion) && parsedVersion > 0
        ? Math.floor(parsedVersion)
        : normalizedConfig.version;

    const { data: upsertedConfig, error: upsertError } = await supabase
      .from("template_render_configs")
      .upsert(
        {
          template_id: id,
          config_version: configVersion,
          render_config: normalizedConfig as unknown as Json,
        },
        {
          onConflict: "template_id",
        }
      )
      .select("id, template_id, config_version, render_config, created_at, updated_at")
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      message: "템플릿 렌더링 설정이 저장되었습니다.",
      templateId: id,
      configVersion: upsertedConfig.config_version,
      renderConfig: v2_normalizeTemplateRenderConfig(upsertedConfig.render_config),
      createdAt: upsertedConfig.created_at,
      updatedAt: upsertedConfig.updated_at,
    });
  } catch (error) {
    console.error("Admin v2 template render config save error:", error);
    return NextResponse.json(
      { error: "템플릿 렌더링 설정 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
