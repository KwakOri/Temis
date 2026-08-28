import {
  parseTemplateStudioTemplateId,
  requireTemplateStudioAdminActor,
  templateStudioBadTemplateIdResponse,
  templateStudioTemplateNotFoundResponse,
} from "@/app/api/admin/template-studio/_utils";
import { deleteFileFromR2, getFileUrl, uploadFileToR2Key } from "@/lib/r2";
import {
  getTemplateStudioTemplate,
  getTemplateStudioCurrentDocument,
  storeTemplateStudioPreview,
  TemplateStudioPersistenceError,
} from "@/services/server/templateStudioPersistenceService";
import {
  buildTemplateStudioAssetTemplatePrefix,
  sanitizeTemplateStudioPathSegment,
} from "@/utils/template-studio/asset-storage";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const PREVIEW_MIME_TYPE = "image/png";
const MAX_PREVIEW_SIZE_BYTES = 10 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const parseRevisionNo = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;

  const revisionNo = Number(value);
  return Number.isSafeInteger(revisionNo) && revisionNo > 0 ? revisionNo : null;
};

const createPreviewFileKey = ({
  templateId,
  revisionNo,
  buffer,
}: {
  templateId: string;
  revisionNo: number;
  buffer: Buffer;
}): string => {
  const contentHash = createHash("sha256").update(buffer).digest("hex");
  return `${buildTemplateStudioAssetTemplatePrefix(templateId)}/previews/revision-${sanitizeTemplateStudioPathSegment(
    String(revisionNo),
    "revision",
  )}-${contentHash}.png`;
};

const isPngBuffer = (buffer: Buffer): boolean =>
  buffer.length >= PNG_SIGNATURE.length &&
  PNG_SIGNATURE.equals(buffer.subarray(0, PNG_SIGNATURE.length));

const cleanupUploadedPreview = async (fileKey: string | null) => {
  if (!fileKey) return;

  try {
    await deleteFileFromR2(fileKey);
  } catch (error) {
    console.error("Template Studio preview orphan cleanup failed:", {
      fileKey,
      error,
    });
  }
};

const isStaleRevisionError = (error: unknown): boolean =>
  error instanceof TemplateStudioPersistenceError &&
  (error.code === "40001" || error.message.toLowerCase().includes("stale"));

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireTemplateStudioAdminActor(request);
  if (!actor.ok) {
    return actor.response;
  }

  let uploadedFileKey: string | null = null;

  try {
    const templateId = await parseTemplateStudioTemplateId({ params });
    if (!templateId) {
      return templateStudioBadTemplateIdResponse();
    }

    const template = await getTemplateStudioTemplate(templateId);
    if (!template) {
      return templateStudioTemplateNotFoundResponse();
    }

    if (template.templateKind !== "thumbnail") {
      return NextResponse.json(
        {
          error:
            "Thumbnail Studio 템플릿만 자동 미리보기를 저장할 수 있습니다.",
        },
        { status: 400 },
      );
    }

    if (template.status !== "published") {
      return NextResponse.json(
        {
          error:
            "발행된 Thumbnail Studio 템플릿만 자동 미리보기를 저장할 수 있습니다.",
        },
        { status: 409 },
      );
    }

    const formData = await request.formData();
    const revisionNo = parseRevisionNo(formData.get("revisionNo"));
    if (revisionNo === null) {
      return NextResponse.json(
        { error: "유효한 published revision 번호가 필요합니다." },
        { status: 400 },
      );
    }

    const publishedDocument =
      await getTemplateStudioCurrentDocument(templateId);
    if (
      !publishedDocument ||
      publishedDocument.publishedRevisionNo !== revisionNo
    ) {
      return NextResponse.json(
        {
          error:
            "요청한 revision이 현재 발행 revision과 다릅니다. 다시 발행한 뒤 재시도해 주세요.",
        },
        { status: 409 },
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "자동 미리보기 이미지 파일이 필요합니다." },
        { status: 400 },
      );
    }

    if (file.type !== PREVIEW_MIME_TYPE) {
      return NextResponse.json(
        { error: "자동 미리보기는 PNG 파일만 저장할 수 있습니다." },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_PREVIEW_SIZE_BYTES) {
      return NextResponse.json(
        { error: "자동 미리보기 이미지 크기는 10MB 이하여야 합니다." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isPngBuffer(buffer)) {
      return NextResponse.json(
        { error: "자동 미리보기 파일이 올바른 PNG가 아닙니다." },
        { status: 400 },
      );
    }
    const fileKey = createPreviewFileKey({
      templateId,
      revisionNo,
      buffer,
    });
    uploadedFileKey = fileKey;

    await uploadFileToR2Key(buffer, fileKey, PREVIEW_MIME_TYPE);
    const previewUrl = getFileUrl(fileKey);
    const preview = await storeTemplateStudioPreview({
      templateId,
      revisionNo,
      previewUrl,
      fileKey,
      mimeType: PREVIEW_MIME_TYPE,
      byteSize: buffer.byteLength,
    });

    if (
      template.studioPreviewFileKey &&
      template.studioPreviewFileKey !== fileKey
    ) {
      await cleanupUploadedPreview(template.studioPreviewFileKey);
    }

    uploadedFileKey = null;
    return NextResponse.json({
      success: true,
      templateId,
      preview,
    });
  } catch (error) {
    await cleanupUploadedPreview(uploadedFileKey);

    if (isStaleRevisionError(error)) {
      return NextResponse.json(
        {
          error:
            "게시 revision이 변경되어 자동 미리보기를 저장하지 못했습니다. 다시 발행한 뒤 재시도해 주세요.",
        },
        { status: 409 },
      );
    }

    console.error("Template Studio preview image upload error:", {
      actorUserId: actor.userId,
      error,
    });
    return NextResponse.json(
      { error: "Template Studio 자동 미리보기 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
