"use client";

import { usePriceOptions } from "@/hooks/query/usePricing";
import { CustomOrderWithUser, FileData } from "@/types/admin";
import { getOptionDisplayLabel } from "@/utils/optionLabelHelper";
import {
  Download,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";

interface OrderDetailModalProps {
  order: CustomOrderWithUser;
  onClose: () => void;
  onUpdate: (
    orderId: string,
    status: string,
    notes?: string,
    price?: number,
    deadline?: string
  ) => Promise<void>;
  updating: boolean;
}

export default function OrderDetailModal({
  order,
  onClose,
  onUpdate,
  updating,
}: OrderDetailModalProps) {
  console.log("=== OrderDetailModal: 모달에서 받은 주문 데이터 ===");
  console.log("Order:", order);
  console.log("Files:", order.files);
  console.log("Files Length:", order.files?.length || 0);
  console.log("Selected Options:", order.selected_options);
  console.log("Design Keywords:", order.design_keywords);

  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes || "");
  const [price, setPrice] = useState(order.price_quoted || "");
  const [deadline, setDeadline] = useState(order.deadline || "");

  // 가격 옵션 조회 (옵션 라벨 표시용)
  const { data: priceOptions } = usePriceOptions("timetable");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(
      order.id,
      status,
      notes,
      price ? Number(price) : undefined,
      deadline || undefined
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto my-2 sm:my-0">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-t-lg sm:rounded-t-2xl z-20">
          <div className="flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-semibold text-primary">
              주문 상세 정보
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* 주문 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-primary mb-4">
                주문 정보
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">주문 ID</label>
                  <p className="text-sm text-gray-900">{order.id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">생성일</label>
                  <p className="text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">최종 수정일</label>
                  <p className="text-sm text-gray-900">
                    {new Date(order.updated_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    주문 유형
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    맞춤 제작 주문
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-primary mb-4">
                고객 정보
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">이름</label>
                  <p className="text-sm text-gray-900">{order.users.name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">이메일</label>
                  <p className="text-sm text-gray-900">{order.users.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    유튜브/SNS 주소
                  </label>
                  <p className="text-sm text-gray-900">
                    {order.youtube_sns_address}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    연락처 (이메일/디스코드)
                  </label>
                  <p className="text-sm text-gray-900">{order.email_discord}</p>
                </div>
                {order.depositor_name && (
                  <div>
                    <label className="text-xs text-gray-500">입금자명</label>
                    <p className="text-sm text-gray-900 font-medium">
                      {order.depositor_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 주문 상세 내용 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">
              주문 상세
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">제작 요구사항</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {order.order_requirements}
                  </p>
                </div>
              </div>

              {order.design_keywords && (
                <div>
                  <label className="text-xs text-gray-500">디자인 키워드</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-900">
                      {order.design_keywords}
                    </p>
                  </div>
                </div>
              )}

              {order.selected_options && order.selected_options.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500">선택된 옵션</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <div className="flex flex-wrap gap-2">
                      {order.selected_options.map((option, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {getOptionDisplayLabel(option, priceOptions)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {order.has_character_images && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    캐릭터 이미지 첨부됨
                  </span>
                )}
                {order.wants_omakase && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    오마카세 요청
                  </span>
                )}
                {order.files &&
                  order.files.filter(
                    (f) => f.file_category === "character_image"
                  ).length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      캐릭터 이미지{" "}
                      {
                        order.files.filter(
                          (f) => f.file_category === "character_image"
                        ).length
                      }
                      개
                    </span>
                  )}
                {order.files &&
                  order.files.filter((f) => f.file_category === "reference")
                    .length > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      레퍼런스 파일{" "}
                      {
                        order.files.filter(
                          (f) => f.file_category === "reference"
                        ).length
                      }
                      개
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* 첨부파일 관리 */}
          {order.files && order.files.length > 0 && (
            <div>
              <NewFileManager files={order.files} title="주문 첨부파일" />
            </div>
          )}

          {/* 관리자 작업 영역 */}
          <form onSubmit={handleSubmit} className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">
              관리자 작업
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">
                    주문 상태
                  </label>
                  <div className="grid grid-cols-2 sm:flex gap-2 sm:justify-between">
                    {[
                      { value: "pending", label: "대기 중", color: "yellow" },
                      { value: "accepted", label: "접수됨", color: "blue" },
                      {
                        value: "in_progress",
                        label: "진행 중",
                        color: "indigo",
                      },
                      { value: "completed", label: "완료", color: "green" },
                      { value: "cancelled", label: "취소", color: "red" },
                    ].map((statusOption) => (
                      <button
                        key={statusOption.value}
                        type="button"
                        onClick={() =>
                          setStatus(
                            statusOption.value as
                              | "pending"
                              | "accepted"
                              | "in_progress"
                              | "completed"
                              | "cancelled"
                          )
                        }
                        className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md border transition-colors grow w-full ${
                          status === statusOption.value
                            ? statusOption.color === "yellow"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                              : statusOption.color === "blue"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : statusOption.color === "indigo"
                              ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                              : statusOption.color === "green"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {statusOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    마감 기한
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  견적 가격 (원)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="견적가격을 입력하세요"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  관리자 메모
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="내부 메모나 고객에게 전달할 메시지를 입력하세요"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-secondary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors"
              >
                {updating ? "업데이트 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// 새로운 파일 관리자 컴포넌트
interface NewFileManagerProps {
  files: FileData[];
  title?: string;
}

function NewFileManager({ files, title = "첨부파일" }: NewFileManagerProps) {
  const [expanded, setExpanded] = useState(false);

  // 파일을 카테고리별로 분류
  const characterImages = files.filter(
    (f) => f.file_category === "character_image"
  );
  const referenceFiles = files.filter((f) => f.file_category === "reference");

  // 파일 타입에 따른 아이콘 반환
  const getFileIcon = (mimeType: string) => {
    if (!mimeType) {
      return <File className="h-6 w-6 text-gray-500" />;
    }
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6 text-blue-500" />;
    } else if (mimeType === "application/pdf") {
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
      const fileIds = files.map((f) => f.id).join(",");
      const response = await fetch(
        `/api/admin/files/download-zip?fileIds=${fileIds}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `order_files_${Date.now()}.zip`;
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

  // 파일 미리보기
  const previewFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}/preview`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.url, "_blank");
      } else {
        alert("파일 미리보기에 실패했습니다.");
      }
    } catch (error) {
      console.error("Preview failed:", error);
      alert("파일 미리보기 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{files.length}개 파일</span>
          <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* 전체 다운로드 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={downloadAllFiles}
              className="inline-flex items-center px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-secondary transition-colors"
            >
              <Download className="h-4 w-4 mr-1.5" />
              전체 다운로드
            </button>
          </div>

          {/* 캐릭터 이미지 */}
          {characterImages.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-600 mb-2">
                캐릭터 이미지 ({characterImages.length})
              </h5>
              <div className="space-y-2">
                {characterImages.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(file.mime_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {file.original_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => previewFile(file.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="미리보기"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          downloadFile(file.id, file.original_name)
                        }
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="다운로드"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 레퍼런스 파일 */}
          {referenceFiles.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-600 mb-2">
                레퍼런스 파일 ({referenceFiles.length})
              </h5>
              <div className="space-y-2">
                {referenceFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(file.mime_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {file.original_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => previewFile(file.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="미리보기"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          downloadFile(file.id, file.original_name)
                        }
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="다운로드"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
