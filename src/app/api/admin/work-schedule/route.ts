import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const adminCheck = await requireAdmin(request);

    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    // 내부 주문 조회 (모든 상태 포함)
    const { data: internalOrders, error: internalError } = await supabase
      .from("custom_timetable_orders")
      .select(
        `
        id,
        user_id,
        status,
        selected_options,
        deadline,
        created_at,
        users!inner(email)
      `
      )
      .order("created_at", { ascending: false });

    if (internalError) {
      console.error("Internal orders fetch error:", internalError);
      return NextResponse.json(
        { error: "Failed to fetch internal orders" },
        { status: 500 }
      );
    }

    // 레거시 주문 조회
    const { data: legacyOrders, error: legacyError } = await supabase
      .from("legacy_custom_orders")
      .select(
        `
        id,
        email,
        status,
        deadline,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (legacyError) {
      console.error("Legacy orders fetch error:", legacyError);
      return NextResponse.json(
        { error: "Failed to fetch legacy orders" },
        { status: 500 }
      );
    }

    // 데이터 형식 통일
    const formattedInternalOrders = (internalOrders || []).map((order) => ({
      id: order.id,
      email_prefix: order.users?.email?.split("@")[0] || "알 수 없음",
      status: order.status,
      selected_options: order.selected_options,
      deadline: order.deadline,
      created_at: order.created_at,
      source: "internal" as const,
    }));

    const formattedLegacyOrders = (legacyOrders || []).map((order) => ({
      id: order.id,
      email_prefix: order.email?.split("@")[0] || "알 수 없음",
      status: order.status,
      selected_options: null,
      deadline: order.deadline,
      created_at: order.created_at,
      source: "legacy" as const,
    }));

    // 두 데이터 합치기
    const allOrders = [...formattedInternalOrders, ...formattedLegacyOrders];

    // 생성일 기준으로 정렬 (최신순)
    allOrders.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      orders: allOrders,
      total: allOrders.length,
      internal_count: formattedInternalOrders.length,
      legacy_count: formattedLegacyOrders.length,
    });
  } catch (error) {
    console.error("Admin work schedule API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
