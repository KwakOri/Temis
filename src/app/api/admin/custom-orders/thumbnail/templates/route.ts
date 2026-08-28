import {
  listThumbnailOrderTemplateCandidates,
  ThumbnailOrderApiError,
} from "@/lib/custom-thumbnail-order";
import { requireAdmin } from "@/lib/auth/middleware";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const result = await listThumbnailOrderTemplateCandidates();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ThumbnailOrderApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Admin thumbnail result template candidates error:", error);
    return NextResponse.json(
      { error: "완료 처리 가능한 썸네일 템플릿을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
