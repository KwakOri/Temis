import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleFiles, validateFiles } from '@/lib/file-utils';
import { verifyJWT, extractTokenFromRequest, extractTokenFromCookie } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // JWT 토큰에서 사용자 인증 확인
    let token = extractTokenFromRequest(request);
    if (!token) {
      token = extractTokenFromCookie(request.headers.get('cookie'));
    }
    
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
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

    // order_id와 file_category 추출
    const orderId = formData.get('order_id') as string;
    const fileCategory = formData.get('file_category') as 'character_image' | 'reference';
    

    // 파일 업로드 (userId, orderId, fileCategory 전달)
    const uploadedFiles = await uploadMultipleFiles(
      files,
      Number(payload.userId),
      `uploads/custom-orders/${uploadType}`,
      orderId,
      fileCategory
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
    // JWT 토큰에서 사용자 인증 확인
    let token = extractTokenFromRequest(request);
    if (!token) {
      token = extractTokenFromCookie(request.headers.get('cookie'));
    }
    
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
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