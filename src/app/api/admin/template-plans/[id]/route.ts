import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await request.json();
    const { id: planId } = await params;

    // 플랜이 존재하는지 확인
    const { data: existingPlan, error: checkError } = await supabase
      .from("template_plans")
      .select("id, template_id")
      .eq("id", planId)
      .single();

    if (checkError || !existingPlan) {
      return NextResponse.json(
        { error: "템플릿 플랜을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트할 필드들 준비
    const updateData: Partial<Tables<"template_plans">> = {};

    if (body.is_artist !== undefined) updateData.is_artist = body.is_artist;
    if (body.is_memo !== undefined) updateData.is_memo = body.is_memo;
    if (body.is_multi_schedule !== undefined)
      updateData.is_multi_schedule = body.is_multi_schedule;
    if (body.is_guerrilla !== undefined)
      updateData.is_guerrilla = body.is_guerrilla;
    if (body.is_offline_memo !== undefined)
      updateData.is_offline_memo = body.is_offline_memo;

    // 플랜 정보 업데이트
    const { data: updatedPlan, error: updateError } = await supabase
      .from("template_plans")
      .update(updateData)
      .eq("id", planId)
      .select()
      .single();

    if (updateError) {
      console.error("Template plan update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "템플릿 플랜이 성공적으로 업데이트되었습니다.",
      plan: updatedPlan,
    });
  } catch (error) {
    console.error("Template plan update error:", error);
    return NextResponse.json(
      { error: "템플릿 플랜 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id: planId } = await params;

    // 플랜이 존재하는지 확인
    const { data: existingPlan, error: checkError } = await supabase
      .from("template_plans")
      .select("id")
      .eq("id", planId)
      .single();

    if (checkError || !existingPlan) {
      return NextResponse.json(
        { error: "템플릿 플랜을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 플랜 삭제
    const { error: deleteError } = await supabase
      .from("template_plans")
      .delete()
      .eq("id", planId);

    if (deleteError) {
      console.error("Template plan deletion error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "템플릿 플랜이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Template plan deletion error:", error);
    return NextResponse.json(
      { error: "템플릿 플랜 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
