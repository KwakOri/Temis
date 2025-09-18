import { requireAuth } from "@/lib/auth/middleware";
import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

// 특정 팀의 특정 주차 시간표 조회 (모든 멤버)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; weekStartDate: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { teamId, weekStartDate } = await params;

    if (!teamId || !weekStartDate) {
      return NextResponse.json(
        { error: "팀 ID와 주 시작일이 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자가 해당 팀의 멤버인지 확인할 수도 있지만,
    // 일단 모든 인증된 사용자가 볼 수 있도록 설정
    const schedules = await teamScheduleService.getTeamSchedules(teamId, weekStartDate);

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching team schedules:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 시간표를 가져오는데 실패했습니다."
      },
      { status: 500 }
    );
  }
}