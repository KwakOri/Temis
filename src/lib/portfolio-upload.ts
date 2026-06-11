export interface PortfolioUploadMetadata {
  name: string;
  size: number;
  type: string;
}

const BYTES_PER_MB = 1000 * 1000;

export const PORTFOLIO_UPLOAD_FOLDER = "uploads/portfolios";
export const PORTFOLIO_UPLOAD_MAX_SIZE = 100 * BYTES_PER_MB;
export const PORTFOLIO_UPLOAD_MAX_COUNT = 50;
export const PORTFOLIO_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export function validatePortfolioUploadFiles(
  files: PortfolioUploadMetadata[]
): { isValid: boolean; error?: string } {
  if (files.length > PORTFOLIO_UPLOAD_MAX_COUNT) {
    return {
      isValid: false,
      error: `이미지는 최대 ${PORTFOLIO_UPLOAD_MAX_COUNT}개까지 업로드 가능합니다.`,
    };
  }

  for (const file of files) {
    if (!file.name || file.size <= 0 || !file.type) {
      return {
        isValid: false,
        error: "업로드할 이미지 정보가 올바르지 않습니다.",
      };
    }

    if (file.size > PORTFOLIO_UPLOAD_MAX_SIZE) {
      return {
        isValid: false,
        error: `이미지 크기는 ${Math.round(
          PORTFOLIO_UPLOAD_MAX_SIZE / BYTES_PER_MB
        )}MB 이하여야 합니다.`,
      };
    }

    if (!PORTFOLIO_ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: "지원되지 않는 이미지 형식입니다.",
      };
    }
  }

  return { isValid: true };
}
