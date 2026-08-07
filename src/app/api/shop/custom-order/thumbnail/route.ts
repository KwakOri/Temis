import { getCurrentUserId } from "@/lib/auth/jwt";
import {
  assertOwnedThumbnailFiles,
  assertThumbnailOrderSubmissionEnabled,
  getThumbnailOrderById,
  listThumbnailOrders,
  parseThumbnailOrderPayload,
  parseThumbnailOrderUpdate,
  replaceThumbnailOrderFileLinks,
  ThumbnailOrderApiError,
} from "@/lib/custom-thumbnail-order";
import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";
import { NextRequest, NextResponse } from "next/server";

const toErrorResponse = (error: unknown, fallback: string) => {
  if (error instanceof ThumbnailOrderApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
};

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    await assertThumbnailOrderSubmissionEnabled();
    const payload = parseThumbnailOrderPayload(await request.json());
    await assertOwnedThumbnailFiles(
      userId,
      payload.sourceFileIds,
      payload.referenceFileIds,
    );

    const insertData: TablesInsert<"custom_thumbnail_orders"> = {
      user_id: userId,
      contact: payload.contact,
      purpose: payload.purpose,
      requirements: payload.requirements,
      text_requirements: payload.textRequirements || null,
      image_requirements: payload.imageRequirements || null,
      design_keywords: payload.designKeywords || null,
      canvas_width: 3840,
      canvas_height: 2160,
      portfolio_consent: payload.portfolioConsent,
      requested_deadline: payload.requestedDeadline,
      depositor_name: payload.depositorName,
      price_quoted: null,
      status: "pending",
    };

    const { data: order, error } = await supabaseAdminServer
      .from("custom_thumbnail_orders")
      .insert(insertData)
      .select()
      .single();
    if (error || !order) {
      throw error ?? new Error("empty custom thumbnail order response");
    }

    try {
      await replaceThumbnailOrderFileLinks({
        orderId: order.id,
        sourceFileIds: payload.sourceFileIds,
        referenceFileIds: payload.referenceFileIds,
      });
    } catch (fileError) {
      await supabaseAdminServer
        .from("custom_thumbnail_orders")
        .delete()
        .eq("id", order.id)
        .eq("user_id", userId);
      throw fileError;
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        message: "맞춤형 썸네일 제작 신청이 접수되었습니다.",
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error, "썸네일 주문 생성 중 오류가 발생했습니다.");
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const result = await listThumbnailOrders({
      userId,
      page: 1,
      limit: 100,
      sortBy: "created_at",
      sortOrder: "desc",
    });
    return NextResponse.json({ orders: result.orders });
  } catch (error) {
    return toErrorResponse(
      error,
      "썸네일 주문 내역 조회 중 오류가 발생했습니다.",
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const rawBody = await request.json();
    const orderId =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? (rawBody as Record<string, unknown>).orderId
        : null;
    if (typeof orderId !== "string" || !orderId) {
      return NextResponse.json(
        { error: "주문 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const { data: existingOrder, error: existingError } =
      await supabaseAdminServer
        .from("custom_thumbnail_orders")
        .select("id")
        .eq("id", orderId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();
    if (existingError) throw existingError;
    if (!existingOrder) {
      return NextResponse.json(
        { error: "대기 중인 본인 주문만 수정할 수 있습니다." },
        { status: 403 },
      );
    }

    const payload = parseThumbnailOrderUpdate(rawBody);
    const updateData: TablesUpdate<"custom_thumbnail_orders"> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.contact !== undefined) updateData.contact = payload.contact;
    if (payload.purpose !== undefined) updateData.purpose = payload.purpose;
    if (payload.requirements !== undefined) {
      updateData.requirements = payload.requirements;
    }
    if (payload.textRequirements !== undefined) {
      updateData.text_requirements = payload.textRequirements || null;
    }
    if (payload.imageRequirements !== undefined) {
      updateData.image_requirements = payload.imageRequirements || null;
    }
    if (payload.designKeywords !== undefined) {
      updateData.design_keywords = payload.designKeywords || null;
    }
    if (payload.requestedDeadline !== undefined) {
      updateData.requested_deadline = payload.requestedDeadline;
    }
    if (payload.portfolioConsent !== undefined) {
      updateData.portfolio_consent = payload.portfolioConsent;
    }
    if (payload.depositorName !== undefined) {
      updateData.depositor_name = payload.depositorName;
    }

    const hasFileUpdate =
      payload.sourceFileIds !== undefined ||
      payload.referenceFileIds !== undefined;
    if (hasFileUpdate) {
      const current = await getThumbnailOrderById(orderId);
      const currentSourceIds =
        current?.files
          ?.filter((file) => file.role === "source")
          .map((file) => file.file_id) ?? [];
      const currentReferenceIds =
        current?.files
          ?.filter((file) => file.role === "reference")
          .map((file) => file.file_id) ?? [];
      const sourceFileIds = payload.sourceFileIds ?? currentSourceIds;
      const referenceFileIds = payload.referenceFileIds ?? currentReferenceIds;
      await assertOwnedThumbnailFiles(userId, sourceFileIds, referenceFileIds);
      await replaceThumbnailOrderFileLinks({
        orderId,
        sourceFileIds: payload.sourceFileIds,
        referenceFileIds: payload.referenceFileIds,
      });
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { error: "수정할 항목이 없습니다." },
        { status: 400 },
      );
    }

    const { data: order, error } = await supabaseAdminServer
      .from("custom_thumbnail_orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select()
      .single();
    if (error || !order) throw error ?? new Error("empty update response");

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return toErrorResponse(error, "썸네일 주문 수정 중 오류가 발생했습니다.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const orderId = new URL(request.url).searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json(
        { error: "주문 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const { data: order, error: fetchError } = await supabaseAdminServer
      .from("custom_thumbnail_orders")
      .select("id")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!order) {
      return NextResponse.json(
        { error: "대기 중인 본인 주문만 취소할 수 있습니다." },
        { status: 403 },
      );
    }

    const { error: updateError } = await supabaseAdminServer
      .from("custom_thumbnail_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "썸네일 주문 취소 중 오류가 발생했습니다.");
  }
}
