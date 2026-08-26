"use client";

import BackButton from "@/components/BackButton";
import ThumbnailCustomOrderForm from "@/components/shop/ThumbnailCustomOrderForm";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminOptions } from "@/hooks/query/useAdminOptions";
import {
  useEstimatedThumbnailCustomOrderDeadline,
  useSubmitThumbnailCustomOrder,
} from "@/hooks/query/useCustomThumbnailOrder";
import type { ThumbnailCustomOrderFormData } from "@/types/customThumbnailOrder";
import { CalendarDays, Download, ImageIcon, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const formatDisplayDate = (value?: string | null) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const thumbnailOrderFeatures = [
  {
    icon: Pencil,
    title: "화면에서 이미지를 보며 편집",
    description:
      "고정된 템플릿에 텍스트와 이미지만 변경하며 편리하게 사용할 수 있습니다.",
  },
  {
    icon: Download,
    title: "PNG 다운로드",
    description:
      "완성한 썸네일을 사용자 화면에서 미리보고 PNG로 다운로드할 수 있습니다.",
  },
];

export default function ThumbnailCustomOrderPage() {
  const { user } = useAuth();
  const { data: generalOptions, isLoading: isLoadingOptions } =
    useAdminOptions("general");
  const { data: intakeData, isLoading: isLoadingIntake } =
    useEstimatedThumbnailCustomOrderDeadline(Boolean(user));
  const submitMutation = useSubmitThumbnailCustomOrder();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const isThumbnailOrderEnabled = generalOptions?.some(
    (option) => option.value === "custom_thumbnail_orders" && option.is_enabled,
  );
  // TODO: 로컬 테스트가 끝나면 임시 override를 제거하거나 false로 바꾸세요.
  const isLocalIntakeTestOverride = process.env.NODE_ENV === "development";
  const isIntakeReady = isLocalIntakeTestOverride
    ? true
    : user
      ? Boolean(isThumbnailOrderEnabled && intakeData?.accepting)
      : Boolean(isThumbnailOrderEnabled);
  const isCheckingIntake = isLocalIntakeTestOverride
    ? false
    : isLoadingOptions || (Boolean(user) && isLoadingIntake);
  const intakeStatus = isCheckingIntake
    ? "접수 상태 확인 중"
    : isIntakeReady
      ? "신청 가능"
      : "신청 준비 중";
  const estimatedDeadlineLabel = isCheckingIntake
    ? "확인 중..."
    : formatDisplayDate(intakeData?.estimatedDeadline) ||
      (user ? "문의 후 안내" : "로그인 후 확인");

  const handleOrderSubmit = async (formData: ThumbnailCustomOrderFormData) => {
    await submitMutation.mutateAsync(formData);
    window.alert("맞춤형 썸네일 제작 신청이 완료되었습니다!");
    setShowOrderForm(false);
  };

  if (showOrderForm) {
    return (
      <ThumbnailCustomOrderForm
        onClose={() => setShowOrderForm(false)}
        onSubmit={handleOrderSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-timetable-card-bg to-tertiary px-4 py-6 sm:px-6 md:py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <BackButton className="mb-6" />

        <section className="rounded-2xl border border-tertiary bg-timetable-form-bg p-6 shadow-xl backdrop-blur-sm md:p-10">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <div className="hidden lg:block" />

            <div className="text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-white">
                <ImageIcon className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold text-dark-gray md:text-3xl">
                맞춤형 썸네일 제작
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-dark-gray/70">
                방송과 콘텐츠에 맞는 고객 전용 4K 썸네일 템플릿을
                제작해드립니다.
              </p>
              <span className="mt-4 inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                {intakeStatus}
              </span>
            </div>

            <div className="w-full rounded-lg border border-primary/20 bg-white/80 px-4 py-3 text-left shadow-sm lg:max-w-xs lg:justify-self-end">
              <div className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-4 w-4" />
                <p className="text-xs font-semibold">
                  현재 신청 기준 예상 마감일
                </p>
              </div>
              <p className="mt-2 text-xl font-bold text-dark-gray">
                {estimatedDeadlineLabel}
              </p>
              <p className="mt-1 text-xs text-dark-gray/60">
                활성 주문 대기열과 목·일 기준
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {thumbnailOrderFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-xl bg-timetable-card-bg p-5"
                >
                  <Icon className="h-6 w-6 text-secondary" />
                  <h2 className="mt-3 font-semibold text-dark-gray">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-dark-gray/70">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-dark-gray">제작 일정</h2>
                <p className="mt-2 text-sm leading-relaxed text-dark-gray/70">
                  기본 마감일은 매주 목요일과 일요일을 기준으로 운영하고
                  있습니다. 세부 일정은 주문제작 접수와 개별 연락으로
                  안내중입니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-secondary/20 bg-secondary/5 p-5 text-sm leading-relaxed text-dark-gray/70">
            <p className="mt-2">
              신청은 제작 요청 입력, 가격 선택, 입금 안내 확인의 3단계로
              진행됩니다.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isCheckingIntake ? (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-lg bg-slate-300 px-6 py-3 font-semibold text-slate-500 sm:w-auto"
              >
                접수 상태 확인 중
              </button>
            ) : !isIntakeReady ? (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-lg bg-slate-300 px-6 py-3 font-semibold text-slate-500 sm:w-auto"
              >
                신청 준비 중
              </button>
            ) : user ? (
              <button
                type="button"
                onClick={() => setShowOrderForm(true)}
                className="w-full rounded-lg bg-secondary px-6 py-3 font-semibold text-white transition-colors hover:bg-secondary/90 sm:w-auto"
              >
                제작 신청하기
              </button>
            ) : (
              <Link
                href="/auth"
                className="w-full rounded-lg bg-secondary px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-secondary/90 sm:w-auto"
              >
                로그인 후 신청하기
              </Link>
            )}
            <Link
              href="/custom-order"
              className="w-full rounded-lg border border-tertiary px-6 py-3 text-center font-semibold text-dark-gray transition-colors hover:bg-tertiary sm:w-auto"
            >
              제작 종류 다시 선택
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
