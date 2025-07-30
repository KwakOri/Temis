import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);
  
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { is_public } = body;

    if (typeof is_public !== 'boolean') {
      return NextResponse.json(
        { error: 'is_public 값이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('templates')
      .update({ 
        is_public,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '템플릿이 수정되었습니다.',
      template
    });
  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json(
      { error: '템플릿 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}