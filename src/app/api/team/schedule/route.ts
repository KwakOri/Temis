import { getCurrentUserId } from "@/lib/auth";
import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const data = await request.json();

    // 사용자 ID 설정
    data.user_id = userId;

    const schedule = await teamScheduleService.createTeamSchedule(data);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error creating team schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "팀 시간표 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}