import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자의 템플릿 접근 권한 목록 조회
    const { data: templateAccess, error } = await supabase
      .from("template_access")
      .select(`
        id,
        template_id,
        user_id,
        access_level,
        granted_at,
        granted_by,
        templates:template_id (
          id,
          name,
          description,
          is_public,
          created_at
        )
      `)
      .eq("user_id", Number(userId))
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("User templates fetch error:", error);
      return NextResponse.json(
        { error: "사용자 템플릿 목록 조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: templateAccess || [],
    });
  } catch (error) {
    console.error("User templates fetch error:", error);
    return NextResponse.json(
      { error: "사용자 템플릿 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}