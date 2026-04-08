import { optionalAuth } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TemplateService } from "@/lib/templates";
import {
  v2_createDefaultTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from "@/utils/time-table/template-render-config";
import { NextRequest, NextResponse } from "next/server";

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
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
      .from("templates")
      .select("id, is_public")
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

    const { user } = await optionalAuth(request);
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];
    const isAdminByRole = user?.role === "admin";
    const isAdminByEmail = Boolean(user?.email && adminEmails.includes(user.email));
    const isAdmin = isAdminByRole || isAdminByEmail;

    let hasAccess = template.is_public || isAdmin;

    if (!hasAccess && user?.userId) {
      hasAccess = await TemplateService.hasAccess(templateId, String(user.userId));
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "템플릿 접근 권한이 없습니다." },
        { status: 403 }
      );
    }

    const { data: storedConfig, error: configError } = await supabase
      .from("template_render_configs")
      .select("config_version, render_config, created_at, updated_at")
      .eq("template_id", templateId)
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
      templateId,
      source: hasStoredConfig ? "db" : "default",
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
