import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');
    const weekStartDate = searchParams.get('week_start_date');

    if (!teamId || !weekStartDate) {
      return NextResponse.json(
        { error: "team_id와 week_start_date는 필수 파라미터입니다." },
        { status: 400 }
      );
    }

    const schedules = await teamScheduleService.getTeamSchedules(teamId, weekStartDate);
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching team schedules:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "팀 시간표를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}