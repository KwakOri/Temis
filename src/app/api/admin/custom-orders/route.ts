import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

// 관리자 권한 확인
async function checkAdminPermission(userId: number): Promise<boolean> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (error || !user) return false;

    // role이 admin이거나 관리자 이메일 목록에 포함된 경우
    if (user.role === 'admin') return true;

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    return adminEmails.includes(user.email);
  } catch {
    return false;
  }
}

// 모든 맞춤형 주문 내역 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
    
    // JWT 토큰 확인
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const userId = parseInt(decoded.userId, 10);

    // 관리자 권한 확인
    const isAdmin = await checkAdminPermission(userId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    // URL 파라미터 파싱
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    

    // 쿼리 구성 - 간단한 LEFT JOIN 방식으로 수정
    let query = supabase
      .from('custom_timetable_orders')
      .select(`
        *,
        users!user_id(id, name, email),
        files!order_id(
          id,
          file_key,
          original_name,
          file_size,
          mime_type,
          file_category,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    // 상태 필터링
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: '주문 내역 조회 중 오류가 발생했습니다.',
          details: error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // 전체 개수 조회
    let countQuery = supabase
      .from('custom_timetable_orders')
      .select('id', { count: 'exact', head: true });

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;

    // 디버그 정보 추가

    return NextResponse.json({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      debug: {
        ordersCount: orders?.length || 0,
        hasFiles: orders?.[0]?.files ? true : false
      }
    });

  } catch (error) {
    console.error('Admin orders fetch error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}