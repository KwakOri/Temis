import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesInsert } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

const USER_LINKED_CONSTRAINT = "idx_artists_user_id_unique";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseOptionalUserId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isUserLinkedConflict(error: {
  code?: string;
  message?: string;
  details?: string | null;
}): boolean {
  if (error.code !== "23505") {
    return false;
  }

  const messageAndDetails = `${error.message || ""} ${error.details || ""}`;
  return (
    messageAndDetails.includes(USER_LINKED_CONSTRAINT) ||
    messageAndDetails.includes("artists_user_id") ||
    messageAndDetails.includes("(user_id)")
  );
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
      .select(
        `
        *,
        linked_user:users!artists_user_id_fkey(id, name, email)
      `
      )
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
      user_id,
    } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "작가 이름은 필수입니다." },
        { status: 400 }
      );
    }

    const parsedUserId = parseOptionalUserId(user_id);
    if (Number.isNaN(parsedUserId)) {
      return NextResponse.json(
        { error: "연결할 사용자 ID 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (parsedUserId !== null) {
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", parsedUserId)
        .single();

      if (userError || !userRow) {
        return NextResponse.json(
          { error: "연결할 사용자를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
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
      user_id: parsedUserId,
    };

    const { data, error } = await supabase
      .from("artists")
      .insert(artistData)
      .select(
        `
        *,
        linked_user:users!artists_user_id_fkey(id, name, email)
      `
      )
      .single();

    if (error) {
      if (isUserLinkedConflict(error)) {
        return NextResponse.json(
          { error: "이미 다른 작가에 연결된 사용자입니다." },
          { status: 409 }
        );
      }
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
