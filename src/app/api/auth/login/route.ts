import { NextRequest, NextResponse } from 'next/server';
import { signJWT } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';
import { UserService } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 입력 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Supabase에서 사용자 조회
    const user = await UserService.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: '존재하지 않는 사용자입니다.' },
        { status: 401 }
      );
    }

    // 계정 인증 상태 확인
    if (user.role === 'unauthorized') {
      return NextResponse.json(
        { 
          error: '이메일 인증이 완료되지 않은 계정입니다. 이메일을 확인하여 인증을 완료해 주세요.',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      );
    }

    // 비밀번호 검증
    if (!user.password) {
      return NextResponse.json(
        { error: '비밀번호가 설정되지 않은 계정입니다.' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 사용자의 role 확인 (admin은 이미 DB에 저장되어 있음)
    const userRole = user.role || 'user';
    
    // 관리자 여부 확인 (환경변수 기반 보조 체크)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const isAdminByEmail = adminEmails.includes(user.email);
    
    // DB role이 우선, 환경변수는 보조
    const finalRole = userRole === 'admin' || isAdminByEmail ? 'admin' : 'user';

    // JWT 토큰 생성
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: finalRole
    });

    // 응답 생성
    const response = NextResponse.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: finalRole,
        isAdmin: finalRole === 'admin'
      }
    });

    // HTTP-Only 쿠키로 토큰 설정
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}