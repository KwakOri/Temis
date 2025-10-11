import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractTokenFromRequest, extractTokenFromCookie } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 추출 시도
    let token = extractTokenFromRequest(request);
    
    // Authorization 헤더에 토큰이 없으면 쿠키에서 추출 시도
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      token = extractTokenFromCookie(cookieHeader, 'token');
    }

    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      );
    }

    // 토큰 검증
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 토큰이 유효한 경우 사용자 정보 반환
    return NextResponse.json({
      message: '토큰이 유효합니다.',
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role || 'user',
        isAdmin: payload.role === 'admin'
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: '토큰 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST 요청도 동일하게 처리 (클라이언트에서 body에 토큰을 보낼 수 있음)
  try {
    const body = await request.json();
    const { token: bodyToken } = body;

    // body에서 토큰을 받았을 때
    let token = bodyToken;
    
    // body에 토큰이 없으면 헤더나 쿠키에서 추출
    if (!token) {
      token = extractTokenFromRequest(request);
      
      if (!token) {
        const cookieHeader = request.headers.get('cookie');
        token = extractTokenFromCookie(cookieHeader, 'token');
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 없습니다.' },
        { status: 401 }
      );
    }

    // 토큰 검증
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: '토큰이 유효합니다.',
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role || 'user',
        isAdmin: payload.role === 'admin'
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: '토큰 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}