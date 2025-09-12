export interface ImageEditData {
  // 크롭 관련 데이터
  crop: {
    x: number;
    y: number;
  };
  zoom: number;
  rotation: number;
  
  // 원본 이미지 정보
  originalImageSrc: string;
  
  // 크롭된 이미지 정보 (저장된 결과)
  croppedImageSrc: string | null;
  
  // 크롭 영역 정보
  croppedAreaPixels?: CroppedAreaPixels;
  
  // 크롭 설정
  cropWidth: number;
  cropHeight: number;
  aspectRatio: number;
}

export interface ImageEditActions {
  // 편집 데이터 업데이트
  updateImageEditData: (data: Partial<ImageEditData>) => void;
  
  // 새 이미지 설정 (원본으로 설정)
  setOriginalImage: (imageSrc: string, cropWidth?: number, cropHeight?: number) => void;
  
  // 크롭된 이미지 저장
  saveCroppedImage: (croppedImageSrc: string, croppedAreaPixels: CroppedAreaPixels) => void;
  
  // 편집 데이터 초기화
  resetImageEditData: () => void;
  
  // 편집 모드 시작 (기존 데이터 유지하며 편집)
  startEditMode: () => ImageEditData | null;
}

export interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}