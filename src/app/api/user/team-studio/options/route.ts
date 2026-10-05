import { requireAuth } from "@/lib/auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { teamStudioErrorResponse, teamStudioRuntimeService } from "../_utils";
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(
      await teamStudioRuntimeService.options(auth.user),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return teamStudioErrorResponse(error);
  }
}
