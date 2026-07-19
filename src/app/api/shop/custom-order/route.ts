import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/auth/jwt";
import {
  hasConflictingOtherOptions,
  normalizeOtherOptionValue,
} from "@/constants/constants";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // JWT 토큰에서 사용자 정보 추출
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const {
      priceQuoted,
      youtubeSnsAddress,
      emailDiscord,
      orderRequirements,
      hasCharacterImages,
      wantsOmakase,
      designKeywords,
      characterImageFileIds, // file IDs from uploaded files
      referenceFileIds, // file IDs from uploaded files
      selectedOptions: selectedOptionsInput, // Record<string, boolean>
      requiredArea, // 필수 영역 선택
      fastDelivery, // 빠른 마감 선택
      externalContract,
      depositorName,
    } = body;

    // 필수 필드 검증
    if (
      !youtubeSnsAddress ||
      !emailDiscord ||
      !orderRequirements ||
      !designKeywords ||
      !depositorName
    ) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 선택된 옵션 값들 추출 (영어 value로 저장)
    const selectedOptionValues = Object.entries(selectedOptionsInput || {})
      .filter(([, isSelected]) => isSelected)
      .map(([optionValue]) => normalizeOtherOptionValue(optionValue));

    // 필수 영역 옵션 추가 (영어 value로)
    if (requiredArea) {
      selectedOptionValues.push(normalizeOtherOptionValue(requiredArea));
    }

    // 빠른 마감 옵션 추가 (영어 value로)
    if (fastDelivery) {
      selectedOptionValues.push("fast_delivery_custom");
    }

    // 외부 계약 옵션 추가 (영어 value로)
    if (externalContract) {
      selectedOptionValues.push("external_contract");
    }

    // 최종 옵션 목록에 상충 옵션이 함께 포함되면 저장하지 않음
    if (hasConflictingOtherOptions(selectedOptionValues)) {
      return NextResponse.json(
        {
          error:
            '"후기 이벤트 참여"와 "포트폴리오 비공개" 옵션은 함께 선택할 수 없습니다.',
        },
        { status: 400 }
      );
    }

    // 데이터베이스에 주문 정보 저장 (옵션은 영어 value로 저장)
    const { data: order, error } = await supabase
      .from("custom_timetable_orders")
      .insert({
        user_id: userId,
        youtube_sns_address: youtubeSnsAddress,
        email_discord: emailDiscord,
        order_requirements: orderRequirements,
        has_character_images: hasCharacterImages,
        wants_omakase: wantsOmakase,
        design_keywords: designKeywords,
        price_quoted: priceQuoted,
        selected_options: selectedOptionValues,
        depositor_name: depositorName,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "주문 생성 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 주문 생성 성공 후 기존 파일들을 주문과 연결

    try {
      // 캐릭터 이미지 파일들을 주문과 연결
      if (characterImageFileIds && characterImageFileIds.length > 0) {
        const { error: characterError } = await supabase
          .from("files")
          .update({
            order_id: order.id,
            file_category: "character_image",
          })
          .in("id", characterImageFileIds);

        if (characterError) {
          console.error(
            "📁 [Shop API] Character files linking error:",
            characterError
          );
          throw characterError;
        }
      }

      // 레퍼런스 파일들을 주문과 연결
      if (referenceFileIds && referenceFileIds.length > 0) {
        const { error: referenceError } = await supabase
          .from("files")
          .update({
            order_id: order.id,
            file_category: "reference",
          })
          .in("id", referenceFileIds);

        if (referenceError) {
          console.error(
            "📁 [Shop API] Reference files linking error:",
            referenceError
          );
          throw referenceError;
        }
      }
    } catch (fileUploadError) {
      console.error("File upload error:", fileUploadError);
      // 파일 업로드 실패 시에도 주문은 유지하고 경고 메시지만 전달
      return NextResponse.json(
        {
          message:
            "주문이 접수되었으나 일부 파일 업로드에 실패했습니다. 관리자에게 문의해주세요.",
          orderId: order.id,
          warning: "파일 업로드 실패",
        },
        { status: 201 }
      );
    }

    // TODO: 관리자에게 새 주문 알림 이메일 발송
    // await sendNewOrderNotificationEmail(order);

    return NextResponse.json(
      {
        message: "맞춤형 시간표 제작 신청이 성공적으로 접수되었습니다.",
        orderId: order.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Custom order submission error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 사용자의 커스텀 주문 내역 조회
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { data: orders, error } = await supabase
      .from("custom_timetable_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "주문 내역 조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 주문 수정 (pending 상태에서만 가능)
export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      orderId,
      priceQuoted,
      youtubeSnsAddress,
      emailDiscord,
      orderRequirements,
      hasCharacterImages,
      wantsOmakase,
      designKeywords,
      characterImageFileIds,
      referenceFileIds,
      selectedOptions: selectedOptionsInput, // Record<string, boolean>
      requiredArea, // 필수 영역 선택
      fastDelivery, // 빠른 마감 선택
      externalContract,
      depositorName,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "주문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 기존 주문 확인 (본인 주문이고 pending 상태인지 확인)
    const { data: existingOrder, error: fetchError } = await supabase
      .from("custom_timetable_orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { error: "수정할 수 없는 주문입니다. (대기중 상태에서만 수정 가능)" },
        { status: 403 }
      );
    }

    // 선택된 옵션 값들 추출 (영어 value로 저장)
    const selectedOptionValues = Object.entries(selectedOptionsInput || {})
      .filter(([, isSelected]) => isSelected)
      .map(([optionValue]) => normalizeOtherOptionValue(optionValue));

    // 필수 영역 옵션 추가 (영어 value로)
    if (requiredArea) {
      selectedOptionValues.push(normalizeOtherOptionValue(requiredArea));
    }

    // 빠른 마감 옵션 추가 (영어 value로)
    if (fastDelivery) {
      selectedOptionValues.push("fast_delivery_custom");
    }

    // 외부 계약 옵션 추가 (영어 value로)
    if (externalContract) {
      selectedOptionValues.push("external_contract");
    }

    // 최종 옵션 목록에 상충 옵션이 함께 포함되면 저장하지 않음
    if (hasConflictingOtherOptions(selectedOptionValues)) {
      return NextResponse.json(
        {
          error:
            '"후기 이벤트 참여"와 "포트폴리오 비공개" 옵션은 함께 선택할 수 없습니다.',
        },
        { status: 400 }
      );
    }

    // 주문 업데이트 (옵션은 영어 value로 저장)
    const { data: updatedOrder, error: updateError } = await supabase
      .from("custom_timetable_orders")
      .update({
        youtube_sns_address: youtubeSnsAddress,
        email_discord: emailDiscord,
        order_requirements: orderRequirements,
        has_character_images: hasCharacterImages,
        wants_omakase: wantsOmakase,
        design_keywords: designKeywords,
        price_quoted: priceQuoted,
        selected_options: selectedOptionValues,
        depositor_name: depositorName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "주문 수정 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 업로드된 파일들을 주문과 연결
    try {
      if (characterImageFileIds && characterImageFileIds.length > 0) {
        const { error: characterError } = await supabase
          .from("files")
          .update({
            order_id: orderId,
            file_category: "character_image",
          })
          .in("id", characterImageFileIds);

        if (characterError) {
          console.error(
            "📁 [Shop API] Character files linking error:",
            characterError
          );
          throw characterError;
        }
      }

      if (referenceFileIds && referenceFileIds.length > 0) {
        const { error: referenceError } = await supabase
          .from("files")
          .update({
            order_id: orderId,
            file_category: "reference",
          })
          .in("id", referenceFileIds);

        if (referenceError) {
          console.error(
            "📁 [Shop API] Reference files linking error:",
            referenceError
          );
          throw referenceError;
        }
      }
    } catch (fileLinkError) {
      console.error("File linking error:", fileLinkError);
      return NextResponse.json(
        {
          message:
            "주문이 수정되었으나 일부 파일 연결에 실패했습니다. 관리자에게 문의해주세요.",
          order: updatedOrder,
          warning: "파일 연결 실패",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "주문이 성공적으로 수정되었습니다.",
        order: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 주문 취소 (pending 상태에서만 가능)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "주문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 기존 주문 확인 (본인 주문이고 pending 상태인지 확인)
    const { data: existingOrder, error: fetchError } = await supabase
      .from("custom_timetable_orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { error: "취소할 수 없는 주문입니다. (대기중 상태에서만 취소 가능)" },
        { status: 403 }
      );
    }

    // 주문 상태를 cancelled로 변경
    const { error: updateError } = await supabase
      .from("custom_timetable_orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "주문 취소 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "주문이 성공적으로 취소되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
