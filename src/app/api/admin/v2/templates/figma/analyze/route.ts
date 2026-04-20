import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { v2_runAdminFigmaAnalyze } from "@/lib/v2/admin-figma-import";

export const runtime = "nodejs";

const v2_toTrimmedString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
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

    if (!rootFigmaUrl) {
      return NextResponse.json(
        { error: "rootFigmaUrl은 필수입니다." },
        { status: 400 }
      );
    }

    const result = await v2_runAdminFigmaAnalyze({
      rootFigmaUrl,
      cardComponentSetUrl: cardComponentSetUrl || undefined,
      templateName,
    });

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (error) {
    console.error("Admin v2 figma analyze error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Figma 분석 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
