import { requireAuth } from "@/lib/auth/middleware";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { NextRequest, NextResponse } from "next/server";

/**
 * 로그인한 사용자가 접근 권한을 가진 template_id 목록을 반환한다.
 * 다른 사용자의 접근 목록은 절대 조회할 수 없다(토큰의 user id만 사용).
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const { data, error } = await supabaseAdminServer
      .from("template_access")
      .select("template_id")
      .eq("user_id", Number(user.userId));

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      templateIds: (data ?? []).map((row) => row.template_id),
    });
  } catch (error) {
    console.error("User template access fetch error:", error);
    return NextResponse.json(
      { error: "접근 권한을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
