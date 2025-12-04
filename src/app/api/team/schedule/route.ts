import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const data = await request.json();

    const scheduleData = {
      user_id: userId,
      week_start_date: data.week_start_date,
      schedule_data: data.schedule_data,
      team_id: data.team_id, // Optional for permission check
    };

    const schedule = await teamScheduleService.createTeamSchedule(scheduleData);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error creating team schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "팀 시간표 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}