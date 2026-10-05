import { requireAuth } from "@/lib/auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import {
  teamStudioErrorResponse,
  teamStudioRuntimeService,
} from "../../_utils";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    return NextResponse.json(
      await teamStudioRuntimeService.week(
        auth.user,
        id,
        request.nextUrl.searchParams.get("teamId") ?? "",
        request.nextUrl.searchParams.get("weekStartDate") ?? "",
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return teamStudioErrorResponse(error);
  }
}
