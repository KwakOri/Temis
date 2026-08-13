import { requireAdmin } from "@/lib/auth/middleware";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { data, error } = await supabaseAdminServer
      .from("template_purchase_requests")
      .select(
        `
        *,
        template:templates(*),
        template_plan:template_plans(*),
        user:users(id, name, email)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, requests: data ?? [] });
  } catch (error) {
    console.error("Purchase requests fetch error:", error);
    return NextResponse.json(
      { error: "구매 요청을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
