import { NextRequest, NextResponse } from 'next/server';
import { signJWT, verifyPassword } from '@/lib/auth';

// 임시 사용자 데이터 (실제로는 데이터베이스에서 가져와야 함)
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeSwJeJ5pFsI9/9vq', // 'password123'
    name: '관리자'
  },
  {
    id: '2',
    email: 'user@example.com', 
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeSwJeJ5pFsI9/9vq', // 'password123'
    name: '사용자'
  }
];

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

    // 사용자 조회 (실제로는 데이터베이스에서 조회)
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      return NextResponse.json(
        { error: '존재하지 않는 사용자입니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 검증
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