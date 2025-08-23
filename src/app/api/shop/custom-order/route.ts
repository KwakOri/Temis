import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { supabase } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export async function POST(request: Request) {
  try {
    // JWT 토큰에서 사용자 정보 추출
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const userId = parseInt(decoded.userId, 10);

    // 요청 본문 파싱
    const body = await request.json();
    const {
      youtubeSnsAddress,
      emailDiscord,
      orderRequirements,
      hasCharacterImages,
      wantsOmakase,
      designKeywords,
      characterImageFiles, // base64 encoded files array
      referenceFiles, // base64 encoded files array
    } = body;

    // 필수 필드 검증
    if (!youtubeSnsAddress || !emailDiscord || !orderRequirements || !designKeywords) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 파일 URL 처리 (현재는 더미 URL, 추후 Cloudflare R2로 대체 예정)
    const characterImagePaths: string[] = [];
    const referenceFilePaths: string[] = [];

    // 캐릭터 이미지 파일 처리
    if (characterImageFiles && characterImageFiles.length > 0) {
      for (let i = 0; i < characterImageFiles.length; i++) {
        const file = characterImageFiles[i];
        // 현재는 더미 URL 저장, 추후 Cloudflare R2 업로드 후 실제 URL로 대체
        const tempUrl = file.tempUrl || `https://temp-storage.example.com/character-images/user_${userId}_${Date.now()}_${i}_${file.name}`;
        characterImagePaths.push(tempUrl);
        
        // TODO: Cloudflare R2 업로드 로직으로 대체 예정
        // const actualUrl = await uploadToCloudflareR2(file.data, `character-images/${fileName}`);
        // characterImagePaths.push(actualUrl);
      }
    }

    // 레퍼런스 파일 처리
    if (referenceFiles && referenceFiles.length > 0) {
      for (let i = 0; i < referenceFiles.length; i++) {
        const file = referenceFiles[i];
        // 현재는 더미 URL 저장, 추후 Cloudflare R2 업로드 후 실제 URL로 대체
        const tempUrl = file.tempUrl || `https://temp-storage.example.com/reference-files/user_${userId}_${Date.now()}_${i}_${file.name}`;
        referenceFilePaths.push(tempUrl);
        
        // TODO: Cloudflare R2 업로드 로직으로 대체 예정
        // const actualUrl = await uploadToCloudflareR2(file.data, `reference-files/${fileName}`);
        // referenceFilePaths.push(actualUrl);
      }
    }

    // 데이터베이스에 주문 정보 저장
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
        character_image_files: characterImagePaths,
        reference_files: referenceFilePaths,
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
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const userId = parseInt(decoded.userId, 10);

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