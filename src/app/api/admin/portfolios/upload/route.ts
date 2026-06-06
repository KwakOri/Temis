import { requireAdmin } from "@/lib/auth/middleware";
import { deleteFileFromR2 } from "@/lib/r2";
import {
  extractPortfolioFileKeyFromUrl,
  isPortfolioFileKey,
} from "@/lib/portfolio-utils";
import { NextRequest, NextResponse } from "next/server";

interface DeletePortfolioUploadRequest {
  fileKeys?: string[];
  urls?: string[];
}

function parseDeleteRequest(body: unknown): string[] | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { fileKeys, urls } = body as DeletePortfolioUploadRequest;
  const normalizedKeys = new Set<string>();

  if (Array.isArray(fileKeys)) {
    for (const fileKey of fileKeys) {
      if (typeof fileKey === "string" && isPortfolioFileKey(fileKey)) {
        normalizedKeys.add(fileKey);
      }
    }
  }

  if (Array.isArray(urls)) {
    for (const url of urls) {
      if (typeof url !== "string") continue;

      const fileKey = extractPortfolioFileKeyFromUrl(url);
      if (fileKey) {
        normalizedKeys.add(fileKey);
      }
    }
  }

  return Array.from(normalizedKeys);
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const fileKeys = parseDeleteRequest(await request.json().catch(() => null));

    if (!fileKeys) {
      return NextResponse.json(
        { error: "삭제할 이미지 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    await Promise.all(fileKeys.map((fileKey) => deleteFileFromR2(fileKey)));

    return NextResponse.json({
      success: true,
      deletedCount: fileKeys.length,
    });
  } catch (error) {
    console.error("Portfolio upload cleanup error:", error);
    return NextResponse.json(
      { error: "포트폴리오 이미지 정리에 실패했습니다." },
      { status: 500 }
    );
  }
}
