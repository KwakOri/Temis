import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  // 인증 미들웨어 사용
  const authResult = await requireAuth(request);
  
  // 인증 실패한 경우
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Supabase에서 최신 사용자 정보 조회 (선택적)
  const currentUser = await UserService.findById(user.userId);
  
  // 인증된 사용자만 접근 가능한 데이터 반환
  return NextResponse.json({
    message: '보호된 리소스에 성공적으로 접근했습니다.',
    user: currentUser || {
      id: user.userId,
      email: user.email,
      name: user.name
    },
    serverTime: new Date().toISOString(),
    secretData: '이 데이터는 인증된 사용자만 볼 수 있습니다.'
  });
}

export async function POST(request: NextRequest) {
  // 인증 미들웨어 사용
  const authResult = await requireAuth(request);
  
  // 인증 실패한 경우
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const body = await request.json();

  // Supabase에서 최신 사용자 정보 조회 (선택적)
  const currentUser = await UserService.findById(user.userId);

  return NextResponse.json({
    message: '보호된 POST 요청이 성공적으로 처리되었습니다.',
    user: currentUser || {
      id: user.userId,
      email: user.email,
      name: user.name
    },
    receivedData: body,
    processedAt: new Date().toISOString()
  });
}