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

    // 공개 템플릿도 포함하여 조회 (중복 제거)
    const { data: publicTemplates, error: publicError } = await supabase
      .from("templates")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (publicError) {
      console.error("Public templates fetch error:", publicError);
    }

    // 사용자 전용 템플릿과 공개 템플릿 합치기 (중복 제거)
    const userTemplateIds = userTemplates?.map(ut => ut.templates?.id).filter(Boolean) || [];
    const additionalPublicTemplates = publicTemplates?.filter(pt => 
      !userTemplateIds.includes(pt.id)
    ).map(pt => ({
      id: Date.now() + Math.random(), // 임시 ID
      access_level: 'read' as const,
      granted_at: null,
      templates: pt
    })) || [];

    const allTemplates = [
      ...(userTemplates || []),
      ...additionalPublicTemplates
    ];

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