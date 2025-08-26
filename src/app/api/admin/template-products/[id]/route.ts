import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminCheck = await requireAdmin(request);
  
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const productId = params.id;

    // 상품이 존재하는지 확인
    const { data: existingProduct, error: checkError } = await supabase
      .from('template_products')
      .select('id, template_id')
      .eq('id', productId)
      .single();

    if (checkError || !existingProduct) {
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트할 필드들 준비
    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title?.trim() || null;
    if (body.price !== undefined) updateData.price = parseInt(body.price);
    if (body.features !== undefined) updateData.features = body.features;
    if (body.requirements !== undefined) updateData.requirements = body.requirements?.trim() || null;
    if (body.delivery_time !== undefined) updateData.delivery_time = body.delivery_time ? parseInt(body.delivery_time) : null;
    if (body.purchase_instructions !== undefined) updateData.purchase_instructions = body.purchase_instructions?.trim() || null;
    if (body.sample_images !== undefined) updateData.sample_images = body.sample_images || [];
    if (body.is_available !== undefined) updateData.is_available = Boolean(body.is_available);

    // 가격 검증
    if (updateData.price !== undefined && updateData.price < 0) {
      return NextResponse.json(
        { error: '가격은 0원 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 상품 정보 업데이트
    const { data: updatedProduct, error: updateError } = await supabase
      .from('template_products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (updateError) {
      console.error('Product update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: '상품 정보가 성공적으로 업데이트되었습니다.',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { error: '상품 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}