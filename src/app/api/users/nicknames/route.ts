import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

interface UserNickname {
  id: number;
  name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get("user_ids");

    if (!userIdsParam) {
      return NextResponse.json(
        { error: "user_ids는 필수 파라미터입니다." },
        { status: 400 }
      );
    }

    const userIds = userIdsParam
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id));

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "유효한 user_ids가 필요합니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .in("id", userIds);

    if (error) {
      throw error;
    }

    const userMap = new Map<number, UserNickname>(
      (data ?? []).map((user) => [user.id, { id: user.id, name: user.name }])
    );

    const users = userIds.map((id) => {
      const user = userMap.get(id);
      return {
        id,
        name: user?.name ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      users,
      userIds,
    });
  } catch (error) {
    console.error("Error fetching user nicknames:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "닉네임 조회에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
