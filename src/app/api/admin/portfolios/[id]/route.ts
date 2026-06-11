import { requireAdmin } from "@/lib/auth/middleware";
import {
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
} from "@/services/admin/portfolioService";
import {
  deletePortfolioImage,
  deletePortfolioImages,
} from "@/lib/portfolio-utils";
import type { UpdatePortfolioMetadataRequest } from "@/types/portfolio";
import { NextRequest, NextResponse } from "next/server";

function parseUpdateRequest(
  body: unknown
): UpdatePortfolioMetadataRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const {
    category,
    title,
    description,
    thumbnailUrl,
    imageUrls,
    uploadedImageUrls,
  } = body as Partial<UpdatePortfolioMetadataRequest>;

  if (
    typeof category !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof thumbnailUrl !== "string" ||
    !Array.isArray(imageUrls) ||
    imageUrls.some((url) => typeof url !== "string") ||
    (uploadedImageUrls !== undefined &&
      (!Array.isArray(uploadedImageUrls) ||
        uploadedImageUrls.some((url) => typeof url !== "string")))
  ) {
    return null;
  }

  return {
    category,
    title,
    description,
    thumbnailUrl,
    imageUrls,
    uploadedImageUrls,
  };
}

function validateUpdateRequest(
  body: UpdatePortfolioMetadataRequest
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

async function cleanupImages(urls: string[]): Promise<void> {
  if (urls.length === 0) {
    return;
  }

  try {
    await deletePortfolioImages(urls);
  } catch (error) {
    console.error("Portfolio image cleanup failed:", error);
  }
}

/**
 * PUT /api/admin/portfolios/[id]
 * 포트폴리오 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  let uploadedImageUrls: string[] = [];

  try {
    const { id } = await params;

    // 기존 포트폴리오 조회
    const existingPortfolio = await getPortfolioById(id);
    if (!existingPortfolio) {
      return NextResponse.json(
        { error: "포트폴리오를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = parseUpdateRequest(await request.json().catch(() => null));

    if (!body) {
      return NextResponse.json(
        { error: "포트폴리오 수정 요청이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    uploadedImageUrls = body.uploadedImageUrls || [];

    const validationError = validateUpdateRequest(body);
    if (validationError) {
      await cleanupImages(uploadedImageUrls);
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // 포트폴리오 업데이트
    const updatedPortfolio = await updatePortfolio(
      id,
      body.category.trim(),
      body.title.trim(),
      body.description.trim(),
      body.thumbnailUrl,
      body.imageUrls
    );

    const imagesToDelete = existingPortfolio.image_urls.filter(
      (url) => !body.imageUrls.includes(url)
    );
    const thumbnailToDelete =
      existingPortfolio.thumbnail_url !== body.thumbnailUrl
        ? [existingPortfolio.thumbnail_url]
        : [];

    await cleanupImages([...thumbnailToDelete, ...imagesToDelete]);

    return NextResponse.json({
      success: true,
      message: "포트폴리오가 성공적으로 수정되었습니다.",
      portfolio: updatedPortfolio,
    });
  } catch (error) {
    await cleanupImages(uploadedImageUrls);
    console.error("Portfolio update error:", error);
    return NextResponse.json(
      { error: "포트폴리오 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/portfolios/[id]
 * 포트폴리오 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;

    // 기존 포트폴리오 조회
    const existingPortfolio = await getPortfolioById(id);
    if (!existingPortfolio) {
      return NextResponse.json(
        { error: "포트폴리오를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // R2에서 이미지 삭제
    await deletePortfolioImage(existingPortfolio.thumbnail_url);
    await deletePortfolioImages(existingPortfolio.image_urls);

    // DB에서 포트폴리오 삭제
    await deletePortfolio(id);

    return NextResponse.json({
      success: true,
      message: "포트폴리오가 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Portfolio deletion error:", error);
    return NextResponse.json(
      { error: "포트폴리오 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
