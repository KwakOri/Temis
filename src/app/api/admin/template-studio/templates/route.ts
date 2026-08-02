import { requireTemplateStudioAdminActor } from "@/app/api/admin/template-studio/_utils";
import {
  createTemplateStudioTemplate,
  listTemplateStudioTemplates,
} from "@/services/server/templateStudioPersistenceService";
import { isStudioTemplateKind } from "@/utils/template-studio/template-kind";
import {
  THUMBNAIL_CANVAS_PRESETS,
  createThumbnailStudioDocument,
} from "@/utils/thumbnail-studio/document-factory";
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
    const rawKind = request.nextUrl.searchParams.get("kind");
    if (rawKind && !isStudioTemplateKind(rawKind)) {
      return NextResponse.json(
        { error: "유효한 Template Studio 템플릿 종류가 필요합니다." },
        { status: 400 },
      );
    }
    const templates = await listTemplateStudioTemplates(undefined, {
      templateKind:
        rawKind && isStudioTemplateKind(rawKind) ? rawKind : undefined,
    });

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
    const templateKind = payload.templateKind;
    const canvasPresetId = getStringField(payload, "canvasPresetId");

    if (templateKind !== undefined && !isStudioTemplateKind(templateKind)) {
      return NextResponse.json(
        { error: "유효한 Template Studio 템플릿 종류가 필요합니다." },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Template Studio 템플릿 이름이 필요합니다." },
        { status: 400 },
      );
    }

    if (
      canvasPresetId &&
      (!isStudioTemplateKind(templateKind) || templateKind !== "thumbnail")
    ) {
      return NextResponse.json(
        { error: "canvasPresetId는 썸네일 템플릿에서만 사용할 수 있습니다." },
        { status: 400 },
      );
    }
    const canvasPreset = canvasPresetId
      ? THUMBNAIL_CANVAS_PRESETS.find((preset) => preset.id === canvasPresetId)
      : undefined;
    if (canvasPresetId && !canvasPreset) {
      return NextResponse.json(
        { error: "유효한 썸네일 캔버스 프리셋이 필요합니다." },
        { status: 400 },
      );
    }

    const template = await createTemplateStudioTemplate({
      name,
      description,
      createdBy: actor.userId,
      templateKind: isStudioTemplateKind(templateKind)
        ? templateKind
        : "timetable",
      initialDocument: canvasPreset
        ? createThumbnailStudioDocument({
            name,
            description,
            width: canvasPreset.width,
            height: canvasPreset.height,
          })
        : undefined,
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
