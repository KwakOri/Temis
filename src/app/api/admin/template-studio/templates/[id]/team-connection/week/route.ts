import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import { NextRequest, NextResponse } from "next/server";
import { service, errorResponse } from "../_service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) return actor.response;
  try {
    const { id } = await params;
    return NextResponse.json(
      await service.preview(
        id,
        actor.userId,
        request.nextUrl.searchParams.get("teamId") ?? "",
        request.nextUrl.searchParams.get("weekStartDate") ?? "",
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
