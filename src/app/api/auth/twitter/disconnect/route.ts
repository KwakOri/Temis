import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    // Remove Twitter credentials from user record
    const { error: updateError } = await supabase
      .from('users')
      .update({
        twitter_access_token: null,
        twitter_access_token_secret: null,
        twitter_user_id: null,
        twitter_username: null,
        twitter_connected_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', Number(user.userId));

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { error: '트위터 계정 연동 해제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '트위터 계정 연동이 해제되었습니다.'
    });

  } catch (error) {
    console.error('Twitter disconnect error:', error);
    return NextResponse.json(
      { error: '트위터 계정 연동 해제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}