import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleFiles, validateFiles } from '@/lib/file-utils';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // 사용자 인증 확인
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // FormData에서 파일들 추출
    const formData = await request.formData();
    const files: File[] = [];
    
    formData.forEach((value, key) => {
      if (value instanceof File) {
        files.push(value);
      }
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: '업로드할 파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 파일 타입에 따른 검증 옵션 설정
    const uploadType = formData.get('type') as string;
    let validationOptions = {};

    switch (uploadType) {
      case 'character-images':
        validationOptions = {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxCount: 5,
        };
        break;
      case 'reference-files':
        validationOptions = {
          maxSize: 100 * 1024 * 1024, // 100MB
          allowedTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf',
          ],
          maxCount: 10,
        };
        break;
      default:
        validationOptions = {
          maxSize: 10 * 1024 * 1024, // 10MB
          maxCount: 5,
        };
    }

    // 파일 검증
    const validation = validateFiles(files, validationOptions);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 파일 업로드
    const uploadedFiles = await uploadMultipleFiles(
      files,
      `uploads/custom-orders/${uploadType}`
    );

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });

  } catch (error) {
    console.error('업로드 API 에러:', error);
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 파일 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // 사용자 인증 확인
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { fileIds } = await request.json();

    if (!fileIds || !Array.isArray(fileIds)) {
      return NextResponse.json(
        { error: '삭제할 파일 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일 삭제 (소프트 삭제)
    const { deleteMultipleFiles } = await import('@/lib/file-utils');
    await deleteMultipleFiles(fileIds);

    return NextResponse.json({
      success: true,
      message: '파일이 삭제되었습니다.',
    });

  } catch (error) {
    console.error('파일 삭제 API 에러:', error);
    return NextResponse.json(
      { error: '파일 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}