import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { v2_runAdminFigmaImport } from "@/lib/v2/admin-figma-import";

export const runtime = "nodejs";

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
  return body.withAssets !== false;
};

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const rootFigmaUrl = v2_toTrimmedString(body?.rootFigmaUrl);
    const cardComponentSetUrl = v2_toTrimmedString(body?.cardComponentSetUrl);
    const templateName = v2_toTrimmedString(body?.templateName) || undefined;
    const templateDescription =
      v2_toTrimmedString(body?.templateDescription) || undefined;
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
    if (!templateName) {
      return NextResponse.json(
        { error: "템플릿 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const result = await v2_runAdminFigmaImport({
      rootFigmaUrl,
      cardComponentSetUrl: cardComponentSetUrl || undefined,
      templateName,
      templateDescription,
      layoutModeOverride,
      withAssets,
    });

    return NextResponse.json({
      success: true,
      import: result,
    });
  } catch (error) {
    console.error("Admin v2 figma import error:", error);
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
