import { getCurrentUserId } from "@/lib/auth/jwt";
import { teamService } from "@/services/server/teamService";
import { NextRequest, NextResponse } from "next/server";

// Get all teams (Admin only)
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // TODO: Add admin permission check
    // For now, any authenticated user can access

    const teams = await teamService.getAllTeams();
    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 목록을 가져오는데 실패했습니다."
      },
      { status: 500 }
    );
  }
}

// Create new team
export async function POST(request: NextRequest) {
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

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "팀 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const team = await teamService.createTeam({
      name: name.trim(),
      description: description?.trim(),
      created_by: userId,
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "팀 생성에 실패했습니다."
      },
      { status: 500 }
    );
  }
}