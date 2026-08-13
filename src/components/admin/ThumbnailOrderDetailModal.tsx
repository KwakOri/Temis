"use client";

import type {
  AdminUpdateThumbnailCustomOrderData,
  ThumbnailCustomOrder,
} from "@/types/customThumbnailOrder";
import {
  CheckCircle,
  Download,
  Eye,
  Image as ImageIcon,
  LockKeyhole,
  X,
} from "lucide-react";
import { useState } from "react";

interface ThumbnailOrderDetailModalProps {
  order: ThumbnailCustomOrder;
  onClose: () => void;
  onUpdate: (
    orderId: string,
    data: AdminUpdateThumbnailCustomOrderData,
  ) => Promise<void>;
  onComplete: (orderId: string, resultTemplateId: string) => Promise<void>;
  updating: boolean;
  completing: boolean;
}

const statusOptions: {
  value: NonNullable<AdminUpdateThumbnailCustomOrderData["status"]>;
  label: string;
  className: string;
}[] = [
  { value: "pending", label: "대기 중", className: "yellow" },
  { value: "accepted", label: "접수됨", className: "blue" },
  { value: "in_progress", label: "진행 중", className: "indigo" },
  { value: "cancelled", label: "취소", className: "red" },
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return "미설정";
  return new Date(value).toLocaleDateString("ko-KR");
};

const roleLabel: Record<string, string> = {
  source: "원본 에셋",
  reference: "레퍼런스",
  deliverable: "납품 참고자료",
};

export default function ThumbnailOrderDetailModal({
  order,
  onClose,
  onUpdate,
  onComplete,
  updating,
  completing,
}: ThumbnailOrderDetailModalProps) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes || "");
  const [price, setPrice] = useState(
    order.price_quoted === null ? "" : String(order.price_quoted),
  );
  const [deadline, setDeadline] = useState(order.deadline || "");
  const [resultTemplateId, setResultTemplateId] = useState(
    order.result_template_id || "",
  );
  const isCompleted = order.status === "completed";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onUpdate(order.id, {
      status: isCompleted ? undefined : status,
      adminNotes: notes,
      priceQuoted: price === "" ? null : Number(price),
      deadline: deadline || null,
    });
  };

  const handleComplete = async () => {
    const templateId = resultTemplateId.trim();
    if (!templateId || order.status === "cancelled" || isCompleted) return;
    await onComplete(order.id, templateId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-sm sm:p-4">
      <div className="my-2 max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl sm:my-0 sm:rounded-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-secondary" />
              <h3 className="text-base font-semibold text-primary sm:text-lg">
                썸네일 주문 상세
              </h3>
            </div>
            <p className="mt-1 text-xs text-gray-500">{order.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-primary">고객 정보</h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">이름</dt>
                  <dd className="text-gray-900">{order.users?.name || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">이메일</dt>
                  <dd className="text-gray-900">{order.users?.email || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">외부 연락처</dt>
                  <dd className="whitespace-pre-wrap text-gray-900">
                    {order.contact}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-primary">주문 계약</h4>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">기본 규격</dt>
                  <dd className="font-medium text-gray-900">3840 × 2160</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">포트폴리오</dt>
                  <dd className="font-medium text-gray-900">
                    {order.portfolio_consent ? "공개 동의" : "비공개"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">신청일</dt>
                  <dd className="text-gray-900">
                    {formatDate(order.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">희망 마감</dt>
                  <dd className="text-gray-900">
                    {formatDate(order.requested_deadline)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-primary">
              제작 요구사항
            </h4>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">사용 목적</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">
                  {order.purpose}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">전체 요청</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">
                  {order.requirements}
                </p>
              </div>
              {order.text_requirements && (
                <div>
                  <p className="text-xs text-gray-500">문구 입력 요구사항</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-900">
                    {order.text_requirements}
                  </p>
                </div>
              )}
              {order.image_requirements && (
                <div>
                  <p className="text-xs text-gray-500">이미지 입력 요구사항</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-900">
                    {order.image_requirements}
                  </p>
                </div>
              )}
              {order.design_keywords && (
                <div>
                  <p className="text-xs text-gray-500">
                    분위기·색상·구성 키워드
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-900">
                    {order.design_keywords}
                  </p>
                </div>
              )}
            </div>
          </section>

          {order.files && order.files.length > 0 && (
            <section className="rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-primary">
                첨부파일 ({order.files.length})
              </h4>
              <div className="mt-3 space-y-2">
                {order.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {file.file?.original_name || file.file_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {roleLabel[file.role] || file.role}
                        {file.file ? ` · ${file.file.mime_type}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/admin/files/${file.file_id}/preview`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        미리보기
                      </a>
                      <a
                        href={`/api/admin/files/${file.file_id}/download`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        <Download className="h-3.5 w-3.5" />
                        다운로드
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 pt-5"
          >
            <h4 className="text-sm font-semibold text-primary">관리자 작업</h4>
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  주문 상태
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isCompleted || updating || completing}
                      onClick={() => setStatus(option.value)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        status === option.value
                          ? option.className === "yellow"
                            ? "border-yellow-200 bg-yellow-100 text-yellow-800"
                            : option.className === "blue"
                              ? "border-blue-200 bg-blue-100 text-blue-800"
                              : option.className === "indigo"
                                ? "border-indigo-200 bg-indigo-100 text-indigo-800"
                                : "border-red-200 bg-red-100 text-red-800"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                견적 가격 (원)
                <input
                  type="number"
                  min="0"
                  value={price}
                  disabled={isCompleted || updating || completing}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="정책 확정 후 입력"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                마감일
                <input
                  type="date"
                  value={deadline}
                  disabled={isCompleted || updating || completing}
                  onChange={(event) => setDeadline(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                관리자 메모
                <textarea
                  rows={3}
                  value={notes}
                  disabled={isCompleted || updating || completing}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </label>

              <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
                <div className="flex items-start gap-2">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      결과 템플릿 연결
                    </p>
                    <p className="mt-1 leading-relaxed text-gray-600">
                      Thumbnail Studio에서 발행한 비공개 v2 썸네일 템플릿 UUID를
                      입력하세요. 서버가 Studio·thumbnail·비공개·published
                      상태를 다시 검증합니다.
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  value={resultTemplateId}
                  disabled={
                    isCompleted ||
                    order.status === "cancelled" ||
                    updating ||
                    completing
                  }
                  onChange={(event) => setResultTemplateId(event.target.value)}
                  placeholder="결과 template_id"
                  className="mt-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-secondary disabled:bg-gray-100"
                />
                {order.result_template_id && (
                  <p className="mt-2 text-xs text-green-700">
                    이미 연결된 결과 템플릿: {order.result_template_id}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={
                    isCompleted ||
                    order.status === "cancelled" ||
                    !resultTemplateId.trim() ||
                    updating ||
                    completing
                  }
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <CheckCircle className="h-4 w-4" />
                  {completing ? "권한 부여 중..." : "완료 및 권한 부여"}
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isCompleted || updating || completing}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
