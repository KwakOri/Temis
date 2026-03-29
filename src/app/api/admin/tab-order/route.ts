import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { UpdateTabOrderRequest } from "@/types/tabOrder";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("admin_tab_order")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tab order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tabOrders: data,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateTabOrderRequest = await request.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: "Invalid request: orders array is required" },
        { status: 400 }
      );
    }

    const normalizedOrders = orders.map((order, index) => ({
      tab_id: order.tab_id,
      order_index: index,
      is_visible: order.is_visible ?? true,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("admin_tab_order")
      .upsert(normalizedOrders, { onConflict: "tab_id" });

    if (upsertError) {
      console.error("Database error:", upsertError);
      return NextResponse.json(
        { error: "Failed to update tab orders" },
        { status: 500 }
      );
    }

    // Fetch updated data
    const { data, error } = await supabase
      .from("admin_tab_order")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch updated tab order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tabOrders: data,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
