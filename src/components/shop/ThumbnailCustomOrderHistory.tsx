"use client";

import {
  useCancelThumbnailCustomOrder,
  useThumbnailCustomOrderHistory,
} from "@/hooks/query/useCustomThumbnailOrder";
import type {
  ThumbnailCustomOrder,
  ThumbnailCustomOrderStatus,
} from "@/types/customThumbnailOrder";
import { CheckCircle, Clock, Eye, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

const statusLabel: Record<ThumbnailCustomOrderStatus, string> = {
  pending: "대기 중",
  accepted: "접수됨",
  in_progress: "제작 중",
  completed: "완료",
  cancelled: "취소됨",
};

const statusClassName: Record<ThumbnailCustomOrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const getStatusIcon = (status: ThumbnailCustomOrderStatus) => {
  if (status === "completed") {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
  if (status === "cancelled") {
    return <XCircle className="h-5 w-5 text-red-600" />;
  }
  return <Clock className="h-5 w-5 text-indigo-600" />;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function ThumbnailCustomOrderHistory() {
  const { data, isLoading, error } = useThumbnailCustomOrderHistory();
  const cancelMutation = useCancelThumbnailCustomOrder();
  const orders = data?.orders ?? [];

  const handleCancel = async (order: ThumbnailCustomOrder) => {
    if (!window.confirm("이 썸네일 주문제작 신청을 취소하시겠습니까?")) return;

    try {
      await cancelMutation.mutateAsync(order.id);
    } catch (cancelError) {
      window.alert(
        cancelError instanceof Error
          ? cancelError.message
          : "주문 취소에 실패했습니다.",
      );
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          맞춤형 썸네일 제작 신청 내역
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          제작 요청과 고객 전용 썸네일 템플릿의 진행 상태를 확인할 수 있습니다.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          썸네일 주문 내역을 불러오는 중...
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          썸네일 주문 내역을 불러오지 못했습니다.
        </p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl bg-slate-50 py-10 text-center text-slate-500">
          아직 신청한 썸네일 주문제작 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {order.purpose}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(order.created_at)} · 4K 썸네일
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[order.status]}`}
                >
                  {statusLabel[order.status]}
                </span>
              </div>

              <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {order.requirements}
              </p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span>캐릭터·레퍼런스 파일 {order.files?.length ?? 0}개</span>
                {order.price_quoted !== null && (
                  <span className="font-semibold text-slate-700">
                    견적 ₩{order.price_quoted.toLocaleString()}
                  </span>
                )}
                {order.deadline && <span>예정 마감 {order.deadline}</span>}
              </div>

              {order.admin_notes && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <p className="font-semibold">관리자 안내</p>
                  <p className="mt-1 whitespace-pre-wrap">{order.admin_notes}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {order.result_template_id && order.status === "completed" && (
                  <Link
                    href={`/thumbnail/${order.result_template_id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-secondary/90"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    썸네일 만들기
                  </Link>
                )}
                {order.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleCancel(order)}
                    disabled={cancelMutation.isPending}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    신청 취소
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
