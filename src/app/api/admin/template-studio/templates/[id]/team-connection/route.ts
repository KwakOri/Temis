import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import { NextRequest, NextResponse } from "next/server";
import { service, errorResponse } from "./_service";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) return actor.response;
  try {
    const { id } = await params;
    return NextResponse.json(
      { connection: await service.get(id, actor.userId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(request: NextRequest, { params }: Context) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) return actor.response;
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    return NextResponse.json({
      connection: await service.save(id, actor.userId, body),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: NextRequest, { params }: Context) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) return actor.response;
  try {
    const { id } = await params;
    await service.disconnect(id, actor.userId);
    return NextResponse.json({ connection: null });
  } catch (error) {
    return errorResponse(error);
  }
}
