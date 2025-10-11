import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    // 사용자가 접근 권한을 가진 템플릿 목록 조회
    const { data: userTemplates, error } = await supabase
      .from("template_access")
      .select(`
        id,
        access_level,
        granted_at,
        templates:template_id (
          id,
          name,
          description,
          thumbnail_url,
          is_public,
          created_at
        ),
        template_plan:template_plan_id (
          id,
          plan,
          price
        )
      `)
      .eq("user_id", Number(user.userId))
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("User templates fetch error:", error);
      return NextResponse.json(
        { error: "템플릿 목록을 가져오는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 접근 권한이 있는 템플릿만 반환
    const allTemplates = userTemplates || [];

    return NextResponse.json({
      success: true,
      templates: allTemplates,
      total: allTemplates.length
    });
  } catch (error) {
    console.error("User templates API error:", error);
    return NextResponse.json(
      { error: "템플릿 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}