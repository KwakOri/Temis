import { getAllPortfolios } from "@/services/admin/portfolioService";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/portfolios
 * 공개 포트폴리오 목록 조회 (페이지네이션 및 카테고리 필터링)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 9; // 한 페이지당 9개

    // 모든 포트폴리오 조회
    let portfolios = await getAllPortfolios();

    // 카테고리 필터링
    if (category !== "all") {
      portfolios = portfolios.filter((p) => p.category === category);
    }

    // 총 개수
    const total = portfolios.length;
    const totalPages = Math.ceil(total / limit);

    // 페이지네이션
    const offset = (page - 1) * limit;
    const paginatedPortfolios = portfolios.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      portfolios: paginatedPortfolios,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Portfolios fetch error:", error);
    return NextResponse.json(
      { error: "포트폴리오 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
