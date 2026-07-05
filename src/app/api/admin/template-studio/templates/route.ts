import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import {
  createTemplateStudioTemplate,
  listTemplateStudioTemplates,
} from "@/services/server/templateStudioPersistenceService";
import { NextRequest, NextResponse } from "next/server";

const getStringField = (
  value: Record<string, unknown>,
  key: string,
): string | null => {
  const field = value[key];
  return typeof field === "string" ? field.trim() : null;
};

export async function GET(request: NextRequest) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  try {
    const templates = await listTemplateStudioTemplates();

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Template Studio template list error:", error);
    return NextResponse.json(
      { error: "Template Studio 템플릿 목록 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "요청 본문이 필요합니다." },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const name = getStringField(payload, "name");
    const description = getStringField(payload, "description") ?? "";

    if (!name) {
      return NextResponse.json(
        { error: "Template Studio 템플릿 이름이 필요합니다." },
        { status: 400 },
      );
    }

    const template = await createTemplateStudioTemplate({
      name,
      description,
      createdBy: actor.userId,
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Template Studio template create error:", error);
    return NextResponse.json(
      { error: "Template Studio 템플릿 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
