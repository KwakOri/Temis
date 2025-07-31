import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from './middleware';
import { UserService } from '../supabase';

/**
 * 관리자 권한 확인
 * @param userId - 사용자 ID
 * @returns 관리자 여부
 */
export async function isAdmin(userId: string | number): Promise<boolean> {
  try {
    const user = await UserService.findById(String(userId));
    
    // 관리자 이메일 목록 (환경 변수 또는 하드코딩)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@example.com'];
    
    return user ? adminEmails.includes(user.email || '') : false;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

/**
 * 관리자 권한이 필요한 API Route에서 사용할 미들웨어 (레거시)
 */
export async function requireAdminLegacy(request: NextRequest) {
  try {
    // 먼저 인증 확인
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // 인증 실패
    }

    const { user } = authResult;

    // 관리자 권한 확인
    const adminCheck = await isAdmin(user.userId);
    
    if (!adminCheck) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    return { user };
  } catch (error) {
    console.error('Admin middleware error:', error);
    return NextResponse.json(
      { error: '권한 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

