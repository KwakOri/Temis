import { requireAdmin } from "@/lib/auth/middleware";
import {
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
} from "@/services/admin/portfolioService";
import {
  uploadPortfolioImage,
  uploadPortfolioImages,
  deletePortfolioImage,
  deletePortfolioImages,
} from "@/lib/portfolio-utils";
import { NextRequest, NextResponse } from "next/server";

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

  try {
    const { id } = await params;
    const formData = await request.formData();

    // 기존 포트폴리오 조회
    const existingPortfolio = await getPortfolioById(id);
    if (!existingPortfolio) {
      return NextResponse.json(
        { error: "포트폴리오를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 폼 데이터 추출
    const category = formData.get("category") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const thumbnail = formData.get("thumbnail") as File | null;
    const existingThumbnailUrl = formData.get(
      "existingThumbnailUrl"
    ) as string | null;
    const newImages = formData.getAll("newImages") as File[];
    const existingImageUrlsStr = formData.get("existingImageUrls") as
      | string
      | null;

    // 입력 검증
    if (!category || category.trim().length === 0) {
      return NextResponse.json(
        { error: "카테고리는 필수입니다." },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "제목은 필수입니다." },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "설명은 필수입니다." },
        { status: 400 }
      );
    }

    // 기존 이미지 URL 파싱
    const existingImageUrls: string[] = existingImageUrlsStr
      ? JSON.parse(existingImageUrlsStr)
      : [];

    // 썸네일 처리
    let thumbnailUrl = existingThumbnailUrl || existingPortfolio.thumbnail_url;
    if (thumbnail) {
      // 새 썸네일 업로드
      const thumbnailResult = await uploadPortfolioImage(thumbnail);
      thumbnailUrl = thumbnailResult.url;

      // 기존 썸네일 삭제 (기존과 다를 경우에만)
      if (
        existingPortfolio.thumbnail_url &&
        existingPortfolio.thumbnail_url !== thumbnailUrl
      ) {
        await deletePortfolioImage(existingPortfolio.thumbnail_url);
      }
    }

    // 이미지 처리
    let finalImageUrls = existingImageUrls;

    // 새 이미지 업로드
    if (newImages && newImages.length > 0) {
      const imageResults = await uploadPortfolioImages(newImages);
      const newImageUrls = imageResults.map((result) => result.url);
      finalImageUrls = [...existingImageUrls, ...newImageUrls];
    }

    // 삭제할 이미지 찾기 (기존 이미지 중 유지하지 않는 것)
    const imagesToDelete = existingPortfolio.image_urls.filter(
      (url) => !existingImageUrls.includes(url)
    );

    // 기존 이미지 삭제
    if (imagesToDelete.length > 0) {
      await deletePortfolioImages(imagesToDelete);
    }

    // 최소 1개 이미지 필요 검증
    if (finalImageUrls.length === 0) {
      return NextResponse.json(
        { error: "최소 1개 이상의 이미지가 필요합니다." },
        { status: 400 }
      );
    }

    // 포트폴리오 업데이트
    const updatedPortfolio = await updatePortfolio(
      id,
      category.trim(),
      title.trim(),
      description.trim(),
      thumbnailUrl,
      finalImageUrls
    );

    return NextResponse.json({
      success: true,
      message: "포트폴리오가 성공적으로 수정되었습니다.",
      portfolio: updatedPortfolio,
    });
  } catch (error) {
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
