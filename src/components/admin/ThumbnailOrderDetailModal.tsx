"use client";

import {
  useAdminThumbnailOrderTemplateCandidates,
  useAdminThumbnailOrders,
} from "@/hooks/query/useAdminOrders";
import type {
  AdminUpdateThumbnailCustomOrderData,
  ThumbnailCustomOrder,
  ThumbnailOrderTemplateCandidate,
  ThumbnailOrderTemplateGrant,
} from "@/types/customThumbnailOrder";
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Image as ImageIcon,
  LockKeyhole,
  Plus,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ThumbnailOrderDetailModalProps {
  order: ThumbnailCustomOrder;
  onClose: () => void;
  onUpdate: (
    orderId: string,
    data: AdminUpdateThumbnailCustomOrderData,
  ) => Promise<void>;
  onComplete: (orderId: string, resultTemplateId: string) => Promise<void>;
  onRevoke: (orderId: string, grantId: string) => Promise<void>;
  updating: boolean;
  completing: boolean;
  revoking: boolean;
}

const statusOptions: {
  value: NonNullable<AdminUpdateThumbnailCustomOrderData["status"]>;
  label: string;
  className: string;
}[] = [
  { value: "pending", label: "대기 중", className: "yellow" },
  { value: "accepted", label: "접수됨", className: "blue" },
  { value: "in_progress", label: "진행 중", className: "indigo" },
  { value: "completed", label: "완료", className: "green" },
  { value: "cancelled", label: "취소", className: "red" },
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return "미설정";
  return new Date(value).toLocaleDateString("ko-KR");
};

const latestDeadlineQueryParams = {
  status: "default",
  page: 1,
  limit: 1,
  sortBy: "deadline",
  sortOrder: "desc" as const,
  deadlineRequired: true,
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultDeadline = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDateInputValue(date);
};

const normalizeDateInputValue = (value?: string | null) => {
  if (!value) return "";

  const dateOnlyMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (dateOnlyMatch) return dateOnlyMatch[0];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateInputValue(date);
};

const addDaysToDateInputValue = (value: string, days: number) => {
  const normalizedValue =
    normalizeDateInputValue(value) || getDefaultDeadline();
  const [year, month, day] = normalizedValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateInputValue(date);
};

const getRecommendedDeadline = (latestDeadline?: string | null) => {
  const normalizedLatestDeadline = normalizeDateInputValue(latestDeadline);
  if (!normalizedLatestDeadline) return getDefaultDeadline();

  return addDaysToDateInputValue(normalizedLatestDeadline, 1);
};

