"use client";

import BackButton from "@/components/BackButton";
import { useAdminOptions } from "@/hooks/query/useAdminOptions";
import { ArrowRight, ImageIcon, Palette } from "lucide-react";
import Link from "next/link";

interface CustomOrderChoiceProps {
  href: string;
  title: string;
  description: string;
  status: string;
  icon: React.ReactNode;
  statusClassName: string;
}

function CustomOrderChoice({
  href,
  title,
  description,
  status,
  icon,
  statusClassName,
}: CustomOrderChoiceProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-tertiary bg-white p-6 text-left shadow-lg transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}
        >
          {status}
        </span>
      </div>
      <h2 className="text-xl font-bold text-dark-gray">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-dark-gray/70">
        {description}
      </p>
      <span className="mt-6 inline-flex items-center font-semibold text-primary">
        안내 보기
        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export default function CustomOrderSelectionPage() {
  const { data: generalOptions, isLoading } = useAdminOptions("general");
  const isTimetableOrderEnabled = generalOptions?.some(
    (option) => option.value === "custom_timetable_orders" && option.is_enabled,
  );
  const isThumbnailOrderEnabled = generalOptions?.some(
    (option) => option.value === "custom_thumbnail_orders" && option.is_enabled,
  );

  const timetableStatus = isLoading
    ? "확인 중"
    : isTimetableOrderEnabled
      ? "신청 가능"
      : "접수 마감";
  const thumbnailStatus = isLoading
    ? "확인 중"
    : isThumbnailOrderEnabled
      ? "신청 가능"
      : "접수 마감";

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-timetable-card-bg to-tertiary px-4 py-6 sm:px-6 md:py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <BackButton className="mb-6" />

        <section className="rounded-2xl border border-tertiary bg-timetable-form-bg p-6 shadow-xl backdrop-blur-sm md:p-10">
          <div className="text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
              <Palette className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-dark-gray md:text-3xl">
              맞춤형 제작
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-dark-gray/70">
              원하는 작업 종류를 선택해 맞춤형 제작 안내를 확인해보세요.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <CustomOrderChoice
              href="/custom-order/timetable"
              title="맞춤형 시간표"
              description="나만의 디자인과 방송 정보를 담은 시간표를 전문가와 함께 제작합니다."
              status={timetableStatus}
              statusClassName={
                isLoading
                  ? "bg-slate-100 text-slate-600"
                  : isTimetableOrderEnabled
                    ? "bg-primary/10 text-primary"
                    : "bg-slate-100 text-slate-600"
              }
              icon={<Palette className="h-7 w-7" />}
            />
            <CustomOrderChoice
              href="/custom-order/thumbnail"
              title="맞춤형 썸네일"
              description="4K UHD 규격의 고객 전용 v2 썸네일 템플릿 제작 안내를 확인합니다."
              status={thumbnailStatus}
              statusClassName={
                isLoading
                  ? "bg-slate-100 text-slate-600"
                  : isThumbnailOrderEnabled
                    ? "bg-secondary/10 text-secondary"
                    : "bg-slate-100 text-slate-600"
              }
              icon={<ImageIcon className="h-7 w-7" />}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
