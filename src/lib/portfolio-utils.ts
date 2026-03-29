import { uploadFileToR2, deleteFileFromR2, getFileUrl } from "./r2";

/**
 * 포트폴리오 이미지를 R2에 업로드
 */
export async function uploadPortfolioImage(
  file: File
): Promise<{ url: string; fileKey: string }> {
  // File을 Buffer로 변환
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // R2에 업로드
  const result = await uploadFileToR2(
    buffer,
    file.name,
    file.type,
    "uploads/portfolios"
  );

  return {
    url: result.url,
    fileKey: result.fileKey,
  };
}

/**
 * 여러 포트폴리오 이미지를 병렬 업로드
 */
export async function uploadPortfolioImages(
  files: File[]
): Promise<{ url: string; fileKey: string }[]> {
  const uploadPromises = files.map((file) => uploadPortfolioImage(file));
  return Promise.all(uploadPromises);
}

/**
 * URL에서 fileKey 추출
 * 예: "https://pub-xxx.r2.dev/uploads/portfolios/xxx.jpg" → "uploads/portfolios/xxx.jpg"
 */
export function extractFileKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // pathname에서 앞의 "/" 제거
    return urlObj.pathname.substring(1);
  } catch (error) {
    console.error("Invalid URL:", url, error);
    throw new Error("Invalid image URL");
  }
}

/**
 * 포트폴리오 이미지를 R2에서 삭제
 */
export async function deletePortfolioImage(url: string): Promise<void> {
  const fileKey = extractFileKeyFromUrl(url);
  await deleteFileFromR2(fileKey);
}

/**
 * 여러 포트폴리오 이미지를 병렬 삭제
 */
export async function deletePortfolioImages(urls: string[]): Promise<void> {
  const deletePromises = urls.map((url) => deletePortfolioImage(url));
  await Promise.all(deletePromises);
}

/**
 * 포트폴리오 수정 시 이미지 교체
 * - 새로운 이미지는 업로드
 * - 기존 이미지 중 삭제된 것은 R2에서 제거
 */
export async function updatePortfolioImages(
  newFiles: File[],
  existingUrls: string[],
  urlsToKeep: string[]
): Promise<string[]> {
  // 1. 삭제할 이미지들 찾기
  const urlsToDelete = existingUrls.filter((url) => !urlsToKeep.includes(url));

  // 2. 새 이미지 업로드와 기존 이미지 삭제를 병렬 처리
  const [uploadResults] = await Promise.all([
    uploadPortfolioImages(newFiles),
    deletePortfolioImages(urlsToDelete),
  ]);

  // 3. 유지할 URL + 새로 업로드된 URL 합치기
  const newUrls = uploadResults.map((result) => result.url);
  return [...urlsToKeep, ...newUrls];
}
