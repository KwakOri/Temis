import {
  getTemplateStudioCurrentDocument,
  getTemplateStudioTemplate,
} from "@/services/server/templateStudioPersistenceService";
import { NextRequest, NextResponse } from "next/server";

const TEMPLATE_STUDIO_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!TEMPLATE_STUDIO_TEMPLATE_ID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "유효한 Template Studio 템플릿 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const template = await getTemplateStudioTemplate(id);
    if (!template || template.status !== "published") {
      return NextResponse.json(
        { error: "발행된 Template Studio 템플릿을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const document = await getTemplateStudioCurrentDocument(id);
    if (!document) {
      return NextResponse.json(
        { error: "발행된 Template Studio 문서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      templateId: id,
      source: "published",
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        status: "published",
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      document: document.document,
      runtimeValues: document.runtimeValues,
      publishedRevisionNo: document.publishedRevisionNo,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("Template Studio preview fetch error:", error);
    return NextResponse.json(
      { error: "Template Studio 미리보기 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
