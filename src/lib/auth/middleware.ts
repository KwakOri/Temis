import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractTokenFromRequest, extractTokenFromCookie, JWTPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

/**
 * 인증이 필요한 API Route에서 사용할 미들웨어
 * @param request - NextRequest 객체
 * @returns 인증된 사용자 정보 또는 에러 응답
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: JWTPayload } | NextResponse> {
  try {
    // Authorization 헤더에서 토큰 추출 시도
    let token = extractTokenFromRequest(request);
    
    // Authorization 헤더에 토큰이 없으면 쿠키에서 추출 시도
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      token = extractTokenFromCookie(cookieHeader);
    }

    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    // 토큰 검증
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다.' },
        { status: 401 }
      );
    }

    return { user: payload };

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return NextResponse.json(
      { error: '인증 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 검증하고, 없어도 통과)
 * @param request - NextRequest 객체
 * @returns 사용자 정보(있는 경우) 또는 null
 */
export async function optionalAuth(
  request: NextRequest
): Promise<{ user: JWTPayload | null }> {
  try {
    // Authorization 헤더에서 토큰 추출 시도
    let token = extractTokenFromRequest(request);
    
    // Authorization 헤더에 토큰이 없으면 쿠키에서 추출 시도
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      token = extractTokenFromCookie(cookieHeader);
    }

    if (!token) {
      return { user: null };
    }

    // 토큰 검증
    const payload = await verifyJWT(token);
    return { user: payload };

  } catch (error) {
    console.error('Optional authentication error:', error);
    return { user: null };
  }
}

/**
 * 역할 기반 접근 제어
 * @param request - NextRequest 객체
 * @param requiredRole - 필요한 역할
 * @returns 인증 및 권한 확인 결과
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: string
): Promise<{ user: JWTPayload } | NextResponse> {
  const authResult = await requireAuth(request);
  
  // 인증 실패한 경우
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // 역할 확인 (사용자 데이터에 role 필드가 있다고 가정)
  if (!user.role || user.role !== requiredRole) {
    return NextResponse.json(
      { error: '접근 권한이 없습니다.' },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * 관리자 권한이 필요한 API Route에서 사용할 미들웨어
 * @param request - NextRequest 객체
 * @returns 관리자 사용자 정보 또는 에러 응답
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: JWTPayload } | NextResponse> {
  return await requireRole(request, 'admin');
}