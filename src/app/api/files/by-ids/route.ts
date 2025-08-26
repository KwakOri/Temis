import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getFileUrl } from '@/lib/r2';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    
    // JWT 토큰 확인
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const { fileIds } = await request.json();
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: '파일 ID 목록이 필요합니다.' }, { status: 400 });
    }


    // 파일 정보 조회 (사용자의 파일만)
    const { data: files, error } = await supabase
      .from('files')
      .select('id, file_key, original_name, file_size, mime_type, created_at')
      .in('id', fileIds)
      .eq('created_by', parseInt(decoded.userId, 10));

    if (error) {
      console.error('📂 [Files API] Database error:', error);
      return NextResponse.json({ error: '파일 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // URL 추가
    const filesWithUrls = files.map(file => ({
      ...file,
      url: getFileUrl(file.file_key)
    }));


    return NextResponse.json({
      files: filesWithUrls
    });

  } catch (error) {
    console.error('📂 [Files API] Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}