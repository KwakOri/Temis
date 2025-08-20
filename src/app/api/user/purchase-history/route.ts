import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase';

/**
 * 사용자의 구매 내역 조회 API
 * GET /api/user/purchase-history
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // 1. 구매 요청 내역 조회 (이메일 기준)
    const { data: purchaseRequests, error: requestError } = await supabase
      .from('purchase_requests')
      .select(`
        *,
        template:templates(*)
      `)
      .eq('customer_email', user.email)
      .order('created_at', { ascending: false });

    if (requestError) {
      console.error('Purchase requests fetch error:', requestError);
      return NextResponse.json(
        { error: '구매 요청 내역 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 2. 승인된 템플릿 권한 조회 (실제 구매 완료된 템플릿들)
    const { data: templateAccess, error: accessError } = await supabase
      .from('template_access')
      .select(`
        *,
        template:templates(*)
      `)
      .eq('user_id', user.userId)
      .order('granted_at', { ascending: false });

    if (accessError) {
      console.error('Template access fetch error:', accessError);
      return NextResponse.json(
        { error: '템플릿 권한 내역 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      purchaseRequests: purchaseRequests || [],
      templateAccess: templateAccess || []
    });

  } catch (error) {
    console.error('Purchase history API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}