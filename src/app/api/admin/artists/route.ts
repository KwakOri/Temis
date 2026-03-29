import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("is_active");

    let query = supabase
      .from("artists")
      .select("*")
      .order("created_at", { ascending: false });

    if (isActive === "true") {
      query = query.eq("is_active", true);
    }

    if (isActive === "false") {
      query = query.eq("is_active", false);
    }

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},bio.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      artists: data || [],
    });
  } catch (error) {
    console.error("Admin artists fetch error:", error);
    return NextResponse.json(
      { error: "작가 목록 조회 중 오류가 발생했습니다." },
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
      slug,
      bio,
      profile_image_url,
      contact_email,
      instagram_url,
      youtube_url,
      website_url,
      is_active,
    } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "작가 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const artistData: TablesInsert<"artists"> = {
      name: name.trim(),
      slug: slug?.trim() ? toSlug(slug.trim()) : toSlug(name),
      bio: bio?.trim() || null,
      profile_image_url: profile_image_url?.trim() || null,
      contact_email: contact_email?.trim() || null,
      instagram_url: instagram_url?.trim() || null,
      youtube_url: youtube_url?.trim() || null,
      website_url: website_url?.trim() || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    };

    const { data, error } = await supabase
      .from("artists")
      .insert(artistData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 사용 중인 슬러그입니다." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        artist: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin artist creation error:", error);
    return NextResponse.json(
      { error: "작가 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

