import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/middleware';
import { TablesInsert } from '@/types/supabase';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await request.json();
    const { template_id, depositor_name, message } = body;

    if (!template_id || !depositor_name) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 템플릿 존재 및 공개 여부 확인
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id, name, is_public')
      .eq('id', template_id)
      .eq('is_public', true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: '유효하지 않은 템플릿입니다.' },
        { status: 404 }
      );
    }

    // 구매 신청 데이터 저장
    const purchaseData: TablesInsert<'purchase_requests'> = {
      template_id,
      customer_name: depositor_name, // 입금자명을 customer_name으로 저장
      customer_email: user.email || '',
      customer_phone: String(user.phone || ''), // 전화번호가 있으면 사용, 없으면 빈 값
      message,
      status: 'pending'
    };

    const { data: purchaseRequest, error: insertError } = await supabase
      .from('purchase_requests')
      .insert(purchaseData)
      .select()
      .single();

    if (insertError) {
      console.error('Purchase request insert error:', insertError);
      return NextResponse.json(
        { error: '구매 신청 저장에 실패했습니다.' },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      message: '구매 신청이 접수되었습니다. 곧 연락드리겠습니다.',
      template_name: template.name
    });

  } catch (error) {
    console.error('Purchase request error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}