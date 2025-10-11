import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const teams = await teamScheduleService.getUserTeams(userId);
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching user teams:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "팀 목록을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}