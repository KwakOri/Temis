import { teamScheduleService } from "@/services/server/teamScheduleService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get("user_ids");
    const weekStartDate = searchParams.get("week_start_date");

    if (!userIdsParam || !weekStartDate) {
      return NextResponse.json(
        { error: "user_ids와 week_start_date는 필수 파라미터입니다." },
        { status: 400 }
      );
    }

    // Parse user_ids from comma-separated string to number array
    const userIds = userIdsParam
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "유효한 user_ids가 필요합니다." },
        { status: 400 }
      );
    }

    const schedules =
      await teamScheduleService.getMultipleUserSchedules(
        userIds,
        weekStartDate
      );

    return NextResponse.json({
      success: true,
      schedules,
      userIds,
      weekStartDate,
    });
  } catch (error) {
    console.error("Error fetching batch team schedules:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "팀 시간표를 가져오는데 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
