import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { access } from 'fs/promises';
import { join } from 'path';
import { UUID_PATTERN } from '@/utils/legacy-template-assets/contracts';
import { getProjectAssetManifest } from '@/services/server/projectAssetManifestService';

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id');

    if (!templateId || !UUID_PATTERN.test(templateId)) {
      return NextResponse.json(
        { error: 'template_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const localUrl = `/thumbnail/${templateId}.png`;
    if (process.env.NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED === 'true') {
      const image = (await getProjectAssetManifest()).covers[localUrl];
      if (image) return NextResponse.json({ success: true, thumbnail: { templateId, url: image.src, exists: true } });
    }
    // Preserve static lookup for unregistered/local-mode covers.
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
