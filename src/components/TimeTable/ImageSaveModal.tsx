import React, { useState } from 'react';

interface ImageSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (width: number, height: number) => void;
  templateSize?: { width: number; height: number };
}

interface SizeOption {
  width: number;
  height: number;
  label: string;
  key: string;
}

const ImageSaveModal: React.FC<ImageSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  templateSize,
}) => {
  // 기본 크기 설정 (templateSize가 없으면 기본값 사용)
  const originalWidth = templateSize?.width || 1280;
  const originalHeight = templateSize?.height || 720;

  // 16:9 비율 표준 크기 옵션 생성
  const getSizeOptions = (): SizeOption[] => {
    const options: SizeOption[] = [];
    
    // 1280 옵션 (항상 표시)
    options.push({
      width: 1280,
      height: 720, // 16:9 비율
      label: '1280p',
      key: '1280'
    });

    // 1920 옵션 (원본이 1920보다 클 때만 표시)
    if (originalWidth > 1920) {
      options.push({
        width: 1920,
        height: 1080, // 16:9 비율
        label: '1920p (Full HD)',
        key: '1920'
      });
    }

    // 4K 옵션 (원본이 3840보다 클 때만 표시)
    if (originalWidth > 3840) {
      options.push({
        width: 3840,
        height: 2160, // 16:9 비율
        label: '4K (3840p)',
        key: '4k'
      });
    }

    // 원본 크기 옵션 (1280과 다를 때만 표시)
    if (originalWidth !== 1280) {
      const originalAspectRatio = originalHeight / originalWidth;
      options.push({
        width: originalWidth,
        height: Math.round(originalWidth * originalAspectRatio),
        label: `원본 (${originalWidth}p)`,
        key: 'original'
      });
    }

    return options;
  };

  const sizeOptions = getSizeOptions();
  const [selectedOption, setSelectedOption] = useState<SizeOption>(sizeOptions[0]);

  const handleSave = () => {
    onSave(selectedOption.width, selectedOption.height);
    onClose();
  };

  const handleClose = () => {
    setSelectedOption(sizeOptions[0]); // 첫 번째 옵션으로 리셋
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">이미지 저장 크기 선택</h2>
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
              저장할 이미지의 해상도를 선택하세요. 모든 크기는 16:9 비율로 표준화됩니다.
            </p>
          </div>

          {/* 크기 선택 옵션 */}
          <div className="space-y-3">
            {sizeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setSelectedOption(option)}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all duration-200 text-left font-medium
                  ${selectedOption.key === option.key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">{option.label}</div>
                  <div className="text-sm text-gray-500">
                    {option.width}×{option.height}px
                  </div>
                </div>
                {option.key === 'original' && (
                  <div className="text-xs text-gray-500 mt-1">
                    원본 템플릿 크기
                  </div>
                )}
                {option.key === '1920' && (
                  <div className="text-xs text-gray-500 mt-1">
                    풀HD 해상도
                  </div>
                )}
                {option.key === '4k' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Ultra HD (4K) 해상도
                  </div>
                )}
                {option.key === '1280' && (
                  <div className="text-xs text-gray-500 mt-1">
                    표준 HD 해상도
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* 선택된 크기 정보 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">선택된 크기:</span>
              <span className="font-semibold text-gray-900">{selectedOption.label}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-gray-600">해상도:</span>
              <span className="font-semibold text-gray-900">
                {selectedOption.width}×{selectedOption.height}px
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