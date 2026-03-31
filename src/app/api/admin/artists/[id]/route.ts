import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesUpdate } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

const USER_LINKED_CONSTRAINT = "idx_artists_user_id_unique";
const SYSTEM_ARTIST_SLUGS = new Set(["temis"]);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const { data: existingArtist, error: existingArtistError } = await supabase
      .from("artists")
      .select("id, slug")
      .eq("id", id)
      .single();

    if (existingArtistError || !existingArtist) {
      return NextResponse.json(
        { error: "작가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updateData: TablesUpdate<"artists"> = {};

    if (body.name !== undefined) updateData.name = body.name?.trim() || "";
    if (body.slug !== undefined) updateData.slug = body.slug ? toSlug(body.slug) : null;
    if (body.bio !== undefined) updateData.bio = body.bio?.trim() || null;
    if (body.profile_image_url !== undefined)
      updateData.profile_image_url = body.profile_image_url?.trim() || null;
    if (body.contact_email !== undefined)
      updateData.contact_email = body.contact_email?.trim() || null;
    if (body.instagram_url !== undefined)
      updateData.instagram_url = body.instagram_url?.trim() || null;
    if (body.youtube_url !== undefined)
      updateData.youtube_url = body.youtube_url?.trim() || null;
    if (body.website_url !== undefined)
      updateData.website_url = body.website_url?.trim() || null;
    if (body.is_active !== undefined)
      updateData.is_active = Boolean(body.is_active);
    if (body.user_id !== undefined) {
      const parsedUserId = parseOptionalUserId(body.user_id);
      if (Number.isNaN(parsedUserId)) {
        return NextResponse.json(
          { error: "연결할 사용자 ID 형식이 올바르지 않습니다." },
          { status: 400 }
        );
      }

      if (parsedUserId !== null && SYSTEM_ARTIST_SLUGS.has(existingArtist.slug || "")) {
        return NextResponse.json(
          { error: "시스템 작가에는 사용자 계정을 연결할 수 없습니다." },
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

      updateData.user_id = parsedUserId;
    }

    const { data, error } = await supabase
      .from("artists")
      .update(updateData)
      .eq("id", id)
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

    return NextResponse.json({
      success: true,
      artist: data,
    });
  } catch (error) {
    console.error("Admin artist update error:", error);
    return NextResponse.json(
      { error: "작가 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;

    const { data: existingArtist, error: existingArtistError } = await supabase
      .from("artists")
      .select("id, slug")
      .eq("id", id)
      .single();

    if (existingArtistError || !existingArtist) {
      return NextResponse.json(
        { error: "작가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingArtist.slug === "temis") {
      return NextResponse.json(
        { error: "'테미스' 시스템 작가는 삭제할 수 없습니다." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("artists").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "템플릿에 연결된 작가는 삭제할 수 없습니다." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Admin artist delete error:", error);
    return NextResponse.json(
      { error: "작가 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
