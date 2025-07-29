export * from './jwt';
export * from './password';
export * from './middleware';

import { NextRequest } from 'next/server';
import { requireAuth } from './middleware';
import { isAdmin as checkAdminRole } from './admin';

/**
 * 인증 상태 확인 래퍼 함수
 */
export async function isAuthenticated(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if ('user' in authResult) {
      return { isAuthenticated: true, user: authResult.user };
    } else {
      return { isAuthenticated: false, user: null };
    }
  } catch (error) {
    return { isAuthenticated: false, user: null };
  }
}

/**
 * 관리자 권한 확인 래퍼 함수
 */
export async function isAdmin(request: NextRequest) {
  try {
    const authResult = await isAuthenticated(request);
    
    if (!authResult.isAuthenticated || !authResult.user) {
      return { isAdmin: false, user: null };
    }
    
    const adminCheck = await checkAdminRole(authResult.user.userId);
    
    return { 
      isAdmin: adminCheck, 
      user: authResult.user 
    };
  } catch (error) {
    return { isAdmin: false, user: null };
  }
}