import { supabase } from "@/lib/supabase";
import {
  v2_createEmptyTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from "@/utils/v2/template-render-config";
import { NextRequest, NextResponse } from "next/server";

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;

    if (!v2_TEMPLATE_ID_REGEX.test(templateId)) {
      return NextResponse.json(
        { error: "유효한 템플릿 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const { data: template, error: templateError } = await supabase
      .from("v2_templates")
      .select("id")
      .eq("id", templateId)
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
      .from("v2_template_render_configs")
      .select("config_version, render_config, created_at, updated_at")
      .eq("template_id", templateId)
      .single();

    if (configError && configError.code !== "PGRST116") {
      throw configError;
    }

    const hasStoredConfig = Boolean(storedConfig);
    const normalizedConfig = hasStoredConfig
      ? v2_normalizeTemplateRenderConfig(storedConfig?.render_config)
      : v2_createEmptyTemplateRenderConfig();

    return NextResponse.json({
      success: true,
      templateId,
      source: hasStoredConfig ? "db" : "empty",
      configVersion: storedConfig?.config_version ?? normalizedConfig.version,
      renderConfig: normalizedConfig,
      createdAt: storedConfig?.created_at ?? null,
      updatedAt: storedConfig?.updated_at ?? null,
    });
  } catch (error) {
    console.error("V2 template render config fetch error:", error);
    return NextResponse.json(
      { error: "템플릿 렌더링 설정 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
