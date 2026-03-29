import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// UUID 형식인지 확인하는 함수
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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

    // UUID 형식이 아니면 샘플 템플릿으로 간주
    if (!isValidUUID(id)) {
      return NextResponse.json({ isTeamTemplate: false });
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
