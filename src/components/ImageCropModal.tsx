"use client";

import React, { useCallback, useEffect, useState } from "react";
import Cropper, { Area, Point } from "react-easy-crop";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (
    croppedImageSrc: string,
    croppedAreaPixels?: Area,
    crop?: Point,
    zoom?: number,
    rotation?: number
  ) => void;
  cropWidth?: number;
  cropHeight?: number;
  // 편집 모드용 props - 기존 편집 데이터를 전달받을 수 있음
  initialCrop?: Point;
  initialZoom?: number;
  initialRotation?: number;
  isEditMode?: boolean;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  cropWidth = 400,
  cropHeight = 400,
  initialCrop = { x: 0, y: 0 },
  initialZoom = 1,
  initialRotation = 0,
  isEditMode = false,
}) => {
  // 크롭 비율 계산
  const aspectRatio = cropWidth / cropHeight;
  const [crop, setCrop] = useState<Point>(initialCrop);
  const [rotation, setRotation] = useState(initialRotation);
  const [zoom, setZoom] = useState(initialZoom);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(croppedImage, croppedAreaPixels, crop, zoom, rotation);
      onClose();
    } catch (error) {
      console.error("이미지 크롭 실패:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    croppedAreaPixels,
    imageSrc,
    rotation,
    crop,
    zoom,
    onCropComplete,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    // 편집 모드가 아닌 경우에만 초기화
    if (!isEditMode) {
      setCrop({ x: 0, y: 0 });
      setRotation(0);
      setZoom(1);
    } else {
      // 편집 모드인 경우 초기값으로 복원
      setCrop(initialCrop);
      setRotation(initialRotation);
      setZoom(initialZoom);
    }
    onClose();
  }, [onClose, isEditMode, initialCrop, initialRotation, initialZoom]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Enter") {
        event.preventDefault();
        handleSave();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    },
    [isOpen, handleSave, handleCancel]
  );

  // 키보드 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {isEditMode ? "이미지 편집" : "이미지 자르기"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              크롭 비율: {cropWidth} × {cropHeight} ({aspectRatio.toFixed(2)}:1)
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 크롭 영역 */}
        <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden mb-6">
          <Cropper
            image={imageSrc}
            crop={crop}
            rotation={rotation}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onRotationChange={setRotation}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>

        {/* 컨트롤 패널 */}
        <div className="space-y-4 mb-6">
          {/* 줌 컨트롤 */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-16">
              확대/축소
            </label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* 회전 컨트롤 */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-16">
              회전
            </label>
            <input
              type="range"
              value={rotation}
              min={0}
              max={360}
              step={1}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 w-12 text-right">
              {rotation}°
            </span>
          </div>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "처리 중..." : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 이미지를 크롭하여 새로운 이미지 데이터 URL을 생성하는 유틸리티 함수
 */
const getCroppedImg = (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context를 가져올 수 없습니다."));
          return;
        }

        // 회전이 있는 경우 더 큰 작업 영역 필요
        const rotRad = (rotation * Math.PI) / 180;
        const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
          image.width,
          image.height,
          rotation
        );

        // 작업용 캔버스 크기 설정 (회전된 이미지를 담을 수 있는 크기)
        canvas.width = bBoxWidth;
        canvas.height = bBoxHeight;

        // 캔버스 중심으로 이동
        ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
        // 회전 적용
        ctx.rotate(rotRad);
        // 이미지를 중심에 그리기
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        // 회전된 이미지에서 크롭 영역 추출
        const croppedCanvas = document.createElement("canvas");
        const croppedCtx = croppedCanvas.getContext("2d");

        if (!croppedCtx) {
          reject(new Error("Cropped canvas context를 가져올 수 없습니다."));
          return;
        }

        // 크롭 캔버스 크기 설정
        croppedCanvas.width = pixelCrop.width;
        croppedCanvas.height = pixelCrop.height;

        // 회전된 이미지에서 지정된 영역을 크롭하여 새 캔버스에 그리기
        croppedCtx.drawImage(
          canvas,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        // 최종 이미지 데이터 URL 반환
        const croppedImageUrl = croppedCanvas.toDataURL("image/jpeg", 0.9);
        resolve(croppedImageUrl);
      } catch (error) {
        reject(error);
      }
    });

    image.addEventListener("error", (error) => {
      reject(error);
    });

    image.src = imageSrc;
  });
};

/**
 * 회전된 이미지의 바운딩 박스 크기를 계산하는 유틸리티 함수
 */
const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = (rotation * Math.PI) / 180;

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export default ImageCropModal;
