import { getCurrentUserId } from "@/lib/auth";
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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!teamId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "team_id, start_date, end_date는 필수 파라미터입니다." },
        { status: 400 }
      );
    }

    const schedules = await teamScheduleService.getTeamSchedulesByDateRange(
      teamId,
      startDate,
      endDate,
      userId
    );
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching team schedules by date range:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "팀 시간표 범위 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}