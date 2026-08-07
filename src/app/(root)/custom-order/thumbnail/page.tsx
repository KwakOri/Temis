"use client";

import BackButton from "@/components/BackButton";
import { useAdminOptions } from "@/hooks/query/useAdminOptions";
import {
  CalendarDays,
  Download,
  ImageIcon,
  LockKeyhole,
  Pencil,
} from "lucide-react";
import Link from "next/link";

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

const thumbnailOrderFields = [
  { label: "사용 목적", placeholder: "방송·콘텐츠에서 사용할 목적" },
  { label: "외부 연락처", placeholder: "이메일 또는 Discord 등" },
  {
    label: "기본 문구와 전체 요청",
    placeholder: "고정 문구, 교체 문구, 추가 요청사항",
  },
  {
    label: "이미지 입력 요구사항",
    placeholder: "교체 가능한 이미지와 원본 에셋 설명",
  },
  { label: "분위기·색상·구성", placeholder: "원하는 디자인 키워드" },
];

export default function ThumbnailCustomOrderPage() {
  const { data: generalOptions, isLoading: isLoadingOptions } =
    useAdminOptions("general");
  const isThumbnailOrderEnabled = generalOptions?.some(
    (option) => option.value === "custom_thumbnail_orders" && option.is_enabled,
  );
  const intakeStatus = isLoadingOptions
    ? "접수 상태 확인 중"
    : isThumbnailOrderEnabled
      ? "가격·수정 정책 확정 대기"
      : "신청 준비 중";

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
              기본 가격과 추가 옵션, 수정 횟수는 주문제작 페이지를 구체화한 뒤
              안내합니다.
            </p>
          </div>

          <section className="mt-8 rounded-xl border border-gray-200 bg-white/60 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-semibold text-dark-gray">
                  신청 항목 미리보기
                </h2>
                <p className="mt-1 text-sm text-dark-gray/70">
                  가격·추가 옵션·수정 정책이 확정되면 아래 항목을 실제 신청
                  폼으로 전환합니다.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                현재 제출 비활성
              </span>
            </div>
            <fieldset
              disabled
              className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {thumbnailOrderFields.map((field, index) => (
                <label
                  key={field.label}
                  className={`text-sm font-medium text-dark-gray ${index === 2 ? "md:col-span-2" : ""}`}
                >
                  {field.label}
                  {index === 2 || index === 3 ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder}
                      className="mt-1 w-full resize-none rounded-md border border-gray-300 bg-slate-100 px-3 py-2 font-normal"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-slate-100 px-3 py-2 font-normal"
                    />
                  )}
                </label>
              ))}
              <label className="text-sm font-medium text-dark-gray">
                희망 마감일
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-gray-300 bg-slate-100 px-3 py-2 font-normal"
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-dark-gray">
                <input type="checkbox" />
                포트폴리오 공개 동의 여부
              </label>
              <label className="text-sm font-medium text-dark-gray">
                입금자명
                <input
                  type="text"
                  placeholder="가격 안내 후 입력"
                  className="mt-1 w-full rounded-md border border-gray-300 bg-slate-100 px-3 py-2 font-normal"
                />
              </label>
            </fieldset>
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-600">
              실제 제출은 화면뿐 아니라 서버에서도 `custom_thumbnail_orders`
              접수 옵션과 가격 정책 준비 상태를 확인합니다. 정책 확정 전에는
              주문 row와 파일 연결을 생성하지 않습니다.
            </p>
          </section>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-slate-300 px-6 py-3 font-semibold text-slate-500 sm:w-auto"
            >
              신청 준비 중
            </button>
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