const formatDisplayDate = (value?: string | null) => {
  const normalizedValue = normalizeDateInputValue(value);
  if (!normalizedValue) return null;

  const [year, month, day] = normalizedValue.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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
  onRevoke,
  updating,
  completing,
  revoking,
}: ThumbnailOrderDetailModalProps) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes || "");
  const [price, setPrice] = useState(
    order.price_quoted === null ? "" : String(order.price_quoted),
  );
  const orderDeadline = normalizeDateInputValue(order.deadline);
  const [deadline, setDeadline] = useState(
    orderDeadline || getDefaultDeadline(),
  );
  const [hasChangedDeadline, setHasChangedDeadline] = useState(
    Boolean(orderDeadline),
  );
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [draftDeadline, setDraftDeadline] = useState(
    orderDeadline || getDefaultDeadline(),
  );
  // `result_template_id` is retained only as a legacy first-result pointer.
  // Selection must always come from the server-validated candidate cards.
  const [resultTemplateId, setResultTemplateId] = useState("");
  const [isAdditionalGrantOpen, setIsAdditionalGrantOpen] = useState(false);
  const {
    data: templateCandidatesData,
    isLoading: isTemplateCandidatesLoading,
  } = useAdminThumbnailOrderTemplateCandidates();
  const activeTemplateGrants = (order.template_grants ?? []).filter(
    (grant) => !grant.revoked_at,
  );
  const hasActiveTemplateGrant = activeTemplateGrants.length > 0;
  const canSelectTemplate = !hasActiveTemplateGrant || isAdditionalGrantOpen;
  const templateCandidates = templateCandidatesData?.templates ?? [];
  const availableTemplateCandidates = templateCandidates.filter(
    (template) =>
      !activeTemplateGrants.some((grant) => grant.template_id === template.id),
  );

  const { data: latestDeadlineData, isLoading: isLatestDeadlineLoading } =
    useAdminThumbnailOrders(latestDeadlineQueryParams);
  const latestDeadline = latestDeadlineData?.orders.find(
    (queueOrder) => queueOrder.deadline,
  )?.deadline;
  const latestDeadlineLabel = isLatestDeadlineLoading
    ? "불러오는 중..."
    : formatDisplayDate(latestDeadline) || "설정된 마감일 없음";

  useEffect(() => {
    if (hasChangedDeadline) return;

    setDeadline(getRecommendedDeadline(latestDeadline));
  }, [hasChangedDeadline, latestDeadline]);

  const adjustDeadlineByDays = (days: number) => {
    setHasChangedDeadline(true);
    setDeadline((currentDeadline) =>
      addDaysToDateInputValue(currentDeadline, days),
    );
  };

  const openDeadlineModal = () => {
    setDraftDeadline(deadline || getRecommendedDeadline(latestDeadline));
    setIsDeadlineModalOpen(true);
  };

  const applyDraftDeadline = () => {
    setHasChangedDeadline(true);
    setDeadline(draftDeadline);
    setIsDeadlineModalOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onUpdate(order.id, {
      status,
      adminNotes: notes,
      priceQuoted: price === "" ? null : Number(price),
      deadline: deadline || null,
    });
  };

  const handleComplete = async () => {
    const templateId = resultTemplateId.trim();
    if (!templateId) return;
    await onComplete(order.id, templateId);
  };

  const handleRevoke = async (grant: ThumbnailOrderTemplateGrant) => {
    const templateName = grant.template?.name || grant.template_id;
    if (
      !window.confirm(
        `${templateName} 템플릿의 이 주문 권한을 회수할까요? 다른 주문에서 유지 중인 권한은 영향을 받지 않습니다.`,
      )
    ) {
      return;
    }
    await onRevoke(order.id, grant.id);
  };

  const getStatusClasses = (option: (typeof statusOptions)[number]) => {
    if (status !== option.value) {
      return "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
    }
    switch (option.className) {
      case "yellow":
        return "border-yellow-200 bg-yellow-100 text-yellow-800";
      case "blue":
        return "border-blue-200 bg-blue-100 text-blue-800";
      case "indigo":
        return "border-indigo-200 bg-indigo-100 text-indigo-800";
      case "green":
        return "border-green-200 bg-green-100 text-green-800";
      default:
        return "border-red-200 bg-red-100 text-red-800";
    }
  };

  const renderTemplateCard = (template: ThumbnailOrderTemplateCandidate) => {
    const isSelected = resultTemplateId === template.id;
    return (
      <button
        key={template.id}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={`${template.name} 템플릿 선택`}
        onClick={() => setResultTemplateId(template.id)}
        disabled={updating || completing || revoking}
        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          isSelected
            ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
            : "border-gray-200 bg-white hover:border-secondary/50 hover:bg-gray-50"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2`}
      >
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {template.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Admin candidate cards use the stored catalog cover URL.
            <img
              src={template.thumbnail_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
              미리보기 없음
            </div>
          )}
        </div>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">
            {template.name}
          </span>
          <span className="mt-1 block line-clamp-2 text-xs text-gray-500">
            {template.description || "설명 없음"}
          </span>
          <span className="mt-1 block text-[11px] text-gray-400">
            게시됨 · 수정 {formatDate(template.updated_at)} · 기존 권한{" "}
            {template.existing_access_count}명
          </span>
        </span>
        <span
          className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
            isSelected ? "border-[5px] border-secondary" : "border-gray-300"
          }`}
          aria-hidden="true"
        />
      </button>
    );
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
                      disabled={updating || completing || revoking}
                      onClick={() => setStatus(option.value)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${getStatusClasses(option)}`}
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
                  disabled={updating || completing || revoking}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="정책 확정 후 입력"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </label>

              <div>
                <p className="mb-1 block text-sm font-medium text-gray-700">
                  마감 기한
                </p>
                <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,0.45fr)_minmax(0,1fr)]">
                    <div className="h-full rounded-lg border border-orange-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-orange-600">
                        <CalendarDays className="h-4 w-4" />
                        <p className="text-xs font-semibold">
                          마지막 썸네일 주문의 마감일
                        </p>
                      </div>
                      <p className="mt-2 text-xl font-bold text-gray-900">
                        {latestDeadlineLabel}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500">
                              선택된 마감일
                            </p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">
                              {formatDisplayDate(deadline) || "날짜 미설정"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={openDeadlineModal}
                            disabled={updating || completing || revoking}
                            className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            직접 설정
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => adjustDeadlineByDays(-1)}
                          disabled={
                            updating ||
                            completing ||
                            revoking ||
                            isLatestDeadlineLoading
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />- 1일
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustDeadlineByDays(1)}
                          disabled={
                            updating ||
                            completing ||
                            revoking ||
                            isLatestDeadlineLoading
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + 1일
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                관리자 메모
                <textarea
                  rows={3}
                  value={notes}
                  disabled={updating || completing || revoking}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                />
              </label>

              <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
                <div className="flex items-start gap-2">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">템플릿 권한</p>
                    <p className="mt-1 leading-relaxed text-gray-600">
                      주문 상태와 별도로 고객에게 실제로 권한을 부여한 템플릿을
                      관리합니다. 상태를 변경해도 이미 부여한 권한은 유지됩니다.
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2" role="list">
                  {activeTemplateGrants.map((grant) => (
                    <div
                      key={grant.id}
                      role="listitem"
                      className="rounded-lg border border-green-200 bg-white p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100">
                          {grant.template?.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Admin grant cards use the stored catalog cover URL.
                            <img
                              src={grant.template.thumbnail_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {grant.template?.name || grant.template_id}
                          </p>
                          <p className="mt-1 text-xs text-green-700">
                            권한 부여 완료 · {formatDate(grant.granted_at)}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500">
                            {grant.granted_by
                              ? `관리자 #${grant.granted_by}`
                              : "관리자 정보 없음"}
                          </p>
                          <p className="mt-1 truncate font-mono text-[10px] text-gray-400">
                            {grant.template_id}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRevoke(grant)}
                          disabled={updating || completing || revoking}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          회수
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {order.status === "completed" && !hasActiveTemplateGrant ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                    주문 상태는 완료지만 템플릿 권한은 아직 부여되지 않았습니다.
                  </p>
                ) : null}

                {hasActiveTemplateGrant && !isAdditionalGrantOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setResultTemplateId("");
                      setIsAdditionalGrantOpen(true);
                    }}
                    disabled={updating || completing || revoking}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-secondary/50 bg-white px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    템플릿 추가 부여
                  </button>
                ) : null}

                {canSelectTemplate ? (
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-700">
                        {hasActiveTemplateGrant
                          ? "추가로 부여할 템플릿"
                          : "완료 처리할 템플릿"}
                      </p>
                      {hasActiveTemplateGrant ? (
                        <button
                          type="button"
                          onClick={() => setIsAdditionalGrantOpen(false)}
                          className="text-xs text-gray-500 underline hover:text-gray-700"
                        >
                          닫기
                        </button>
                      ) : null}
                    </div>
                    {isTemplateCandidatesLoading ? (
                      <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
                        선택 가능한 템플릿을 불러오는 중...
                      </p>
                    ) : availableTemplateCandidates.length > 0 ? (
                      <div
                        className="max-h-72 space-y-2 overflow-y-auto"
                        role="radiogroup"
                        aria-label="권한을 부여할 썸네일 템플릿"
                      >
                        {availableTemplateCandidates.map(renderTemplateCard)}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
                        선택 가능한 게시 썸네일 템플릿이 없습니다.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleComplete}
                      disabled={
                        !resultTemplateId.trim() ||
                        updating ||
                        completing ||
                        revoking
                      }
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {completing
                        ? "권한 부여 중..."
                        : hasActiveTemplateGrant
                          ? "선택 템플릿 추가 부여"
                          : "템플릿 권한 부여 및 완료"}
                    </button>
                  </div>
                ) : null}
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
                disabled={updating || completing || revoking}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {isDeadlineModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-primary">
                마감일 직접 설정
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                적용할 마감일을 선택해주세요.
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              마감일
              <input
                type="date"
                value={draftDeadline}
                onChange={(event) => setDraftDeadline(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeadlineModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={applyDraftDeadline}
                disabled={!draftDeadline}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
