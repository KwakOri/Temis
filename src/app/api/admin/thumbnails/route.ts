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

    // 전체 썸네일 개수 조회
    const { count: totalCount, error: countError } = await supabase
      .from("thumbnails")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Supabase count error:", countError);
      throw countError;
    }

    // 모든 썸네일 조회 (관리자는 모든 썸네일 볼 수 있음)
    const { data: thumbnails, error } = await supabase
      .from("thumbnails")
      .select("*")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      thumbnails: thumbnails || [],
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
      },
    });
  } catch (error) {
    console.error("Admin thumbnails fetch error:", error);
    return NextResponse.json(
      { error: "썸네일 목록 조회 중 오류가 발생했습니다." },
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
        { error: "썸네일 이름은 필수입니다." },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "썸네일 이름은 100자를 초과할 수 없습니다." },
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
    const { data: existingThumbnail, error: checkError } = await supabase
      .from("thumbnails")
      .select("id")
      .eq("name", name.trim())
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Thumbnail name check error:", checkError);
      throw checkError;
    }

    if (existingThumbnail) {
      return NextResponse.json(
        { error: "이미 존재하는 썸네일 이름입니다." },
        { status: 409 }
      );
    }

    // 새 썸네일 생성
    const thumbnailData: TablesInsert<"thumbnails"> = {
      name: name.trim(),
      description: description?.trim() || "",
      detailed_description: detailed_description?.trim() || null,
      thumbnail_url: thumbnail_url?.trim() || "",
      is_public: Boolean(is_public),
      is_shop_visible: false, // 기본값은 상점에 노출되지 않음
    };

    const { data: newThumbnail, error: insertError } = await supabase
      .from("thumbnails")
      .insert(thumbnailData)
      .select()
      .single();

    if (insertError) {
      console.error("Thumbnail creation error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "썸네일이 성공적으로 생성되었습니다.",
        thumbnail: newThumbnail,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Thumbnail creation error:", error);
    return NextResponse.json(
      { error: "썸네일 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
