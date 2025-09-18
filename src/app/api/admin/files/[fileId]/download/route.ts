import { supabase } from "@/lib/supabase";
import { downloadFileFromR2 } from "@/lib/r2";
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

    // Cloudflare R2에서 파일 다운로드
    try {
      const { buffer, contentType, contentLength } = await downloadFileFromR2(file.file_key);
      
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength.toString(),
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.original_name)}"`,
          'Cache-Control': 'private, no-cache',
        },
      });
    } catch (downloadError) {
      console.error('File download error:', downloadError);
      return NextResponse.json(
        { error: "파일 다운로드에 실패했습니다." },
        { status: 500 }
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