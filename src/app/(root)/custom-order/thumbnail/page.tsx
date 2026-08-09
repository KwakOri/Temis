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
import {
  CalendarDays,
  Download,
  ImageIcon,
  LockKeyhole,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const thumbnailOrderFeatures = [
  {
    icon: ImageIcon,
    title: "4K UHD 기본 규격",
    description:
      "3840 × 2160, 16:9 기준의 고객 전용 썸네일 템플릿을 제작합니다.",
  },
  {
    icon: Pencil,
    title: "런타임 편집",
    description:
      "관리자가 공개한 텍스트와 이미지 입력만 변경해 반복 사용할 수 있습니다.",
  },
  {
    icon: Download,
    title: "PNG 다운로드",
    description:
      "완성한 썸네일을 사용자 화면에서 미리보고 PNG로 다운로드합니다.",
  },
  {
    icon: LockKeyhole,
    title: "고객 전용 비공개 템플릿",
    description:
      "제작 완료 후 고객 계정에만 사용 권한을 부여하며 상점에 재판매하지 않습니다.",
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
  const isIntakeReady = user
    ? Boolean(isThumbnailOrderEnabled && intakeData?.accepting)
    : Boolean(isThumbnailOrderEnabled);
  const isCheckingIntake = isLoadingOptions || (Boolean(user) && isLoadingIntake);
  const intakeStatus = isCheckingIntake
    ? "접수 상태 확인 중"
    : isIntakeReady
      ? "신청 가능"
      : "신청 준비 중";

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
          <div className="text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-white">
              <ImageIcon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-dark-gray md:text-3xl">
              맞춤형 썸네일 제작
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-dark-gray/70">
              방송과 콘텐츠에 맞는 고객 전용 4K 썸네일 템플릿을 제작해드립니다.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              {intakeStatus}
            </span>
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
                  기본 마감일은 매주 목요일과 일요일을 기준으로 운영할
                  예정입니다. 세부 일정은 주문제작 접수와 외부 소통 과정에서
                  안내합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-secondary/20 bg-secondary/5 p-5 text-sm leading-relaxed text-dark-gray/70">
            <p>
              제작 완료 후 관리자가 비공개 v2 썸네일 템플릿을 발행하고 고객
              계정에 사용 권한을 부여합니다. 고객은 레이어 구조를 편집하지 않고
              공개된 입력값만 변경할 수 있습니다.
            </p>
            <p className="mt-2">
              신청은 제작 요청 입력과 가격 선택의 2단계로 진행되며, 추가 옵션
              없이 필요한 자료만 간단히 제출할 수 있습니다.
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
