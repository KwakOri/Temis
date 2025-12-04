import { optionalAuth } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { user } = await optionalAuth(request);

    if (!user) {
      return NextResponse.json(
        { hasAccess: false, reason: "no_auth" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // 관리자 체크
    if (user.role === "admin") {
      return NextResponse.json({
        hasAccess: true,
        isAdmin: true,
        reason: "admin_access",
      });
    }

    // 1. relations_team_template_and_team 테이블에서 template_id로 team_id 찾기
    const { data: relations, error: relationsError } = await supabase
      .from("relations_team_template_and_team")
      .select("team_id")
      .eq("team_template_id", templateId);

    if (relationsError) {
      console.error("Error fetching team relations:", relationsError);
      throw relationsError;
    }

    // 연결된 팀이 없으면 접근 불가
    if (!relations || relations.length === 0) {
      return NextResponse.json({
        hasAccess: false,
        isAdmin: false,
        reason: "no_team_connected",
      });
    }

    // 2. team_members 테이블에서 현재 유저가 해당 팀의 멤버인지 확인
    const teamIds = relations.map((r) => r.team_id);

    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("id")
      .in("team_id", teamIds)
      .eq("user_id", Number(user.userId))
      .limit(1);

    if (membershipError) {
      console.error("Error checking team membership:", membershipError);
      throw membershipError;
    }

    // 팀 멤버이면 접근 허용
    if (membership && membership.length > 0) {
      return NextResponse.json({
        hasAccess: true,
        isAdmin: false,
        reason: "team_member_access",
      });
    }

    // 팀 멤버가 아니면 접근 불가
    return NextResponse.json({
      hasAccess: false,
      isAdmin: false,
      reason: "not_team_member",
    });
  } catch (error) {
    console.error("Error checking team template access:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check template access",
      },
      { status: 500 }
    );
  }
}
