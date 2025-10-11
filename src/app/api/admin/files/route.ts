import { supabase } from "@/lib/supabase";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role?: string;
}

// 파일 정보 조회 (관리자만)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // 관리자 권한 확인
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { fileIds } = await request.json();

    if (!fileIds || !Array.isArray(fileIds)) {
      return NextResponse.json(
        { error: "파일 ID 배열이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 정보 조회
    const { data: rawFiles, error } = await supabase
      .from("files")
      .select("id, file_key, original_name, file_size, mime_type, created_at")
      .in("id", fileIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "파일 정보를 가져오는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // mime_type을 file_type으로 매핑하고 file_path 추가
    const files = rawFiles?.map(file => ({
      ...file,
      file_type: file.mime_type,
      file_path: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${file.file_key}`
    })) || [];

    return NextResponse.json({ files }, { status: 200 });
  } catch (error) {
    console.error("Get files error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}