import { signJWT } from "@/lib/auth/jwt";
import { requireAdmin } from "@/lib/auth/middleware";
import {
  PORTFOLIO_UPLOAD_FOLDER,
  validatePortfolioUploadFiles,
} from "@/lib/portfolio-upload";
import type { PortfolioUploadMetadata } from "@/lib/portfolio-upload";
import { createPresignedUploadUrl } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

interface PresignPortfolioUploadRequest {
  files: PortfolioUploadMetadata[];
}

const PORTFOLIO_UPLOAD_TOKEN_EXPIRES_IN = "10m";

function parseUploadRequest(
  body: unknown
): PresignPortfolioUploadRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { files } = body as Partial<PresignPortfolioUploadRequest>;
  if (!Array.isArray(files)) {
    return null;
  }

  const normalizedFiles = files
    .filter((file) => file && typeof file === "object")
    .map((file) => ({
      name: String((file as PortfolioUploadMetadata).name || ""),
      size: Number((file as PortfolioUploadMetadata).size || 0),
      type: String((file as PortfolioUploadMetadata).type || ""),
    }));

  if (normalizedFiles.length !== files.length) {
    return null;
  }

  return {
    files: normalizedFiles,
  };
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const uploadRequest = parseUploadRequest(
      await request.json().catch(() => null)
    );

    if (!uploadRequest || uploadRequest.files.length === 0) {
      return NextResponse.json(
        { error: "업로드할 이미지 정보가 없습니다." },
        { status: 400 }
      );
    }

    const validation = validatePortfolioUploadFiles(uploadRequest.files);
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
          PORTFOLIO_UPLOAD_FOLDER
        );

        const token = await signJWT(
          {
            purpose: "portfolio-r2-upload",
            userId: adminCheck.user.userId,
            fileKey,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          },
          PORTFOLIO_UPLOAD_TOKEN_EXPIRES_IN
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
    console.error("Portfolio upload presign error:", error);
    return NextResponse.json(
      { error: "포트폴리오 이미지 업로드 URL 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
