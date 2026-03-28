import { requireAdmin } from "@/lib/auth/middleware";
import {
  getAllPortfolios,
  createPortfolio,
} from "@/services/admin/portfolioService";
import {
  uploadPortfolioImage,
  uploadPortfolioImages,
} from "@/lib/portfolio-utils";
import { NextRequest, NextResponse } from "next/server";

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

  try {
    const formData = await request.formData();

    // 폼 데이터 추출
    const category = formData.get("category") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const thumbnail = formData.get("thumbnail") as File;
    const images = formData.getAll("images") as File[];

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

    if (!thumbnail) {
      return NextResponse.json(
        { error: "썸네일 이미지는 필수입니다." },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "최소 1개 이상의 이미지가 필요합니다." },
        { status: 400 }
      );
    }

    // 이미지 업로드
    const thumbnailResult = await uploadPortfolioImage(thumbnail);
    const imageResults = await uploadPortfolioImages(images);

    const thumbnailUrl = thumbnailResult.url;
    const imageUrls = imageResults.map((result) => result.url);

    // 포트폴리오 생성
    const portfolio = await createPortfolio(
      category.trim(),
      title.trim(),
      description.trim(),
      thumbnailUrl,
      imageUrls,
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
    console.error("Portfolio creation error:", error);
    return NextResponse.json(
      { error: "포트폴리오 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
