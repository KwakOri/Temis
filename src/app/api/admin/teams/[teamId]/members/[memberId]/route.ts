import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamService } from "@/services/server/teamService";
import { NextRequest, NextResponse } from "next/server";

// Update team member role
export async function PUT(
  request: NextRequest,
  { params }: { params: { teamId: string; memberId: string } }
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
    const { role } = body;

    if (!role || !["manager", "member"].includes(role)) {
      return NextResponse.json(
        { error: "역할이 유효하지 않습니다." },
        { status: 400 }
      );
    }

    const member = await teamService.updateTeamMemberRole(params.memberId, role);
    return NextResponse.json(member);
  } catch (error) {
    console.error("Error updating team member role:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 멤버 역할 변경에 실패했습니다."
      },
      { status: 500 }
    );
  }
}

// Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string; memberId: string } }
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

    const success = await teamService.removeTeamMember(params.memberId);
    if (success) {
      return NextResponse.json({ message: "팀 멤버가 성공적으로 제거되었습니다." });
    } else {
      return NextResponse.json(
        { error: "팀 멤버 제거에 실패했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 멤버 제거에 실패했습니다."
      },
      { status: 500 }
    );
  }
}