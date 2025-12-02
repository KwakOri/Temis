import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 전체 팀 템플릿 개수 조회
    const { count: totalCount, error: countError } = await supabase
      .from("team_templates")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Supabase count error:", countError);
      throw countError;
    }

    // 팀 템플릿 조회 + 연결된 팀 정보 (JOIN)
    const { data: teamTemplates, error } = await supabase
      .from("team_templates")
      .select(
        `
        *,
        relations_team_template_and_team (
          id,
          team_id,
          teams (
            id,
            name,
            description
          )
        )
      `
      )
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

    // 연결 상태 추가
    const teamTemplatesWithStatus = (teamTemplates || []).map((template) => ({
      ...template,
      isConnected:
        template.relations_team_template_and_team &&
        template.relations_team_template_and_team.length > 0,
    }));

    return NextResponse.json({
      success: true,
      teamTemplates: teamTemplatesWithStatus,
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
      },
    });
  } catch (error) {
    console.error("Admin team templates fetch error:", error);
    return NextResponse.json(
      { error: "팀 템플릿 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const { name, descriptions } = body;

    // 입력 검증
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "템플릿 이름은 필수입니다." },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "템플릿 이름은 100자를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    if (descriptions && descriptions.length > 500) {
      return NextResponse.json(
        { error: "설명은 500자를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // 중복 이름 검사
    const { data: existingTemplate, error: checkError } = await supabase
      .from("team_templates")
      .select("id")
      .eq("name", name.trim())
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Team template name check error:", checkError);
      throw checkError;
    }

    if (existingTemplate) {
      return NextResponse.json(
        { error: "이미 존재하는 팀 템플릿 이름입니다." },
        { status: 409 }
      );
    }

    // 새 팀 템플릿 생성
    const templateData: TablesInsert<"team_templates"> = {
      name: name.trim(),
      descriptions: descriptions?.trim() || null,
    };

    const { data: newTemplate, error: insertError } = await supabase
      .from("team_templates")
      .insert(templateData)
      .select()
      .single();

    if (insertError) {
      console.error("Team template creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "팀 템플릿이 성공적으로 생성되었습니다.",
        teamTemplate: newTemplate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Team template creation error:", error);
    return NextResponse.json(
      { error: "팀 템플릿 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
