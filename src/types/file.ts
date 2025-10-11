// API 응답에서 받는 파일 데이터 타입 (DB + 동적 URL 포함)
export interface FileApiResponse {
  id: string;
  file_key: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_category: string;
  created_at: string;
  url: string; // API에서 동적으로 추가된 필드
}

// 파일 업로드 응답 타입
export interface UploadResponse {
  files: {
    id: string;
    url: string;
  }[];
}

// 파일 삭제 요청 타입
export interface DeleteFilesRequest {
  fileIds: string[];
}

// 파일 삭제 응답 타입
export interface DeleteFilesResponse {
  success: boolean;
  error?: string;
}
