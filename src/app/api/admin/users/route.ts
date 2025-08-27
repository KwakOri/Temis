import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { UserService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 사용자 목록과 전체 수를 병렬로 조회
    const [users, totalCount] = await Promise.all([
      UserService.findAll(limit, offset),
      UserService.countAll()
    ]);

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at
      })),
      pagination: {
        limit,
        offset,
        total: totalCount
      }
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json(
      { error: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}