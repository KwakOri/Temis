import { getPortfolioById } from "@/services/admin/portfolioService";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/portfolios/[id]
 * 공개 포트폴리오 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const portfolio = await getPortfolioById(id);

    if (!portfolio) {
      return NextResponse.json(
        { error: "포트폴리오를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      portfolio,
    });
  } catch (error) {
    console.error("Portfolio fetch error:", error);
    return NextResponse.json(
      { error: "포트폴리오 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
