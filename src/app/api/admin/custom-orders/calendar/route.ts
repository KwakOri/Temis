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

// 캘린더용 맞춤형 주문 조회 (마감일 기준)
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
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'startDate와 endDate 파라미터가 필요합니다.' 
      }, { status: 400 });
    }

    // 마감일이 있는 주문만 조회 (캘린더 표시용)
    const { data: orders, error } = await supabase
      .from('custom_timetable_orders')
      .select(`
        id,
        status,
        deadline,
        created_at,
        updated_at,
        order_requirements,
        price_quoted,
        admin_notes,
        users!user_id(id, name, email)
      `)
      .not('deadline', 'is', null)
      .gte('deadline', startDate)
      .lte('deadline', endDate)
      .order('deadline', { ascending: true });

    if (error) {
      console.error('Calendar orders database error:', error);
      return NextResponse.json(
        { 
          error: '캘린더 데이터 조회 중 오류가 발생했습니다.',
          details: error.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders: orders || [],
      dateRange: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}