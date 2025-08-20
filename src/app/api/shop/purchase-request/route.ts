import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, customer_name, customer_email, customer_phone, message } = body;

    if (!template_id || !customer_name || !customer_email || !customer_phone) {
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

    // TODO: 구매 신청 데이터를 저장할 purchase_requests 테이블 생성 필요
    // 임시로 콘솔에 로그만 출력
    console.log('Purchase request received:', {
      template_id,
      template_name: template.name,
      customer_name,
      customer_email,
      customer_phone,
      message,
      created_at: new Date().toISOString()
    });

    // TODO: 이메일 알림 발송 (관리자에게)
    // TODO: 고객에게 안내 이메일 발송

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