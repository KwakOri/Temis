import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const v2_TEMPLATE_LIST_DEFAULT_LIMIT = 50;
const v2_TEMPLATE_LIST_MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const offsetParam = Number.parseInt(searchParams.get("offset") || "", 10);
    const search = searchParams.get("search")?.trim() || "";

    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, v2_TEMPLATE_LIST_MAX_LIMIT))
      : v2_TEMPLATE_LIST_DEFAULT_LIMIT;
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    const escapedSearch = search.replace(/[,%_]/g, "\\$&");
    const searchFilter = escapedSearch ? `%${escapedSearch}%` : null;

    let query = supabase
      .from("v2_templates")
      .select("id, name, description, is_public, created_at, updated_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (searchFilter) {
      query = query.or(`name.ilike.${searchFilter},description.ilike.${searchFilter}`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      templates: data ?? [],
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    });
  } catch (error) {
    console.error("V2 templates fetch error:", error);
    return NextResponse.json(
      { error: "v2 템플릿 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
