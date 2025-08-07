import React, { useState } from 'react';

interface ImageSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scale: number) => void;
  templateSize?: { width: number; height: number };
}

const ImageSaveModal: React.FC<ImageSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  templateSize,
}) => {
  const [selectedScale, setSelectedScale] = useState<number>(100);

  // 기본 크기 설정 (templateSize가 없으면 기본값 사용)
  const baseWidth = templateSize?.width || 4000;
  const baseHeight = templateSize?.height || 2250;

  // 배율 옵션 (30%, 50%, 70%, 100%)
  const scaleOptions = [
    { value: 30, label: '30%' },
    { value: 50, label: '50%' },
    { value: 70, label: '70%' },
    { value: 100, label: '100%' },
  ];

  const handleSave = () => {
    onSave(selectedScale / 100); // 0.1 ~ 1.0으로 변환
    onClose();
  };

  const handleClose = () => {
    setSelectedScale(100); // 기본값으로 리셋
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">이미지 저장 배율 선택</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              저장할 이미지의 해상도를 선택하세요. 높은 배율일수록 더 선명한 이미지가 저장됩니다.
            </p>
          </div>

          {/* 배율 선택 그리드 */}
          <div className="grid grid-cols-2 gap-4">
            {scaleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedScale(option.value)}
                className={`
                  p-4 rounded-lg border-2 transition-all duration-200 text-center font-medium
                  ${selectedScale === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                `}
              >
                <div className="text-lg font-bold">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(baseWidth * option.value / 100)}×{Math.round(baseHeight * option.value / 100)}
                </div>
              </button>
            ))}
          </div>

          {/* 선택된 배율 정보 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">선택된 배율:</span>
              <span className="font-semibold text-gray-900">{selectedScale}%</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-gray-600">저장될 크기:</span>
              <span className="font-semibold text-gray-900">
                {Math.round(baseWidth * selectedScale / 100)}×{Math.round(baseHeight * selectedScale / 100)}px
              </span>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageSaveModal;