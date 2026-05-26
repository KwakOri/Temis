import { getCurrentUserId, verifyJWT, type JWTPayload } from "@/lib/auth/jwt";
import {
  getUploadValidationOptions,
  isUploadType,
  validateFiles,
  type UploadFileMetadata,
  type UploadType,
} from "@/lib/file-utils";
import { supabase } from "@/lib/supabase";
import {
  deleteFileFromR2,
  getFileMetadataFromR2,
  getFileUrl,
} from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

interface CompleteUploadRequest {
  uploads: { token: string }[];
}

interface VerifiedUpload extends UploadFileMetadata {
  fileKey: string;
  uploadType: UploadType;
}

function parseCompleteRequest(body: unknown): CompleteUploadRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { uploads } = body as Partial<CompleteUploadRequest>;
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
  userId: number
): VerifiedUpload | null {
  const uploadType =
    typeof payload.uploadType === "string" && isUploadType(payload.uploadType)
      ? payload.uploadType
      : null;

  if (
    payload.purpose !== "r2-upload" ||
    Number(payload.userId) !== userId ||
    typeof payload.fileKey !== "string" ||
    typeof payload.originalName !== "string" ||
    typeof payload.mimeType !== "string" ||
    typeof payload.fileSize !== "number" ||
    !uploadType
  ) {
    return null;
  }

  return {
    fileKey: payload.fileKey,
    name: payload.originalName,
    size: payload.fileSize,
    type: payload.mimeType,
    uploadType,
  };
}

async function verifyR2Object(upload: VerifiedUpload): Promise<void> {
  const metadata = await getFileMetadataFromR2(upload.fileKey);
  if (metadata.contentLength !== upload.size) {
    throw new Error("업로드된 파일 크기가 요청 정보와 일치하지 않습니다.");
  }

  const uploadedType = metadata.contentType.split(";")[0];
  if (uploadedType && uploadedType !== upload.type) {
    throw new Error("업로드된 파일 형식이 요청 정보와 일치하지 않습니다.");
  }
}

export async function POST(request: NextRequest) {
  const uploadedFileKeys: string[] = [];

  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const completeRequest = parseCompleteRequest(await request.json());
    if (!completeRequest || completeRequest.uploads.length === 0) {
      return NextResponse.json(
        { error: "완료할 업로드 정보가 없습니다." },
        { status: 400 }
      );
    }

    const verifiedUploads: VerifiedUpload[] = [];
    for (const upload of completeRequest.uploads) {
      const payload = await verifyJWT(upload.token);
      const verifiedUpload = payload ? readUploadToken(payload, userId) : null;

      if (!verifiedUpload) {
        return NextResponse.json(
          { error: "유효하지 않은 업로드 정보입니다." },
          { status: 400 }
        );
      }

      verifiedUploads.push(verifiedUpload);
    }

    const uploadTypes = new Set(
      verifiedUploads.map((upload) => upload.uploadType)
    );
    if (uploadTypes.size !== 1) {
      return NextResponse.json(
        { error: "서로 다른 업로드 유형은 함께 완료할 수 없습니다." },
        { status: 400 }
      );
    }

    const uploadType = verifiedUploads[0].uploadType;
    const validation = validateFiles(
      verifiedUploads,
      getUploadValidationOptions(uploadType)
    );
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    for (const upload of verifiedUploads) {
      uploadedFileKeys.push(upload.fileKey);
      await verifyR2Object(upload);
    }

    const { data, error } = await supabase
      .from("files")
      .insert(
        verifiedUploads.map((upload) => ({
          file_key: upload.fileKey,
          original_name: upload.name,
          file_size: upload.size,
          mime_type: upload.type,
          created_by: userId,
        }))
      )
      .select();

    if (error) {
      await Promise.all(uploadedFileKeys.map((key) => deleteFileFromR2(key)));
      console.error("업로드 파일 메타데이터 저장 실패:", error);
      return NextResponse.json(
        { error: "파일 정보를 저장하는데 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files:
        data?.map((file) => ({
          ...file,
          url: getFileUrl(file.file_key),
        })) || [],
    });
  } catch (error) {
    await Promise.all(
      uploadedFileKeys.map((key) => deleteFileFromR2(key).catch(() => null))
    );
    console.error("업로드 완료 API 에러:", error);
    return NextResponse.json(
      { error: "파일 업로드 완료 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
