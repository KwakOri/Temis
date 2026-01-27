import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getFileUrl } from '@/lib/r2';
import { getCurrentUserId } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 주문이 해당 사용자의 것인지 확인
    const { data: order, error: orderError } = await supabase
      .from('custom_timetable_orders')
      .select('id')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 주문에 연결된 파일들 조회
    const { data: files, error } = await supabase
      .from('files')
      .select('id, file_key, original_name, file_size, mime_type, file_category, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('📂 [Files API] Database error:', error);
      return NextResponse.json({ error: '파일 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // URL 추가
    const filesWithUrls = files.map(file => ({
      ...file,
      url: getFileUrl(file.file_key)
    }));

    return NextResponse.json({
      files: filesWithUrls
    });

  } catch (error) {
    console.error('📂 [Files API] Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
