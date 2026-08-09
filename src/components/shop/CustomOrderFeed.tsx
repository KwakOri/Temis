"use client";

import { useCustomOrderFeed } from "@/hooks/query/useCustomOrderFeed";
import { useCancelThumbnailCustomOrder } from "@/hooks/query/useCustomThumbnailOrder";
import type { CustomOrderWithStatus } from "@/types/customOrder";
import type {
  CustomOrderFeedItem,
  CustomOrderFeedStatus,
} from "@/types/customOrderFeed";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Image as ImageIcon,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface CustomOrderFeedProps {
  onEditTimetableOrder: (order: CustomOrderWithStatus) => void;
  onCancelTimetableOrder: (orderId: string) => void;
  onViewTimetableOrder: (order: CustomOrderWithStatus) => void;
}

const statusLabel: Record<CustomOrderFeedStatus, string> = {
  pending: "대기 중",
  accepted: "접수됨",
  in_progress: "제작 중",
  completed: "완료",
  cancelled: "취소됨",
};

const statusClassName: Record<CustomOrderFeedStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const getStatusIcon = (status: CustomOrderFeedStatus) => {
  switch (status) {
    case "pending":
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case "accepted":
      return <CheckCircle className="h-5 w-5 text-blue-600" />;
    case "in_progress":
      return <AlertCircle className="h-5 w-5 text-indigo-600" />;
    case "completed":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "cancelled":
      return <XCircle className="h-5 w-5 text-red-600" />;
  }
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const getTypeLabel = (item: CustomOrderFeedItem) =>
  item.type === "timetable" ? "시간표" : "썸네일";

const getTypeClassName = (item: CustomOrderFeedItem) =>
  item.type === "timetable"
    ? "bg-primary/10 text-primary"
    : "bg-secondary/10 text-secondary";

export default function CustomOrderFeed({
  onEditTimetableOrder,
  onCancelTimetableOrder,
  onViewTimetableOrder,
}: CustomOrderFeedProps) {
  const { data, isLoading, error } = useCustomOrderFeed();
  const cancelThumbnailMutation = useCancelThumbnailCustomOrder();
  const orders = data?.orders ?? [];

  const handleCancelThumbnailOrder = async (orderId: string) => {
    if (!confirm("정말로 이 썸네일 주문을 취소하시겠습니까?")) {
      return;
    }

    try {
      await cancelThumbnailMutation.mutateAsync(orderId);
      alert("썸네일 주문이 성공적으로 취소되었습니다.");
    } catch (error) {
      console.error("Cancel thumbnail order error:", error);
      alert(
        error instanceof Error ? error.message : "취소 중 오류가 발생했습니다.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        맞춤 제작 주문 내역을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-5 text-sm text-red-700">
        <p>맞춤 제작 주문 내역을 불러오지 못했습니다.</p>
        <p className="mt-1">
          {error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}
        </p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Clock className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-lg">아직 맞춤 제작 신청 내역이 없습니다.</p>
        <p className="mt-1 text-sm text-slate-400">
          시간표 또는 썸네일 맞춤 제작을 신청해보세요.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          맞춤 제작 신청 내역
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          시간표와 썸네일 주문을 신청일 기준으로 함께 확인할 수 있습니다.
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((item) => (
          <article
            key={item.type + "-" + item.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                {getStatusIcon(item.status)}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-semibold " +
                        getTypeClassName(item)
                      }
                    >
                      {getTypeLabel(item)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
              <span
                className={
                  "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold " +
                  statusClassName[item.status]
                }
              >
                {statusLabel[item.status]}
              </span>
            </div>

            <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {item.summary}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              {item.type === "timetable" ? (
                <span>
                  캐릭터 이미지{" "}
                  {item.order.has_character_images ? "첨부됨" : "없음"}
                </span>
              ) : (
                <span>
                  첨부파일 {item.order.files?.length ?? 0}개 · 4K 썸네일
                </span>
              )}
              {item.priceQuoted !== null && (
                <span className="font-semibold text-slate-700">
                  견적 ₩{item.priceQuoted.toLocaleString()}
                </span>
              )}
              {item.deadline && <span>예정 마감 {item.deadline}</span>}
            </div>

            {item.adminNotes && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <p className="font-semibold">관리자 안내</p>
                <p className="mt-1 whitespace-pre-wrap">{item.adminNotes}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {item.type === "timetable" ? (
                <>
                  <button
                    type="button"
                    onClick={() => onViewTimetableOrder(item.order)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    상세보기
                  </button>
                  {(item.status === "pending" ||
                    item.status === "accepted" ||
                    item.status === "in_progress") && (
                    <button
                      type="button"
                      onClick={() => onEditTimetableOrder(item.order)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      수정
                    </button>
                  )}
                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => onCancelTimetableOrder(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      취소
                    </button>
                  )}
                </>
              ) : (
                <>
                  {item.order.result_template_id && item.status === "completed" && (
                    <Link
                      href={"/thumbnail/" + item.order.result_template_id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-secondary/90"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      썸네일 만들기
                    </Link>
                  )}
                  {item.status === "pending" && (
                    <>
                      <Link
                        href="/my-page?tab=custom-orders"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        진행 상태 확인
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCancelThumbnailOrder(item.id)}
                        disabled={cancelThumbnailMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        취소
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
