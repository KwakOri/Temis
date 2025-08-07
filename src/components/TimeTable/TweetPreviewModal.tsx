import React, { useState, useEffect } from 'react';
import * as htmlToImage from "html-to-image";

interface TweetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tweetText: string) => void;
  initialTweetText: string;
  twitterUsername: string | null;
  isUploading?: boolean;
  captureSize?: { width: number; height: number };
}

const TweetPreviewModal: React.FC<TweetPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialTweetText,
  twitterUsername,
  isUploading = false,
  captureSize
}) => {
  const [tweetText, setTweetText] = useState(initialTweetText);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // 모달이 열릴 때 시간표 이미지 생성
  useEffect(() => {
    if (isOpen) {
      setTweetText(initialTweetText);
      generatePreviewImage();
    }
  }, [isOpen, initialTweetText]);

  // textarea 높이 자동 조절
  useEffect(() => {
    const textarea = document.querySelector('.tweet-text-area') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [tweetText]);

  const generatePreviewImage = async () => {
    try {
      setIsGeneratingImage(true);
      const node = document.getElementById("timetable");
      if (!node) {
        console.error('시간표 요소를 찾을 수 없습니다.');
        return;
      }

      const dataUrl = await htmlToImage.toPng(node, {
        width: captureSize?.width || 1280,
        height: captureSize?.height || 720,
        pixelRatio: 1,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      setPreviewImage(dataUrl);
    } catch (error) {
      console.error('이미지 생성 실패:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(tweetText);
  };

  // const formatDate = () => {
  //   const now = new Date();
  //   const hours = now.getHours();
  //   const minutes = now.getMinutes();
  //   const ampm = hours >= 12 ? '오후' : '오전';
  //   const displayHours = hours % 12 || 12;
    
  //   return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  // };

  const formatRelativeTime = () => {
    return '지금';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">트윗 미리보기</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isUploading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 글자 수 카운터 */}
          <div className="flex items-center justify-between text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
            <span>💡 아래 트윗 텍스트를 클릭하여 직접 편집하세요</span>
            <div className="flex items-center space-x-2">
              <span>트윗 길이: {tweetText.length}/280</span>
              {tweetText.length > 280 && (
                <span className="text-red-500 font-medium">글자 수 초과</span>
              )}
            </div>
          </div>

          {/* 트윗 미리보기 */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="space-y-3">
              {/* 사용자 정보 */}
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-gray-900 text-sm">
                      {twitterUsername ? `@${twitterUsername}` : '사용자명'}
                    </h3>
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 3.95-.36.1-.74.15-1.13.15-.27 0-.54-.03-.8-.08.54 1.69 2.11 2.95 4 2.98-1.46 1.16-3.31 1.84-5.33 1.84-.35 0-.69-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                    </svg>
                    <span className="text-gray-500 text-sm">·</span>
                    <span className="text-gray-500 text-sm">{formatRelativeTime()}</span>
                  </div>
                  
                  {/* 트윗 텍스트 - 편집 가능한 영역 */}
                  <div className="mt-2 relative">
                    <textarea
                      value={tweetText}
                      onChange={(e) => setTweetText(e.target.value)}
                      placeholder="트윗 내용을 입력하세요..."
                      maxLength={280}
                      className={`
                        tweet-text-area w-full bg-transparent text-gray-900 text-sm whitespace-pre-wrap leading-relaxed
                        resize-none border-none outline-none overflow-hidden
                        placeholder-gray-400 min-h-[1.25rem] focus:bg-gray-50 focus:rounded-md focus:px-2 focus:py-1
                        transition-all duration-200
                        ${tweetText.length > 280 ? 'text-red-600' : 'text-gray-900'}
                      `}
                      style={{
                        minHeight: '1.25rem',
                        height: 'auto'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>

                  {/* 첨부 이미지 */}
                  {(previewImage || isGeneratingImage) && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                      {isGeneratingImage ? (
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">이미지 생성 중...</p>
                          </div>
                        </div>
                      ) : previewImage ? (
                        <img 
                          src={previewImage} 
                          alt="시간표 미리보기" 
                          className="w-full aspect-video object-cover"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* 트윗 액션 버튼들 */}
                  <div className="flex items-center justify-between mt-3 max-w-md">
                    <div className="flex items-center space-x-6 text-gray-500">
                      <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm">0</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-green-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-sm">0</span>
                      </button>
                      <button className="flex items-center space-x-2 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-sm">0</span>
                      </button>
                      <button className="hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={isUploading || tweetText.length === 0 || tweetText.length > 280}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>게시 중...</span>
              </>
            ) : (
              <span>트윗하기</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TweetPreviewModal;