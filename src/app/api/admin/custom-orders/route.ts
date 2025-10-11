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
    const token = cookieStore.get('token')?.value;

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
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const offset = (page - 1) * limit;
    

    // 정렬 설정
    const ascending = sortOrder === 'asc';

    // 현재 테이블 쿼리
    let currentQuery = supabase
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
      .order(sortBy, { ascending });

    // 레거시 테이블 쿼리 (users 테이블과 관계 없음)
    let legacyQuery = supabase
      .from('legacy_custom_orders')
      .select(`*`)
      .order(sortBy, { ascending });

    // 상태 필터링
    if (status && status !== 'all' && status !== 'default') {
      currentQuery = currentQuery.eq('status', status);
      legacyQuery = legacyQuery.eq('status', status);
    } else if (status === 'default') {
      // 기본 필터: completed와 cancelled 제외
      currentQuery = currentQuery.not('status', 'in', '("completed","cancelled")');
      legacyQuery = legacyQuery.not('status', 'in', '("completed","cancelled")');
    }

    // 두 테이블에서 데이터 가져오기
    const [currentResult, legacyResult] = await Promise.all([
      currentQuery,
      legacyQuery
    ]);

    if (currentResult.error) {
      console.error('Current orders database error:', currentResult.error);
      return NextResponse.json(
        { 
          error: '주문 내역 조회 중 오류가 발생했습니다.',
          details: currentResult.error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (legacyResult.error) {
      console.error('Legacy orders database error:', legacyResult.error);
      return NextResponse.json(
        { 
          error: '레거시 주문 내역 조회 중 오류가 발생했습니다.',
          details: legacyResult.error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // 레거시 주문에 files와 users 필드를 추가하여 형태 통일
    const legacyOrders = (legacyResult.data || []).map(order => ({
      ...order,
      files: null,
      users: {
        id: null,
        name: order.nickname || order.email,
        email: order.email
      },
      // legacy 테이블에는 이 필드들이 없으므로 기본값 설정
      order_requirements: '레거시 주문 (세부사항 없음)',
      user_id: null
    }));

    // 두 결과를 합치고 정렬
    const allOrders = [...(currentResult.data || []), ...legacyOrders]
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          const deadlineA = a.deadline;
          const deadlineB = b.deadline;
          
          // 마감일이 없는 경우 정렬에서 뒤로
          if (!deadlineA && !deadlineB) return 0;
          if (!deadlineA) return 1;
          if (!deadlineB) return -1;
          
          if (ascending) {
            return new Date(deadlineA).getTime() - new Date(deadlineB).getTime();
          } else {
            return new Date(deadlineB).getTime() - new Date(deadlineA).getTime();
          }
        } else {
          // created_at으로 정렬
          const createdA = a.created_at || '';
          const createdB = b.created_at || '';
          
          if (ascending) {
            return new Date(createdA).getTime() - new Date(createdB).getTime();
          } else {
            return new Date(createdB).getTime() - new Date(createdA).getTime();
          }
        }
      });

    // 페이지네이션 적용
    const orders = allOrders.slice(offset, offset + limit);

    // 전체 개수 조회
    let currentCountQuery = supabase
      .from('custom_timetable_orders')
      .select('id', { count: 'exact', head: true });
    
    let legacyCountQuery = supabase
      .from('legacy_custom_orders')
      .select('id', { count: 'exact', head: true });

    if (status && status !== 'all' && status !== 'default') {
      currentCountQuery = currentCountQuery.eq('status', status);
      legacyCountQuery = legacyCountQuery.eq('status', status);
    } else if (status === 'default') {
      // 기본 필터: completed와 cancelled 제외
      currentCountQuery = currentCountQuery.not('status', 'in', '("completed","cancelled")');
      legacyCountQuery = legacyCountQuery.not('status', 'in', '("completed","cancelled")');
    }

    const [currentCountResult, legacyCountResult] = await Promise.all([
      currentCountQuery,
      legacyCountQuery
    ]);

    const totalCount = (currentCountResult.count || 0) + (legacyCountResult.count || 0);

    // 디버그 정보 추가

    return NextResponse.json({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      },
      debug: {
        ordersCount: orders?.length || 0,
        currentOrdersCount: currentResult.data?.length || 0,
        legacyOrdersCount: legacyResult.data?.length || 0,
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