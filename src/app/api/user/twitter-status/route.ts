import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    // Get user's Twitter connection status
    const { data: userData, error } = await supabase
      .from('users')
      .select('twitter_user_id, twitter_username, twitter_connected_at')
      .eq('id', Number(user.userId))
      .single();

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: '사용자 정보를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    const isConnected = !!(userData?.twitter_user_id && userData?.twitter_username);

    return NextResponse.json({
      success: true,
      isConnected,
      twitterUsername: userData?.twitter_username || null,
      connectedAt: userData?.twitter_connected_at || null
    });

  } catch (error) {
    console.error('Twitter status check error:', error);
    return NextResponse.json(
      { error: '트위터 연동 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}