import { verifyJWT, type JWTPayload } from "@/lib/auth/jwt";
import { requireAdmin } from "@/lib/auth/middleware";
import { validatePortfolioUploadFiles } from "@/lib/portfolio-upload";
import type { PortfolioUploadMetadata } from "@/lib/portfolio-upload";
import {
  deleteFileFromR2,
  getFileMetadataFromR2,
  getFileUrl,
} from "@/lib/r2";
import { isPortfolioFileKey } from "@/lib/portfolio-utils";
import { NextRequest, NextResponse } from "next/server";

interface CompletePortfolioUploadRequest {
  uploads: { token: string }[];
}

interface VerifiedPortfolioUpload extends PortfolioUploadMetadata {
  fileKey: string;
}

function parseCompleteRequest(
  body: unknown
): CompletePortfolioUploadRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { uploads } = body as Partial<CompletePortfolioUploadRequest>;
  if (!Array.isArray(uploads)) {
    return null;
  }

  const normalizedUploads = uploads
    .filter((upload) => upload && typeof upload === "object")
    .map((upload) => ({
      token: String((upload as { token?: string }).token || ""),
    }));

  if (
    normalizedUploads.length !== uploads.length ||
    normalizedUploads.some((upload) => !upload.token)
  ) {
    return null;
  }

  return {
    uploads: normalizedUploads,
  };
}

function readUploadToken(
  payload: JWTPayload,
  userId: string | number
): VerifiedPortfolioUpload | null {
  if (
    payload.purpose !== "portfolio-r2-upload" ||
    Number(payload.userId) !== Number(userId) ||
    typeof payload.fileKey !== "string" ||
    !isPortfolioFileKey(payload.fileKey) ||
    typeof payload.originalName !== "string" ||
    typeof payload.mimeType !== "string" ||
    typeof payload.fileSize !== "number"
  ) {
    return null;
  }

  return {
    fileKey: payload.fileKey,
    name: payload.originalName,
    size: payload.fileSize,
    type: payload.mimeType,
  };
}

async function cleanupUploadedFiles(fileKeys: string[]): Promise<void> {
  await Promise.all(
    fileKeys.map((fileKey) => deleteFileFromR2(fileKey).catch(() => null))
  );
}

async function verifyR2Object(upload: VerifiedPortfolioUpload): Promise<void> {
  const metadata = await getFileMetadataFromR2(upload.fileKey);

  if (metadata.contentLength !== upload.size) {
    throw new Error("업로드된 이미지 크기가 요청 정보와 일치하지 않습니다.");
  }

  const uploadedType = metadata.contentType.split(";")[0];
  if (uploadedType && uploadedType !== upload.type) {
    throw new Error("업로드된 이미지 형식이 요청 정보와 일치하지 않습니다.");
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  const uploadedFileKeys: string[] = [];

  try {
    const completeRequest = parseCompleteRequest(
      await request.json().catch(() => null)
    );

    if (!completeRequest || completeRequest.uploads.length === 0) {
      return NextResponse.json(
        { error: "완료할 업로드 정보가 없습니다." },
        { status: 400 }
      );
    }

    const verifiedUploads: VerifiedPortfolioUpload[] = [];
    for (const upload of completeRequest.uploads) {
      const payload = await verifyJWT(upload.token);
      const verifiedUpload = payload
        ? readUploadToken(payload, adminCheck.user.userId)
        : null;

      if (!verifiedUpload) {
        return NextResponse.json(
          { error: "유효하지 않은 업로드 정보입니다." },
          { status: 400 }
        );
      }

      uploadedFileKeys.push(verifiedUpload.fileKey);
      verifiedUploads.push(verifiedUpload);
    }

    const validation = validatePortfolioUploadFiles(verifiedUploads);
    if (!validation.isValid) {
      await cleanupUploadedFiles(uploadedFileKeys);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    for (const upload of verifiedUploads) {
      await verifyR2Object(upload);
    }

    return NextResponse.json({
      success: true,
      files: verifiedUploads.map((upload) => ({
        fileKey: upload.fileKey,
        url: getFileUrl(upload.fileKey),
        name: upload.name,
        size: upload.size,
        type: upload.type,
      })),
    });
  } catch (error) {
    await cleanupUploadedFiles(uploadedFileKeys);
    console.error("Portfolio upload complete error:", error);
    return NextResponse.json(
      { error: "포트폴리오 이미지 업로드 완료 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
