"use client";

import {
  Download,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import { useState } from "react";

interface FileData {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  created_at: string;
}

interface AdminFileManagerProps {
  characterImageIds: string[];
  referenceFileIds: string[];
  title?: string;
}

export default function AdminFileManager({
  characterImageIds,
  referenceFileIds,
  title = "첨부파일 관리",
}: AdminFileManagerProps) {
  const [characterFiles, setCharacterFiles] = useState<FileData[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // 파일 정보 로드
  const loadFiles = async () => {
    if (expanded) return; // 이미 로드됨

    setLoading(true);
    try {
      const allFileIds = [...characterImageIds, ...referenceFileIds];
      if (allFileIds.length === 0) return;

      const response = await fetch("/api/admin/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ fileIds: allFileIds }),
      });

      if (response.ok) {
        const data = await response.json();

        // 파일을 카테고리별로 분류
        const characterFileData = data.files.filter((file: FileData) =>
          characterImageIds.includes(file.id)
        );
        const referenceFileData = data.files.filter((file: FileData) =>
          referenceFileIds.includes(file.id)
        );

        setCharacterFiles(characterFileData);
        setReferenceFiles(referenceFileData);
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setLoading(false);
    }
  };

  // 파일 타입에 따른 아이콘 반환
  const getFileIcon = (fileType: string) => {
    if (!fileType) {
      return <File className="h-6 w-6 text-gray-500" />;
    }
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />;
    } else if (fileType === "application/pdf") {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else {
      return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 개별 파일 다운로드
  const downloadFile = async (fileId: string, originalName: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}/download`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("파일 다운로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  // 전체 파일 ZIP 다운로드
  const downloadAllFiles = async () => {
    try {
      const allFileIds = [...characterImageIds, ...referenceFileIds];

      const response = await fetch("/api/admin/files/download-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ fileIds: allFileIds }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `order-files-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.error || "ZIP 파일 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("ZIP download failed:", error);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const totalFiles = characterImageIds.length + referenceFileIds.length;

  if (totalFiles === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
        첨부된 파일이 없습니다.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) {
            loadFiles();
          }
        }}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-900">{title}</span>
          <span className="text-sm text-gray-500">({totalFiles}개 파일)</span>
        </div>
        <div className="flex items-center space-x-2">
          {expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadAllFiles();
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>전체 다운로드</span>
            </button>
          )}
          <span className="text-gray-400">{expanded ? "▼" : "▶"}</span>
        </div>
      </div>

      {/* 파일 목록 */}
      {expanded && (
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500">파일 로딩 중...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 캐릭터 이미지 섹션 */}
              {characterFiles.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-3">
                    캐릭터 이미지 ({characterFiles.length}개)
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {characterFiles.map((file) => (
                      <FilePreviewCard
                        key={file.id}
                        file={file}
                        onDownload={() =>
                          downloadFile(file.id, file.original_name)
                        }
                        getFileIcon={getFileIcon}
                        formatFileSize={formatFileSize}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 레퍼런스 파일 섹션 */}
              {referenceFiles.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-3">
                    레퍼런스 파일 ({referenceFiles.length}개)
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {referenceFiles.map((file) => (
                      <FilePreviewCard
                        key={file.id}
                        file={file}
                        onDownload={() =>
                          downloadFile(file.id, file.original_name)
                        }
                        getFileIcon={getFileIcon}
                        formatFileSize={formatFileSize}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 파일 카드 컴포넌트
interface FilePreviewCardProps {
  file: FileData;
  onDownload: () => void;
  getFileIcon: (fileType: string) => React.ReactElement;
  formatFileSize: (bytes: number) => string;
}

function FilePreviewCard({
  file,
  onDownload,
  getFileIcon,
  formatFileSize,
}: FilePreviewCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = file.file_type?.startsWith("image/") || false;

  return (
    <div className="relative group bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow">
      {/* 다운로드 버튼 */}
      <button
        onClick={onDownload}
        className="absolute -top-2 -right-2 z-10 bg-green-500 hover:bg-green-600 text-white rounded-full p-1 shadow-md transition-colors opacity-0 group-hover:opacity-100"
        title="파일 다운로드"
      >
        <Download className="h-3 w-3" />
      </button>

      {/* 파일 미리보기 또는 아이콘 */}
      <div className="aspect-square bg-gray-50 rounded-md mb-2 flex items-center justify-center overflow-hidden">
        {isImage && !imageError ? (
          <img
            src={file.file_path}
            alt={file.original_name}
            className={`w-full h-full object-cover rounded-md transition-opacity ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-2">
            {getFileIcon(file.file_type || "application/octet-stream")}
          </div>
        )}
      </div>

      {/* 파일 정보 */}
      <div className="text-xs text-gray-600">
        <p
          className="font-medium truncate"
          title={file.original_name || "알 수 없는 파일"}
        >
          {file.original_name || "알 수 없는 파일"}
        </p>
        <p className="text-gray-500 mt-1">
          {formatFileSize(file.file_size || 0)}
        </p>
        <p className="text-gray-400 text-xs">
          {file.created_at
            ? new Date(file.created_at).toLocaleDateString("ko-KR")
            : "날짜 불명"}
        </p>
      </div>

      {/* 외부 링크 표시 (이미지인 경우) */}
      {isImage && file.file_path && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(file.file_path, "_blank");
          }}
          className="absolute top-1 left-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="새 창에서 보기"
        >
          <ExternalLink className="h-3 w-3 text-gray-600" />
        </button>
      )}
    </div>
  );
}
