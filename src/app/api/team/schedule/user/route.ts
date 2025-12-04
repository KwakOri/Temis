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
    const teamId = searchParams.get('team_id'); // Optional for permission check
    const weekStartDate = searchParams.get('week_start_date');

    if (!weekStartDate) {
      return NextResponse.json(
        { error: "week_start_date는 필수 파라미터입니다." },
        { status: 400 }
      );
    }

    const schedule = await teamScheduleService.getUserTeamSchedule(
      userId,
      weekStartDate,
      teamId || undefined
    );

    if (!schedule) {
      return NextResponse.json({ error: "시간표를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching user team schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "사용자 팀 시간표를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}