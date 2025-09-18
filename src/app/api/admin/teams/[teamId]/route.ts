import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamService } from "@/services/server/teamService";
import { NextRequest, NextResponse } from "next/server";

// Get specific team
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

    const team = await teamService.getTeamById(params.teamId);
    if (!team) {
      return NextResponse.json(
        { error: "팀을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 정보를 가져오는데 실패했습니다."
      },
      { status: 500 }
    );
  }
}

// Update team
export async function PUT(
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
    const { name, description } = body;

    if (name && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "팀 이름이 유효하지 않습니다." },
        { status: 400 }
      );
    }

    const updateData: { name?: string; description?: string } = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();

    const team = await teamService.updateTeam(params.teamId, updateData);
    return NextResponse.json(team);
  } catch (error) {
    console.error("Error updating team:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 정보 수정에 실패했습니다."
      },
      { status: 500 }
    );
  }
}

// Delete team
export async function DELETE(
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

    const success = await teamService.deleteTeam(params.teamId);
    if (success) {
      return NextResponse.json({ message: "팀이 성공적으로 삭제되었습니다." });
    } else {
      return NextResponse.json(
        { error: "팀 삭제에 실패했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 삭제에 실패했습니다."
      },
      { status: 500 }
    );
  }
}