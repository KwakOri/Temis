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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

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

    const { fileId } = await params;

    // 파일 정보 조회
    const { data: file, error } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 실제 파일 다운로드 (현재는 URL 리다이렉트)
    // TODO: Cloudflare R2나 실제 스토리지에서 파일을 가져와서 반환
    if (file.file_path.startsWith('http')) {
      // 외부 URL인 경우 리다이렉트
      return NextResponse.redirect(file.file_path);
    } else {
      // 로컬 파일인 경우 (추후 구현)
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}