import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase';

/**
 * 구매 요청 수정/삭제 API
 * PUT /api/user/purchase-requests/[id] - 수정
 * DELETE /api/user/purchase-requests/[id] - 삭제
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 확인
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { id } = params;
    const body = await request.json();
    const { depositor_name, message } = body;

    // 1. 기존 요청 확인 (사용자 본인의 요청인지, 수정 가능한 상태인지)
    const { data: existingRequest, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', id)
      .eq('customer_email', user.email)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 상태 확인 (pending 상태만 수정 가능)
    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 요청은 수정할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 3. 요청 수정
    const { data: updatedRequest, error: updateError } = await supabase
      .from('purchase_requests')
      .update({
        customer_name: depositor_name,
        message,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Purchase request update error:', updateError);
      return NextResponse.json(
        { error: '요청 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest
    });

  } catch (error) {
    console.error('Purchase request update API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 확인
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { id } = params;

    // 1. 기존 요청 확인 (사용자 본인의 요청인지, 삭제 가능한 상태인지)
    const { data: existingRequest, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', id)
      .eq('customer_email', user.email)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: '요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 상태 확인 (pending 상태만 삭제 가능)
    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 요청은 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 3. 요청 삭제
    const { error: deleteError } = await supabase
      .from('purchase_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Purchase request delete error:', deleteError);
      return NextResponse.json(
        { error: '요청 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Purchase request delete API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}