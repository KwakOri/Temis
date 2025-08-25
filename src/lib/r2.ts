import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Cloudflare R2 클라이언트 설정
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadFileResult {
  fileKey: string;
  url: string;
}

/**
 * 파일을 Cloudflare R2에 업로드합니다.
 */
export async function uploadFileToR2(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folder = 'uploads/custom-orders'
): Promise<UploadFileResult> {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const fileExtension = fileName.split('.').pop() || '';
  const fileKey = `${folder}/${timestamp}-${randomId}.${fileExtension}`;

  try {
    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: fileKey,
        Body: file,
        ContentType: mimeType,
        // 파일을 공개적으로 읽을 수 있게 설정
        ACL: 'public-read',
      },
    });

    await upload.done();

    const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileKey}`;

    return {
      fileKey,
      url,
    };
  } catch (error) {
    console.error('R2 업로드 실패:', error);
    throw new Error('파일 업로드에 실패했습니다.');
  }
}

/**
 * Cloudflare R2에서 파일을 삭제합니다.
 */
export async function deleteFileFromR2(fileKey: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileKey,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('R2 삭제 실패:', error);
    throw new Error('파일 삭제에 실패했습니다.');
  }
}

/**
 * 파일 키에서 공개 URL을 생성합니다.
 */
export function getFileUrl(fileKey: string): string {
  const publicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;
  return `${publicUrl}/${fileKey}`;
}

/**
 * Cloudflare R2에서 파일을 다운로드합니다.
 */
export async function downloadFileFromR2(fileKey: string): Promise<{ 
  buffer: Buffer; 
  contentType: string; 
  contentLength: number;
}> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileKey,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      throw new Error('파일을 찾을 수 없습니다.');
    }

    // Stream을 Buffer로 변환
    const chunks: Uint8Array[] = [];
    
    if (response.Body instanceof ReadableStream) {
      const reader = response.Body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
    } else {
      // Node.js 환경에서의 처리
      const stream = response.Body as NodeJS.ReadableStream;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    }
    
    const buffer = Buffer.concat(chunks);

    return {
      buffer,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || buffer.length,
    };
  } catch (error) {
    console.error('R2 다운로드 실패:', error);
    throw new Error('파일 다운로드에 실패했습니다.');
  }
}