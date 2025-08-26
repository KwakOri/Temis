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

    // 템플릿이 존재하는지 확인
    const { data: existingTemplate, error: checkError } = await supabase
      .from('templates')
      .select('id, name, is_public')
      .eq('id', id)
      .single();

    if (checkError || !existingTemplate) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트할 필드들 준비
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name?.trim() || null;
    if (body.description !== undefined) updateData.description = body.description?.trim() || '';
    if (body.detailed_description !== undefined) updateData.detailed_description = body.detailed_description?.trim() || null;
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url?.trim() || '';
    if (body.is_public !== undefined) updateData.is_public = Boolean(body.is_public);
    if (body.is_shop_visible !== undefined) updateData.is_shop_visible = Boolean(body.is_shop_visible);

    // is_shop_visible 업데이트 시 추가 검증
    if (body.is_shop_visible !== undefined) {
      // 비공개 템플릿은 상점에 노출할 수 없음
      if (body.is_shop_visible && !existingTemplate.is_public) {
        return NextResponse.json(
          { error: '비공개 템플릿은 상점에 노출할 수 없습니다.' },
          { status: 400 }
        );
      }

      // 상점에 노출하려면 template_products가 있어야 함
      if (body.is_shop_visible) {
        const { data: product, error: productError } = await supabase
          .from('template_products')
          .select('id')
          .eq('template_id', id)
          .single();

        if (productError || !product) {
          return NextResponse.json(
            { error: '상점에 노출하려면 먼저 상품을 등록해야 합니다.' },
            { status: 400 }
          );
        }
      }
    }

    // 업데이트 데이터에 updated_at 추가
    updateData.updated_at = new Date().toISOString();

    // 템플릿 정보 업데이트
    const { data: template, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Template update error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: '템플릿이 성공적으로 업데이트되었습니다.',
      template
    });
  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json(
      { error: '템플릿 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}