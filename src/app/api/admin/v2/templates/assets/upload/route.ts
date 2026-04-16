import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { uploadFileToR2 } from "@/lib/r2";
import { buildV2AssetUploadFolder } from "@/utils/v2/r2-upload-prefix";

type UploadTargetType = "builtin" | "extra";

type UploadMappingItem = {
  clientId: string;
  fileName?: string;
  targetType: UploadTargetType;
  targetKey: string;
  theme: string;
};

const sanitizePathSegment = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
};

const parseUploadMappings = (
  rawMappingJson: FormDataEntryValue | null
): UploadMappingItem[] => {
  if (typeof rawMappingJson !== "string" || rawMappingJson.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawMappingJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as Record<string, unknown>;
        const clientId =
          typeof candidate.clientId === "string" ? candidate.clientId.trim() : "";
        const targetType =
          candidate.targetType === "builtin" || candidate.targetType === "extra"
            ? candidate.targetType
            : null;
        const targetKey =
          typeof candidate.targetKey === "string" ? candidate.targetKey.trim() : "";
        const theme =
          typeof candidate.theme === "string" ? candidate.theme.trim() : "";
        const fileName =
          typeof candidate.fileName === "string" ? candidate.fileName.trim() : undefined;
        if (!clientId || !targetType || !targetKey || !theme) return null;
        return {
          clientId,
          ...(fileName ? { fileName } : {}),
          targetType,
          targetKey,
          theme,
        } satisfies UploadMappingItem;
      })
      .filter((item): item is UploadMappingItem => Boolean(item));
  } catch {
    return [];
  }
};

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const formData = await request.formData();
    const templateIdRaw = formData.get("templateId");
    const mappings = parseUploadMappings(formData.get("mappingJson"));
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (mappings.length === 0) {
      return NextResponse.json(
        { error: "mappingJson이 비어 있거나 형식이 잘못되었습니다." },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 파일이 없습니다." },
        { status: 400 }
      );
    }

    if (files.length !== mappings.length) {
      return NextResponse.json(
        {
          error:
            "files 개수와 mappingJson 항목 수가 일치하지 않습니다. 동일한 순서/개수로 전달해 주세요.",
        },
        { status: 400 }
      );
    }

    const templateId =
      typeof templateIdRaw === "string" && templateIdRaw.trim().length > 0
        ? templateIdRaw.trim()
        : "local";
    const safeTemplateId = sanitizePathSegment(templateId, "local");

    const uploaded = await Promise.all(
      mappings.map(async (mapping, index) => {
        const file = files[index];
        const safeTheme = sanitizePathSegment(mapping.theme, "first");
        const folder = buildV2AssetUploadFolder({
          templateId: safeTemplateId,
          theme: safeTheme,
          basePrefix: process.env.V2_R2_UPLOAD_BASE_PREFIX,
        });
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadedFile = await uploadFileToR2(
          buffer,
          file.name,
          file.type || "application/octet-stream",
          folder
        );

        return {
          clientId: mapping.clientId,
          fileName: file.name,
          targetType: mapping.targetType,
          targetKey: mapping.targetKey,
          theme: mapping.theme,
          url: uploadedFile.url,
          fileKey: uploadedFile.fileKey,
        };
      })
    );

    return NextResponse.json({
      success: true,
      uploaded,
    });
  } catch (error) {
    console.error("Admin v2 asset upload error:", error);
    return NextResponse.json(
      { error: "v2 에셋 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
