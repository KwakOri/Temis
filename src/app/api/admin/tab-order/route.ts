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

    // Update each tab order
    const updates = orders.map(async (order) => {
      const updateData: {
        order_index: number;
        is_visible?: boolean;
        updated_at: string;
      } = {
        order_index: order.order_index,
        updated_at: new Date().toISOString(),
      };

      if (order.is_visible !== undefined) {
        updateData.is_visible = order.is_visible;
      }

      return supabase
        .from("admin_tab_order")
        .update(updateData)
        .eq("tab_id", order.tab_id)
        .select();
    });

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error("Database errors:", errors);
      return NextResponse.json(
        { error: "Failed to update some tab orders" },
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
