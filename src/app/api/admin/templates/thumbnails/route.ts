import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { access } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id');

    if (!templateId) {
      return NextResponse.json(
        { error: 'template_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // public/thumbnail/[template_id].png 경로 확인
    const thumbnailPath = join(process.cwd(), 'public', 'thumbnail', `${templateId}.png`);
    
    try {
      // 파일 존재 여부 확인
      await access(thumbnailPath);
      
      return NextResponse.json({
        success: true,
        thumbnail: {
          templateId,
          url: `/thumbnail/${templateId}.png`,
          exists: true
        }
      });

    } catch {
      // 파일이 없는 경우
      return NextResponse.json({
        success: true,
        thumbnail: {
          templateId,
          url: null,
          exists: false
        }
      });
    }

  } catch (error) {
    console.error('Thumbnail check error:', error);
    return NextResponse.json(
      { error: '썸네일 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}