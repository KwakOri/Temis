import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamService } from "@/services/server/teamService";
import { NextRequest, NextResponse } from "next/server";

// Get team members
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // TODO: Add admin permission check

    const members = await teamService.getTeamMembers(params.teamId);
    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 멤버 목록을 가져오는데 실패했습니다."
      },
      { status: 500 }
    );
  }
}

// Add team member
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // TODO: Add admin permission check

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || typeof user_id !== "number") {
      return NextResponse.json(
        { error: "사용자 ID가 유효하지 않습니다." },
        { status: 400 }
      );
    }

    if (!role || !["manager", "member"].includes(role)) {
      return NextResponse.json(
        { error: "역할이 유효하지 않습니다." },
        { status: 400 }
      );
    }

    const member = await teamService.addTeamMember({
      team_id: params.teamId,
      user_id,
      role,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error adding team member:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 멤버 추가에 실패했습니다."
      },
      { status: 500 }
    );
  }
}