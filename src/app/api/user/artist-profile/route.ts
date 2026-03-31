import { requireAuth } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { TablesUpdate } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("user_id", Number(user.userId))
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      artist: data || null,
    });
  } catch (error) {
    console.error("User artist profile fetch error:", error);
    return NextResponse.json(
      { error: "작가 프로필을 조회하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();

    const { data: existingArtist, error: existingArtistError } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", Number(user.userId))
      .single();

    if (existingArtistError || !existingArtist) {
      return NextResponse.json(
        { error: "연결된 작가 계정이 없습니다." },
        { status: 404 }
      );
    }

    const updateData: TablesUpdate<"artists"> = {};

    if (body.name !== undefined) updateData.name = body.name?.trim() || "";
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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "수정할 항목이 없습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("artists")
      .update(updateData)
      .eq("id", existingArtist.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      artist: data,
    });
  } catch (error) {
    console.error("User artist profile update error:", error);
    return NextResponse.json(
      { error: "작가 프로필을 저장하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
