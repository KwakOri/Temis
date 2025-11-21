import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// GET: 활성화된 관리자 옵션만 조회 (공개용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = supabase
      .from("admin_options")
      .select("*")
      .eq("is_enabled", true)
      .order("created_at", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data: options, error } = await query;

    if (error) {
      console.error("Admin options fetch error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      options: options || [],
    });
  } catch (error) {
    console.error("Admin options fetch error:", error);
    return NextResponse.json(
      { error: "관리자 옵션 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
