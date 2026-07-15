import { requireAuth } from "@/lib/auth";
import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
import { getTemplateUseHref } from "@/utils/template-links";
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
          template_engine,
          status,
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
          template_engine,
          status,
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

    // draft/archived 템플릿은 일반 사용자 목록에서 제외한다.
    const withUseHref = <T extends { id: string; template_engine: string | null }>(
      templates: T
    ) => ({
      ...templates,
      use_href: getTemplateUseHref(templates.id, templates.template_engine),
    });

    // 3) 구매 템플릿 / 작업 템플릿 분리
    const artistTemplates = (artistLinkedRows || [])
      .filter((row) => Boolean(row.templates) && row.templates.status === "published")
      .map((row) => ({
        id: `artist-${row.id}`,
        access_level: "write" as const,
        granted_at: row.created_at,
        templates: withUseHref(row.templates),
        template_plan: null,
      }));

    // 같은 템플릿이 구매/작업에 모두 걸린 경우 작업 템플릿으로만 분류
    const artistTemplateIds = new Set(
      artistTemplates.map((row) => row.templates.id)
    );

    const purchaseTemplates = (directAccessRows || [])
      .filter(
        (row) =>
          Boolean(row.templates) &&
          row.templates.status === "published" &&
          !artistTemplateIds.has(row.templates!.id)
      )
      .map((row) => ({
        ...row,
        templates: withUseHref(row.templates!),
      }));

    return NextResponse.json({
      success: true,
      purchase_templates: purchaseTemplates,
      artist_templates: artistTemplates,
      total_purchase: purchaseTemplates.length,
      total_artist: artistTemplates.length,
      total: purchaseTemplates.length + artistTemplates.length,
    });
  } catch (error) {
    console.error("User templates API error:", error);
    return NextResponse.json(
      { error: "템플릿 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
