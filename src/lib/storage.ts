// Cloudflare R2 Storage 유틸리티 (추후 구현 예정)


/**
 * Cloudflare R2에 파일 업로드 (추후 구현)
 */
export async function uploadToCloudflareR2(
  fileData: Buffer | Uint8Array | string,
  filePath: string,
  _contentType?: string
): Promise<string> {
  // TODO: Cloudflare R2 SDK를 사용한 실제 업로드 로직 구현
  
  // 현재는 더미 URL 반환
  const timestamp = Date.now();
  const dummyUrl = `https://your-r2-bucket.your-account-id.r2.cloudflarestorage.com/${filePath}?timestamp=${timestamp}`;
  
  
  return dummyUrl;
}

/**
 * Cloudflare R2에서 파일 삭제 (추후 구현)
 */
export async function deleteFromCloudflareR2(_filePath: string): Promise<boolean> {
  // TODO: Cloudflare R2 SDK를 사용한 실제 삭제 로직 구현
  
  
  return true;
}

/**
 * 파일 URL에서 키 추출
 */
export function extractR2KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Cloudflare R2 URL 패턴에서 키 추출
    const key = urlObj.pathname.substring(1); // 첫 번째 '/' 제거
    return key || null;
  } catch {
    return null;
  }
}

/**
 * 파일 확장자에 따른 Content-Type 추론
 */
export function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  
  const contentTypes: Record<string, string> = {
    // 이미지
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    // 문서
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    
    // 기타
    'zip': 'application/zip',
    'json': 'application/json',
  };
  
  return contentTypes[ext || ''] || 'application/octet-stream';
}

// Cloudflare R2 설정 타입 정의 (추후 사용)
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region?: string;
}