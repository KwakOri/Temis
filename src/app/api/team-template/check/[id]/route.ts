import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // team_templates 테이블에서 해당 ID가 존재하는지 확인
    const { data, error } = await supabase
      .from("team_templates")
      .select("id")
      .eq("id", id)
      .single();

    if (error) {
      // PGRST116: 데이터를 찾을 수 없음 (존재하지 않는 ID)
      if (error.code === "PGRST116") {
        return NextResponse.json({ isTeamTemplate: false });
      }
      throw error;
    }

    // 데이터가 존재하면 팀 템플릿
    return NextResponse.json({ isTeamTemplate: !!data });
  } catch (error) {
    console.error("Error checking team template:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check team template",
        isTeamTemplate: false,
      },
      { status: 500 }
    );
  }
}
