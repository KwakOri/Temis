import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { scheduleId } = await params;

    await teamScheduleService.deleteTeamSchedule(scheduleId, userId);
    return NextResponse.json({ message: "팀 시간표가 삭제되었습니다." });
  } catch (error) {
    console.error("Error deleting team schedule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "팀 시간표 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}