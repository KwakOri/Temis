import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamService } from "@/services/server/teamService";
import { NextRequest, NextResponse } from "next/server";

// Search users
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // TODO: Add admin permission check

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "검색어를 입력해주세요." },
        { status: 400 }
      );
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        { error: "검색어는 최소 2글자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const users = await teamService.searchUsers(query.trim());
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "사용자 검색에 실패했습니다."
      },
      { status: 500 }
    );
  }
}