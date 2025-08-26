import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const {
      template_id,
      title,
      price,
      features,
      requirements,
      delivery_time,
      purchase_instructions,
      sample_images,
    } = body;

    // 입력 검증
    if (!template_id || !title || price === undefined) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: "가격은 0원 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 템플릿이 존재하고 공개 템플릿인지 확인
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, is_public")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "템플릿을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!template.is_public) {
      return NextResponse.json(
        { error: "비공개 템플릿은 상품으로 등록할 수 없습니다." },
        { status: 400 }
      );
    }

    // 이미 상품이 등록되어 있는지 확인
    const { data: existingProduct, error: checkError } = await supabase
      .from("template_products")
      .select("id")
      .eq("template_id", template_id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Product check error:", checkError);
      throw checkError;
    }

    if (existingProduct) {
      return NextResponse.json(
        { error: "이미 상품이 등록된 템플릿입니다." },
        { status: 409 }
      );
    }

    // 새 상품 생성
    const { data: newProduct, error: insertError } = await supabase
      .from("template_products")
      .insert({
        template_id,
        title: title?.trim() || null,
        price: parseInt(price),
        features: features || [],
        requirements: requirements?.trim() || null,
        delivery_time: delivery_time ? parseInt(delivery_time) : null,
        purchase_instructions: purchase_instructions?.trim() || null,
        sample_images: sample_images || [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("Product creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "상품이 성공적으로 등록되었습니다.",
        product: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { error: "상품 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
