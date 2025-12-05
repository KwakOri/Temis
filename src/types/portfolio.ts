// Portfolio 데이터베이스 타입
export interface Portfolio {
  id: string;
  category: string;
  title: string;
  description: string;
  thumbnail_url: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

// Portfolio 생성 요청
export interface CreatePortfolioRequest {
  category: string;
  title: string;
  description: string;
  thumbnail: File;
  images: File[];
}

// Portfolio 수정 요청
export interface UpdatePortfolioRequest {
  id: string;
  category: string;
  title: string;
  description: string;
  thumbnail?: File; // 새 썸네일 (옵션)
  existingThumbnailUrl?: string; // 기존 썸네일 유지
  newImages?: File[]; // 새로 추가할 이미지들
  existingImageUrls?: string[]; // 유지할 기존 이미지 URL들
}

// Portfolio 삭제 요청
export interface DeletePortfolioRequest {
  id: string;
}

// API 응답 타입
export interface PortfolioResponse {
  portfolio: Portfolio;
}

export interface PortfoliosResponse {
  portfolios: Portfolio[];
}

export interface DeletePortfolioResponse {
  success: boolean;
}
