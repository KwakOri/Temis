import { supabase } from "@/lib/supabase";
import { downloadFileFromR2 } from "@/lib/r2";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import JSZip from "jszip";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role?: string;
}

export async function POST(request: Request) {
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

    const { fileIds } = await request.json();

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "파일 ID 배열이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 정보 조회
    const { data: files, error } = await supabase
      .from("files")
      .select("*")
      .in("id", fileIds);

    if (error || !files || files.length === 0) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    try {
      // JSZip을 사용한 ZIP 파일 생성
      const zipBuffer = await createZipFromFiles(files);
      
      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="order-files-${Date.now()}.zip"`,
        },
      });
      
    } catch (zipError) {
      console.error("ZIP creation error:", zipError);
      return NextResponse.json(
        { error: "ZIP 파일 생성 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("ZIP download error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// ZIP 파일 생성 헬퍼 함수
async function createZipFromFiles(files: any[]): Promise<Buffer> {
  const zip = new JSZip();
  
  for (const file of files) {
    try {
      // Cloudflare R2에서 파일 다운로드
      const { buffer } = await downloadFileFromR2(file.file_key);
      const fileName = file.original_name || `file_${file.id}`;
      zip.file(fileName, buffer);
    } catch (error) {
      console.error(`Failed to download file ${file.original_name}:`, error);
      // 다운로드 실패한 파일에 대한 정보 파일 추가
      zip.file(`FAILED_${file.original_name}.txt`, 
        `파일 다운로드 실패: ${file.file_key}\n오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // 빈 ZIP인 경우 정보 파일 추가
  if (Object.keys(zip.files).length === 0) {
    zip.file('README.txt', '다운로드할 수 있는 파일이 없습니다.');
  }
  
  return await zip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });
}