"use client";

import { useOrderFiles } from "@/hooks/query/useOrderFiles";
import { usePriceOptions } from "@/hooks/query/usePricing";
import { CustomOrderWithStatus } from "@/types/customOrder";
import { getOptionDisplayLabel } from "@/utils/optionLabelHelper";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  FileText,
  Image,
  Mail,
  MessageSquare,
  Package,
  Palette,
  Sparkles,
  User,
  X,
  XCircle,
  Youtube,
} from "lucide-react";
import { useState } from "react";

interface OrderDetailsModalProps {
  order: CustomOrderWithStatus;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}: OrderDetailsModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { data: filesData, isLoading: filesLoading } = useOrderFiles(order.id);
  const { data: priceOptions } = usePriceOptions("timetable");

  if (!isOpen) return null;

  const files = filesData?.files || [];
  const characterImages = files.filter(
    (file) => file.file_category === "character_image"
  );
  const referenceFiles = files.filter(
    (file) => file.file_category === "reference"
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "accepted":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "in_progress":
        return <AlertCircle className="h-5 w-5 text-indigo-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "accepted":
        return "접수됨";
      case "in_progress":
        return "제작중";
      case "completed":
        return "완료";
      case "cancelled":
        return "취소됨";
      default:
        return "알 수 없음";
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass =
      "inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full";

    switch (status) {
      case "pending":
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case "accepted":
        return `${baseClass} bg-blue-100 text-blue-800`;
      case "in_progress":
        return `${baseClass} bg-indigo-100 text-indigo-800`;
      case "completed":
        return `${baseClass} bg-green-100 text-green-800`;
      case "cancelled":
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  주문 상세 정보
                </h2>
                <p className="text-sm text-slate-500">
                  주문 ID: {order.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={getStatusBadge(order.status)}>
                {getStatusIcon(order.status)}
                <span className="ml-2">{getStatusText(order.status)}</span>
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 기본 정보 섹션 */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              기본 정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Youtube className="h-4 w-4 inline mr-2" />
                    YouTube/SNS 주소
                  </label>
                  <p className="text-sm text-slate-900 bg-white p-3 rounded-md border">
                    {order.youtube_sns_address}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Mail className="h-4 w-4 inline mr-2" />
                    이메일/디스코드
                  </label>
                  <p className="text-sm text-slate-900 bg-white p-3 rounded-md border">
                    {order.email_discord}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    신청일시
                  </label>
                  <p className="text-sm text-slate-900 bg-white p-3 rounded-md border">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    최종 수정일
                  </label>
                  <p className="text-sm text-slate-900 bg-white p-3 rounded-md border">
                    {formatDate(order.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 제작 요구사항 섹션 */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              제작 요구사항
            </h3>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Palette className="h-4 w-4 inline mr-2" />
              요청사항
            </label>
            <div className="bg-white p-4 rounded-md border">
              <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                {order.order_requirements}
              </p>
            </div>
            {/* 디자인 키워드 */}
            {order.design_keywords && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Palette className="h-4 w-4 inline mr-2" />
                  디자인 키워드
                </label>
                <div className="bg-white p-4 rounded-md border">
                  <p className="text-sm text-slate-900">
                    {order.design_keywords}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 옵션 정보 섹션 */}
          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2" />
              선택 옵션
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="bg-white p-4 rounded-md border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    오마카세 요청
                  </span>
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded-full ${
                      order.wants_omakase
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {order.wants_omakase ? "예" : "아니요"}
                  </span>
                </div>
              </div>
            </div>

            {/* 선택된 옵션들 */}
            {order.selected_options && order.selected_options.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  선택된 추가 옵션
                </label>
                <div className="bg-white p-4 rounded-md border">
                  <div className="flex flex-wrap gap-2">
                    {order.selected_options.map((option, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {getOptionDisplayLabel(option, priceOptions)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 첨부 파일 섹션 */}
          {(characterImages.length > 0 || referenceFiles.length > 0) && (
            <div className="bg-indigo-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Image className="h-5 w-5 mr-2" />
                첨부 파일
              </h3>

              {/* 캐릭터 이미지 */}
              {characterImages.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-slate-700 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    캐릭터 이미지 ({characterImages.length}개)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {characterImages.map((file) => (
                      <div
                        key={file.id}
                        className="relative bg-white rounded-lg border border-indigo-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                        onClick={() => setImagePreview(file.url)}
                      >
                        {file.mime_type.startsWith("image/") ? (
                          <img
                            src={file.url}
                            alt={file.original_name}
                            className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-24 bg-slate-100 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                        <div className="p-2">
                          <p
                            className="text-xs text-slate-600 truncate"
                            title={file.original_name}
                          >
                            {file.original_name}
                          </p>
                        </div>
                        <a
                          href={file.url}
                          download={file.original_name}
                          className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-3 w-3 text-slate-600" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 레퍼런스 파일 */}
              {referenceFiles.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-slate-700 mb-3 flex items-center">
                    <Palette className="h-4 w-4 mr-2" />
                    레퍼런스 파일 ({referenceFiles.length}개)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {referenceFiles.map((file) => (
                      <div
                        key={file.id}
                        className="relative bg-white rounded-lg border border-indigo-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                        onClick={() =>
                          file.mime_type.startsWith("image/") &&
                          setImagePreview(file.url)
                        }
                      >
                        {file.mime_type.startsWith("image/") ? (
                          <img
                            src={file.url}
                            alt={file.original_name}
                            className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-24 bg-slate-100 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                        <div className="p-2">
                          <p
                            className="text-xs text-slate-600 truncate"
                            title={file.original_name}
                          >
                            {file.original_name}
                          </p>
                        </div>
                        <a
                          href={file.url}
                          download={file.original_name}
                          className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-3 w-3 text-slate-600" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filesLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="ml-3 text-slate-600">파일을 불러오는 중...</p>
                </div>
              )}
            </div>
          )}

          {/* 결제 정보 섹션 */}
          {(order.price_quoted || order.depositor_name) && (
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                결제 정보
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.price_quoted && (
                  <div className="bg-white p-4 rounded-md border">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      견적 금액
                    </label>
                    <p className="text-2xl font-bold text-green-600">
                      ₩{order.price_quoted.toLocaleString()}
                    </p>
                  </div>
                )}
                {order.depositor_name && (
                  <div className="bg-white p-4 rounded-md border">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      입금자명
                    </label>
                    <p className="text-lg font-semibold text-slate-900">
                      {order.depositor_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 관리자 메모 섹션 */}
          {order.admin_notes && (
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                관리자 메모
              </h3>
              <div className="bg-white p-4 rounded-md border border-yellow-200">
                <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {order.admin_notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      {imagePreview && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={imagePreview}
              alt="이미지 미리보기"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
