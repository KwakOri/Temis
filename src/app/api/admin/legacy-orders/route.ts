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

// 레거시 주문 목록 조회
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

    // 레거시 주문 조회
    const { data: orders, error } = await supabase
      .from('legacy_custom_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '레거시 주문 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders: orders || []
    });

  } catch (error) {
    console.error('Legacy orders fetch error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 레거시 주문 생성
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { email, nickname, status, deadline } = body;

    // 입력 검증
    if (!email || !nickname || !status) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }

    // 레거시 주문 생성
    const { data: newOrder, error } = await supabase
      .from('legacy_custom_orders')
      .insert({
        email,
        nickname,
        status,
        deadline: deadline || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '레거시 주문 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: newOrder });

  } catch (error) {
    console.error('Legacy order create error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}