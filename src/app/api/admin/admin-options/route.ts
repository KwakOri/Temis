import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { CreateAdminOptionInput } from "@/types/adminOption";
import { NextRequest, NextResponse } from "next/server";

// GET: 모든 관리자 옵션 조회 (카테고리별 필터링 가능)
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = supabase
      .from("admin_options")
      .select("*")
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
      { error: "관리자 옵션 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 새 관리자 옵션 생성
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body: CreateAdminOptionInput = await request.json();
    const { category, label, value, description, price, is_discount, is_enabled } = body;

    // 입력 검증
    if (!category || category.trim().length === 0) {
      return NextResponse.json(
        { error: "카테고리는 필수입니다." },
        { status: 400 }
      );
    }

    if (!label || label.trim().length === 0) {
      return NextResponse.json(
        { error: "옵션 이름은 필수입니다." },
        { status: 400 }
      );
    }

    if (!value || value.trim().length === 0) {
      return NextResponse.json(
        { error: "옵션 값은 필수입니다." },
        { status: 400 }
      );
    }

    // 중복 value 검사 (같은 카테고리 내에서)
    const { data: existingOption, error: checkError } = await supabase
      .from("admin_options")
      .select("id")
      .eq("category", category.trim())
      .eq("value", value.trim())
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Admin option value check error:", checkError);
      throw checkError;
    }

    if (existingOption) {
      return NextResponse.json(
        { error: "해당 카테고리에 이미 존재하는 옵션 값입니다." },
        { status: 409 }
      );
    }

    // 새 옵션 생성
    const optionData = {
      category: category.trim(),
      label: label.trim(),
      value: value.trim(),
      description: description?.trim() || null,
      price: price || 0,
      is_discount: Boolean(is_discount),
      is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : true,
    };

    const { data: newOption, error: insertError } = await supabase
      .from("admin_options")
      .insert(optionData)
      .select()
      .single();

    if (insertError) {
      console.error("Admin option creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "관리자 옵션이 성공적으로 생성되었습니다.",
        option: newOption,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin option creation error:", error);
    return NextResponse.json(
      { error: "관리자 옵션 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
