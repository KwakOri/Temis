import { NextRequest, NextResponse } from 'next/server';
import { signJWT, verifyPassword } from '@/lib/auth';
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

    // 비밀번호 검증
    if (!user.password) {
      return NextResponse.json(
        { error: '비밀번호가 설정되지 않은 계정입니다.' },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    // 응답 생성
    const response = NextResponse.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

    // HTTP-Only 쿠키로 토큰 설정
    response.cookies.set('auth-token', token, {
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