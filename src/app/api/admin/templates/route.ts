import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  
  const adminCheck = await requireAdmin(request);
  
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }


  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 모든 템플릿 조회 (관리자는 모든 템플릿 볼 수 있음)
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }


    return NextResponse.json({
      success: true,
      templates: templates || [],
      pagination: {
        limit,
        offset,
        total: templates?.length || 0
      }
    });
  } catch (error) {
    console.error('Admin templates fetch error:', error);
    return NextResponse.json(
      { error: '템플릿 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}