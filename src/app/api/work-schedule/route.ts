import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// 닉네임 마스킹 함수
function maskName(name: string | null | undefined): string {
  if (!name) return 'Unknown';
  
  if (name.length === 1) {
    return `${name[0]}*${name[0]}`;
  } else {
    return `${name[0]}*${name[name.length - 1]}`;
  }
}

// 작업 예정표 조회 (공개 API)
export async function GET() {
  try {
    // 1. 일반 주문들을 조회 (deadline이 null이 아닌 경우만)
    const { data: orders, error: ordersError } = await supabase
      .from("custom_timetable_orders")
      .select(
        `
        id,
        user_id,
        deadline,
        status,
        selected_options,
        created_at,
        users!inner(
          id,
          name,
          email
        )
      `
      )
      .in("status", ["accepted", "in_progress"])
      .not("deadline", "is", null)
      .order("deadline", { ascending: true });

    if (ordersError) {
      console.error("Orders query error:", ordersError);
      return NextResponse.json(
        {
          error: "작업 예정표 조회 중 오류가 발생했습니다.",
          details: ordersError.message,
        },
        { status: 500 }
      );
    }

    // 2. 레거시 주문들을 조회
    const { data: legacyOrders, error: legacyError } = await supabase
      .from("legacy_custom_orders")
      .select(
        `
        id,
        email,
        nickname,
        deadline,
        status,
        created_at
      `
      )
      .in("status", ["accepted", "in_progress"])
      .order("deadline", { ascending: true, nullsFirst: false });

    if (legacyError) {
      console.error("Legacy orders query error:", legacyError);
      return NextResponse.json(
        {
          error: "레거시 주문 조회 중 오류가 발생했습니다.",
          details: legacyError.message,
        },
        { status: 500 }
      );
    }

    // 3. 일반 주문 가공
    const processedOrders = (orders || []).map((order) => ({
      id: order.id,
      email_prefix:
        maskName(order.users?.name) !== 'Unknown' 
          ? maskName(order.users?.name)
          : order.users?.email?.slice(0, 5) || "Unknown",
      deadline: order.deadline,
      status: order.status,
      selected_options: order.selected_options,
      created_at: order.created_at,
      source: "internal", // 내부 주문 표시
    }));

    // 4. 레거시 주문 가공
    const processedLegacyOrders = (legacyOrders || []).map((order) => ({
      id: order.id,
      email_prefix:
        maskName(order.nickname) !== 'Unknown' 
          ? maskName(order.nickname)
          : order.email?.slice(0, 5) || "Unknown",
      deadline: order.deadline,
      status: order.status,
      created_at: order.created_at,
      source: "legacy", // 레거시 주문 표시
    }));

    // 5. 레거시 주문을 먼저, 그 다음 일반 주문 순서로 합치기
    const allOrders = [...processedLegacyOrders, ...processedOrders];

    return NextResponse.json({
      orders: allOrders,
      total: allOrders.length,
      breakdown: {
        legacy: processedLegacyOrders.length,
        internal: processedOrders.length,
      },
    });
  } catch (error) {
    console.error("Work schedule fetch error:", error);
    return NextResponse.json(
      {
        error: "서버 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
