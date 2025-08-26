import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getFileUrl } from '@/lib/r2';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    console.log('📂 [Files API] Loading files for order:', orderId);
    
    // JWT 토큰 확인
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('📂 [Files API] User ID:', decoded.userId);

    // 주문이 해당 사용자의 것인지 확인
    const { data: order, error: orderError } = await supabase
      .from('custom_timetable_orders')
      .select('id')
      .eq('id', orderId)
      .eq('user_id', parseInt(decoded.userId, 10))
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

    console.log('📂 [Files API] Files found:', {
      total: filesWithUrls.length,
      characterImages: filesWithUrls.filter(f => f.file_category === 'character_image').length,
      references: filesWithUrls.filter(f => f.file_category === 'reference').length
    });

    return NextResponse.json({
      files: filesWithUrls
    });

  } catch (error) {
    console.error('📂 [Files API] Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}