import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

// 팀 연결
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id: teamTemplateId } = await params;
    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "팀 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 팀 템플릿 존재 확인
    const { data: teamTemplate, error: templateError } = await supabase
      .from("team_templates")
      .select("id")
      .eq("id", teamTemplateId)
      .single();

    if (templateError || !teamTemplate) {
      return NextResponse.json(
        { error: "팀 템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 팀 존재 확인
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "팀을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 연결되어 있는지 확인
    const { data: existingRelation, error: checkError } = await supabase
      .from("relations_team_template_and_team")
      .select("id")
      .eq("team_template_id", teamTemplateId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (checkError) {
      console.error("Relation check error:", checkError);
      throw checkError;
    }

    if (existingRelation) {
      return NextResponse.json(
        { error: "이미 연결된 팀입니다." },
        { status: 409 }
      );
    }

    // 연결 생성
    const relationData: TablesInsert<"relations_team_template_and_team"> = {
      team_template_id: teamTemplateId,
      team_id: teamId,
    };

    const { data: newRelation, error: insertError } = await supabase
      .from("relations_team_template_and_team")
      .insert(relationData)
      .select()
      .single();

    if (insertError) {
      console.error("Relation creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "팀이 성공적으로 연결되었습니다.",
        relation: newRelation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Team connection error:", error);
    return NextResponse.json(
      { error: "팀 연결 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 팀 연결 해제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id: teamTemplateId } = await params;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "팀 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 연결 삭제
    const { error: deleteError } = await supabase
      .from("relations_team_template_and_team")
      .delete()
      .eq("team_template_id", teamTemplateId)
      .eq("team_id", teamId);

    if (deleteError) {
      console.error("Relation deletion error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "팀 연결이 성공적으로 해제되었습니다.",
    });
  } catch (error) {
    console.error("Team disconnection error:", error);
    return NextResponse.json(
      { error: "팀 연결 해제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
