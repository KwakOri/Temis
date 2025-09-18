import { requireAdmin } from "@/lib/auth/middleware";
import { teamService } from "@/services/server/teamService";
import { NextRequest, NextResponse } from "next/server";

// Get all teams (Admin only)
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

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
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "팀 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const { user } = adminCheck;

    const team = await teamService.createTeam({
      name: name.trim(),
      description: description?.trim(),
      created_by: user.userId,
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