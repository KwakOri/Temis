import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const v2_TEMPLATE_NAME_MAX_LENGTH = 100;
const v2_TEMPLATE_DESCRIPTION_MAX_LENGTH = 500;

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offsetParam = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search")?.trim() || "";

    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 200))
      : 50;
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
    console.error("Admin v2 templates fetch error:", error);
    return NextResponse.json(
      { error: "v2 템플릿 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description =
      typeof body?.description === "string" ? body.description.trim() : "";
    const isPublic = body?.is_public === true;

    if (!name) {
      return NextResponse.json(
        { error: "템플릿 이름은 필수입니다." },
        { status: 400 }
      );
    }

    if (name.length > v2_TEMPLATE_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `템플릿 이름은 ${v2_TEMPLATE_NAME_MAX_LENGTH}자를 초과할 수 없습니다.` },
        { status: 400 }
      );
    }

    if (description.length > v2_TEMPLATE_DESCRIPTION_MAX_LENGTH) {
      return NextResponse.json(
        {
          error: `템플릿 설명은 ${v2_TEMPLATE_DESCRIPTION_MAX_LENGTH}자를 초과할 수 없습니다.`,
        },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("v2_templates")
      .insert({
        name,
        description,
        is_public: isPublic,
      })
      .select("id, name, description, is_public, created_at, updated_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "v2 템플릿이 생성되었습니다.",
        template: inserted,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin v2 template creation error:", error);
    return NextResponse.json(
      { error: "v2 템플릿 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
