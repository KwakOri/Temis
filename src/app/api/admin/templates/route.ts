import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 모든 템플릿 조회 (관리자는 모든 템플릿 볼 수 있음)
    const { data: templates, error } = await supabase
      .from("templates")
      .select(
        `
        *,
        template_products (*)
      `
      )
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
      pagination: {
        limit,
        offset,
        total: templates?.length || 0,
      },
    });
  } catch (error) {
    console.error("Admin templates fetch error:", error);
    return NextResponse.json(
      { error: "템플릿 목록 조회 중 오류가 발생했습니다." },
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
    const {
      name,
      description,
      detailed_description,
      thumbnail_url,
      is_public,
    } = body;

    // 입력 검증
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "템플릿 이름은 필수입니다." },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "템플릿 이름은 100자를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    if (description && description.length > 200) {
      return NextResponse.json(
        { error: "간단 설명은 200자를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    if (detailed_description && detailed_description.length > 2000) {
      return NextResponse.json(
        { error: "상세 설명은 2000자를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // 중복 이름 검사
    const { data: existingTemplate, error: checkError } = await supabase
      .from("templates")
      .select("id")
      .eq("name", name.trim())
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Template name check error:", checkError);
      throw checkError;
    }

    if (existingTemplate) {
      return NextResponse.json(
        { error: "이미 존재하는 템플릿 이름입니다." },
        { status: 409 }
      );
    }

    // 새 템플릿 생성
    const templateData: TablesInsert<"templates"> = {
      name: name.trim(),
      description: description?.trim() || "",
      detailed_description: detailed_description?.trim() || null,
      thumbnail_url: thumbnail_url?.trim() || "",
      is_public: Boolean(is_public),
      is_shop_visible: false, // 기본값은 상점에 노출되지 않음
    };

    const { data: newTemplate, error: insertError } = await supabase
      .from("templates")
      .insert(templateData)
      .select()
      .single();

    if (insertError) {
      console.error("Template creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "템플릿이 성공적으로 생성되었습니다.",
        template: newTemplate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Template creation error:", error);
    return NextResponse.json(
      { error: "템플릿 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
