"use client";

import { X, File, FileText, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

export interface FilePreviewItem {
  id: string;
  file: File | null; // 수정 모드에서는 null일 수 있음
  url?: string;
  mime_type?: string; // 수정 모드에서 타입 정보
  original_name?: string; // 수정 모드에서 파일명
  file_size?: number; // 수정 모드에서 파일 크기
}

interface FilePreviewProps {
  files: FilePreviewItem[];
  onRemove: (id: string) => void;
  maxFiles?: number;
}

export default function FilePreview({ files, onRemove, maxFiles }: FilePreviewProps) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // 파일 MIME 타입 가져오기
  const getMimeType = (item: FilePreviewItem): string => {
    if (item.file && item.file.type) {
      return item.file.type;
    }
    return item.mime_type || '';
  };

  // 파일명 가져오기
  const getFileName = (item: FilePreviewItem): string => {
    if (item.file && item.file.name) {
      return item.file.name;
    }
    return item.original_name || `file-${item.id}`;
  };

  // 이미지 미리보기 URL 생성
  const getPreviewUrl = (item: FilePreviewItem): string | null => {
    const mimeType = getMimeType(item);
    
    if (mimeType.startsWith('image/')) {
      // 수정 모드에서는 서버에서 제공하는 URL 사용
      if (item.url && !item.file) {
        return item.url;
      }
      
      // 새 업로드 파일은 blob URL 생성
      if (item.file) {
        const fileName = getFileName(item);
        if (!previewUrls[fileName]) {
          const url = URL.createObjectURL(item.file);
          setPreviewUrls(prev => ({ ...prev, [fileName]: url }));
          return url;
        }
        return previewUrls[fileName];
      }
    }
    return null;
  };

  // 파일 타입에 따른 아이콘 선택
  const getFileIcon = (item: FilePreviewItem) => {
    const mimeType = getMimeType(item);
    
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else {
      return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (files.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700">
          업로드된 파일 ({files.length}{maxFiles ? `/${maxFiles}` : ''})
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {files.map((fileItem) => {
          const previewUrl = getPreviewUrl(fileItem);
          
          return (
            <div
              key={fileItem.id}
              className="relative group bg-white border border-slate-200 rounded-lg p-2 hover:shadow-md transition-shadow"
            >
              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(fileItem.id);
                }}
                className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors opacity-0 group-hover:opacity-100"
                title="파일 삭제"
              >
                <X className="h-3 w-3" />
              </button>

              {/* 파일 미리보기 또는 아이콘 */}
              <div className="aspect-square bg-slate-50 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={getFileName(fileItem)}
                    className="w-full h-full object-cover rounded-md"
                    onError={() => {
                      // 이미지 로드 실패 시 아이콘으로 대체
                      if (fileItem.file) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrls(prev => {
                          const newUrls = { ...prev };
                          delete newUrls[getFileName(fileItem)];
                          return newUrls;
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2">
                    {getFileIcon(fileItem)}
                  </div>
                )}
              </div>

              {/* 파일 정보 */}
              <div className="text-xs text-slate-600">
                <p className="font-medium truncate" title={getFileName(fileItem)}>
                  {getFileName(fileItem)}
                </p>
                <p className="text-slate-500 mt-1">
                  {fileItem.file ? formatFileSize(fileItem.file.size) : 
                   fileItem.file_size ? formatFileSize(fileItem.file_size) : 'Unknown size'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 파일 개수 제한 표시 */}
      {maxFiles && files.length >= maxFiles && (
        <p className="text-sm text-amber-600 mt-2 flex items-center">
          <span className="mr-1">⚠️</span>
          최대 {maxFiles}개의 파일까지 업로드할 수 있습니다.
        </p>
      )}
    </div>
  );
}

// 메모리 누수 방지를 위한 cleanup 훅
export const useFilePreviewCleanup = () => {
  const cleanup = (files: FilePreviewItem[]) => {
    files.forEach(fileItem => {
      if (fileItem.file && fileItem.file.type.startsWith('image/')) {
        const url = URL.createObjectURL(fileItem.file);
        URL.revokeObjectURL(url);
      }
    });
  };

  return cleanup;
};