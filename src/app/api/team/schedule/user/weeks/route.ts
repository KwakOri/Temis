import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/team/schedule/user/weeks
 * 사용자의 모든 시간표 주차 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 사용자의 모든 시간표 주차 조회
    const weeks = await teamScheduleService.getUserScheduleWeeks(userId);

    return NextResponse.json({ weeks });
  } catch (error) {
    console.error("Error in GET /api/team/schedule/user/weeks:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사용자 시간표 주차 목록을 가져올 수 없습니다.",
      },
      { status: 500 }
    );
  }
}
