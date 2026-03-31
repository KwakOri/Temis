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
    // 1) 사용자가 직접 권한을 부여받은 템플릿 조회
    const { data: directAccessRows, error: directAccessError } = await supabase
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

    if (directAccessError) {
      console.error("User templates fetch error:", directAccessError);
      return NextResponse.json(
        { error: "템플릿 목록을 가져오는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 2) 작가 연결을 통해 접근 가능한 템플릿 조회
    const { data: artistLinkedRows, error: artistLinkedError } = await supabase
      .from("template_artists")
      .select(`
        id,
        template_id,
        created_at,
        templates:template_id (
          id,
          name,
          description,
          thumbnail_url,
          is_public,
          created_at
        ),
        artists!inner(user_id)
      `)
      .eq("artists.user_id", Number(user.userId))
      .order("created_at", { ascending: false });

    if (artistLinkedError) {
      console.error("Artist-linked templates fetch error:", artistLinkedError);
      return NextResponse.json(
        { error: "템플릿 목록을 가져오는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 3) 직접 권한 + 작가 권한을 병합 (template_id 기준 중복 제거)
    const mergedByTemplateId = new Map<string, Record<string, unknown>>();

    for (const row of directAccessRows || []) {
      if (!row.templates) {
        continue;
      }
      mergedByTemplateId.set(row.templates.id, row as unknown as Record<string, unknown>);
    }

    for (const row of artistLinkedRows || []) {
      const template = row.templates;
      if (!template || mergedByTemplateId.has(template.id)) {
        continue;
      }

      mergedByTemplateId.set(template.id, {
        id: `artist-${row.id}`,
        access_level: "write",
        granted_at: row.created_at,
        templates: template,
        template_plan: null,
      });
    }

    const allTemplates = Array.from(mergedByTemplateId.values());

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
