import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      message: '로그아웃 되었습니다.'
    });

    // 인증 토큰 쿠키 제거 (token과 auth-token 모두 제거)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0, // 즉시 만료
      expires: new Date(0), // 과거 날짜로 설정하여 확실히 제거
      path: '/'
    };

    response.cookies.set('token', '', cookieOptions);
    response.cookies.set('auth-token', '', cookieOptions);

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}