"use client";

import React, { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Area, Point } from "react-easy-crop";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageSrc: string) => void;
  cropWidth?: number;
  cropHeight?: number;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  cropWidth = 400,
  cropHeight = 400,
}) => {
  // 크롭 비율 계산
  const aspectRatio = cropWidth / cropHeight;
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
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
      onCropComplete(croppedImage);
      onClose();
    } catch (error) {
      console.error("이미지 크롭 실패:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, rotation, onCropComplete, onClose]);

  const handleCancel = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setRotation(0);
    setZoom(1);
    onClose();
  }, [onClose]);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }, [isOpen, handleSave, handleCancel]);

  // 키보드 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">이미지 자르기</h2>
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

        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

        // 캔버스 크기 설정
        canvas.width = safeArea;
        canvas.height = safeArea;

        // 중심점으로 이동하고 회전 적용
        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-safeArea / 2, -safeArea / 2);

        // 이미지를 중앙에 그리기
        ctx.drawImage(
          image,
          safeArea / 2 - image.width * 0.5,
          safeArea / 2 - image.height * 0.5
        );

        const data = ctx.getImageData(0, 0, safeArea, safeArea);

        // 크롭된 영역만큼 새 캔버스 생성
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.putImageData(
          data,
          Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
          Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
        );

        // 최종 이미지 데이터 URL 반환
        const croppedImageUrl = canvas.toDataURL("image/jpeg", 0.9);
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

export default ImageCropModal;