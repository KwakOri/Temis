import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { v2_runAdminFigmaImportConfig } from "@/lib/v2/admin-figma-import";

export const runtime = "nodejs";

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const v2_toTrimmedString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const v2_isLayoutModeOverride = (
  value: unknown
): value is "auto" | "grid3x3" | "flex4x2" | "free" => {
  return (
    value === "auto" ||
    value === "grid3x3" ||
    value === "flex4x2" ||
    value === "free"
  );
};

const v2_parseWithAssets = (body: Record<string, unknown>): boolean => {
  const assetImportMode = body.assetImportMode;
  if (assetImportMode === "with-assets") return true;
  if (assetImportMode === "without-assets") return false;
  return body.withAssets === true;
};

const v2_parseTemplateId = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<string | null> => {
  const { id } = await params;
  return v2_TEMPLATE_ID_REGEX.test(id) ? id : null;
};

const v2_assertTemplateExists = async (templateId: string) => {
  const { data: template, error: templateError } = await supabaseAdminServer
    .from("v2_templates")
    .select("id")
    .eq("id", templateId)
    .maybeSingle();

  if (templateError) {
    throw templateError;
  }

  return Boolean(template);
};

export async function POST(
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

    const templateExists = await v2_assertTemplateExists(templateId);
    if (!templateExists) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const rootFigmaUrl = v2_toTrimmedString(body?.rootFigmaUrl);
    const cardComponentSetUrl = v2_toTrimmedString(body?.cardComponentSetUrl);
    const layoutModeOverride = v2_isLayoutModeOverride(body?.layoutModeOverride)
      ? body.layoutModeOverride
      : "auto";
    const withAssets = v2_parseWithAssets(body ?? {});

    if (!rootFigmaUrl) {
      return NextResponse.json(
        { error: "rootFigmaUrl은 필수입니다." },
        { status: 400 }
      );
    }

    const result = await v2_runAdminFigmaImportConfig({
      templateId,
      rootFigmaUrl,
      cardComponentSetUrl: cardComponentSetUrl || undefined,
      layoutModeOverride,
      withAssets,
    });

    return NextResponse.json({
      success: true,
      import: result,
    });
  } catch (error) {
    console.error("Admin v2 template figma import error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Figma import 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
