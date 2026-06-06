import { requireAdmin } from "@/lib/auth/middleware";
import {
  getAllPortfolios,
  createPortfolio,
} from "@/services/admin/portfolioService";
import { deletePortfolioImages } from "@/lib/portfolio-utils";
import type { CreatePortfolioMetadataRequest } from "@/types/portfolio";
import { NextRequest, NextResponse } from "next/server";

function parseCreateRequest(
  body: unknown
): CreatePortfolioMetadataRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const {
    category,
    title,
    description,
    thumbnailUrl,
    imageUrls,
  } = body as Partial<CreatePortfolioMetadataRequest>;

  if (
    typeof category !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof thumbnailUrl !== "string" ||
    !Array.isArray(imageUrls) ||
    imageUrls.some((url) => typeof url !== "string")
  ) {
    return null;
  }

  return {
    category,
    title,
    description,
    thumbnailUrl,
    imageUrls,
  };
}

function validateCreateRequest(
  body: CreatePortfolioMetadataRequest
): string | null {
  if (!body.category || body.category.trim().length === 0) {
    return "카테고리는 필수입니다.";
  }

  if (!body.title || body.title.trim().length === 0) {
    return "제목은 필수입니다.";
  }

  if (!body.description || body.description.trim().length === 0) {
    return "설명은 필수입니다.";
  }

  if (!body.thumbnailUrl || body.thumbnailUrl.trim().length === 0) {
    return "썸네일 이미지는 필수입니다.";
  }

  if (!body.imageUrls || body.imageUrls.length === 0) {
    return "최소 1개 이상의 이미지가 필요합니다.";
  }

  return null;
}

async function cleanupUploadedImages(urls: string[]): Promise<void> {
  if (urls.length === 0) {
    return;
  }

  try {
    await deletePortfolioImages(urls);
  } catch (error) {
    console.error("Portfolio uploaded image cleanup failed:", error);
  }
}

/**
 * GET /api/admin/portfolios
 * 모든 포트폴리오 조회
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const portfolios = await getAllPortfolios();

    return NextResponse.json({
      success: true,
      portfolios,
    });
  } catch (error) {
    console.error("Portfolios fetch error:", error);
    return NextResponse.json(
      { error: "포트폴리오 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/portfolios
 * 포트폴리오 생성
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  let uploadedImageUrls: string[] = [];

  try {
    const body = parseCreateRequest(await request.json().catch(() => null));

    if (!body) {
      return NextResponse.json(
        { error: "포트폴리오 생성 요청이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    uploadedImageUrls = [body.thumbnailUrl, ...body.imageUrls];

    const validationError = validateCreateRequest(body);
    if (validationError) {
      await cleanupUploadedImages(uploadedImageUrls);
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // 포트폴리오 생성
    const portfolio = await createPortfolio(
      body.category.trim(),
      body.title.trim(),
      body.description.trim(),
      body.thumbnailUrl,
      body.imageUrls,
      Number(adminCheck.user.userId)
    );

    return NextResponse.json(
      {
        success: true,
        message: "포트폴리오가 성공적으로 생성되었습니다.",
        portfolio,
      },
      { status: 201 }
    );
  } catch (error) {
    await cleanupUploadedImages(uploadedImageUrls);
    console.error("Portfolio creation error:", error);
    return NextResponse.json(
      { error: "포트폴리오 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
