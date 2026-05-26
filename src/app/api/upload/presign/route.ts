import { getCurrentUserId, signJWT } from "@/lib/auth/jwt";
import {
  getUploadValidationOptions,
  isUploadType,
  validateFiles,
  type UploadFileMetadata,
  type UploadType,
} from "@/lib/file-utils";
import { createPresignedUploadUrl } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

interface PresignUploadRequest {
  type: UploadType;
  files: UploadFileMetadata[];
}

const UPLOAD_TOKEN_EXPIRES_IN = "10m";

function parseUploadRequest(body: unknown): PresignUploadRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { type, files } = body as Partial<PresignUploadRequest>;
  const uploadType =
    typeof type === "string" && isUploadType(type) ? type : null;

  if (!uploadType || !Array.isArray(files)) {
    return null;
  }

  const normalizedFiles = files
    .filter((file) => file && typeof file === "object")
    .map((file) => ({
      name: String((file as UploadFileMetadata).name || ""),
      size: Number((file as UploadFileMetadata).size || 0),
      type: String((file as UploadFileMetadata).type || ""),
    }));

  if (normalizedFiles.length !== files.length) {
    return null;
  }

  return {
    type: uploadType,
    files: normalizedFiles,
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const uploadRequest = parseUploadRequest(await request.json());
    if (!uploadRequest || uploadRequest.files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 파일 정보가 없습니다." },
        { status: 400 }
      );
    }

    const validation = validateFiles(
      uploadRequest.files,
      getUploadValidationOptions(uploadRequest.type)
    );
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const uploads = await Promise.all(
      uploadRequest.files.map(async (file) => {
        const { fileKey, uploadUrl } = await createPresignedUploadUrl(
          file.name,
          file.type,
          `uploads/custom-orders/${uploadRequest.type}`
        );

        const token = await signJWT(
          {
            purpose: "r2-upload",
            userId,
            fileKey,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadType: uploadRequest.type,
          },
          UPLOAD_TOKEN_EXPIRES_IN
        );

        return {
          uploadUrl,
          token,
          headers: {
            "Content-Type": file.type,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      uploads,
    });
  } catch (error) {
    console.error("업로드 URL 생성 API 에러:", error);
    return NextResponse.json(
      { error: "파일 업로드 URL 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
