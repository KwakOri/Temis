"use client";

import BackButton from "@/components/BackButton";
import { TemplateCover } from "@/components/templates/template-cover";
import { TemplateKindBadge } from "@/components/templates/template-kind-badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePublicTemplates,
  useUserTemplateAccess,
} from "@/hooks/query/useShop";
import { SortOrder } from "@/types/shop";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyboardEvent, Suspense, useMemo, useState } from "react";
import {
  resolveConsumerTemplateCover,
  resolveConsumerTemplateKind,
} from "@/utils/templates/consumer-template";

type ShopSection = "timetable" | "thumbnail";

const SHOP_SECTIONS: readonly {
  value: ShopSection;
  label: string;
}[] = [
  { value: "timetable", label: "시간표" },
  { value: "thumbnail", label: "썸네일" },
];

const resolveShopSection = (value: string | null): ShopSection =>
  value === "thumbnail" ? "thumbnail" : "timetable";

function ShopPageContent() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const shopSection = resolveShopSection(searchParams.get("kind"));
  const [showOnlyUnpurchased, setShowOnlyUnpurchased] = useState(false);

  // React Query hooks
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
  } = usePublicTemplates(sortOrder);
  const { data: accessibleTemplateIds = [], isLoading: accessLoading } =
    useUserTemplateAccess(user?.id);
  const loading =
    templatesLoading || (showOnlyUnpurchased && user && accessLoading);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const kind = resolveConsumerTemplateKind(
        template.templates.template_engine,
        template.templates.template_kind,
      );

      if (!kind || kind !== shopSection) {
        return false;
      }

      if (showOnlyUnpurchased && user) {
        return !accessibleTemplateIds.includes(template.template_id!);
      }

      return true;
    });
  }, [
    templates,
    shopSection,
    showOnlyUnpurchased,
    user,
    accessibleTemplateIds,
  ]);

  const handleShopSectionChange = (section: ShopSection) => {
    if (section === shopSection) return;

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (section === "timetable") {
      nextSearchParams.delete("kind");
    } else {
      nextSearchParams.set("kind", section);
    }

    const queryString = nextSearchParams.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const handleShopSectionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    section: ShopSection,
  ) => {
    const currentIndex = SHOP_SECTIONS.findIndex(
      (item) => item.value === section,
    );
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % SHOP_SECTIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + SHOP_SECTIONS.length) % SHOP_SECTIONS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = SHOP_SECTIONS.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextSection = SHOP_SECTIONS[nextIndex].value;
    handleShopSectionChange(nextSection);
    requestAnimationFrame(() => {
      document.getElementById(`shop-tab-${nextSection}`)?.focus();
    });
  };

  const emptyTemplateMessage = showOnlyUnpurchased
    ? "구매하지 않은 템플릿이 없습니다."
    : shopSection === "thumbnail"
      ? "현재 판매 중인 썸네일 템플릿이 없습니다."
      : "현재 판매 중인 시간표 템플릿이 없습니다.";

  if (loading) {
    return (
      <div className="min-h-screen py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-dark-gray/70">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (templatesError) {
    return (
      <div className="min-h-screen py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-dark-gray mb-2">
              데이터를 불러올 수 없습니다
            </h3>
            <p className="text-dark-gray/60">
              {templatesError instanceof Error
                ? templatesError.message
                : "알 수 없는 오류가 발생했습니다."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackButton className="mb-4" />
        </div>

        {/* Custom Order 링크 배너 */}
        <Link
          href="/custom-order"
          className="group block mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-secondary shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          <div className="p-6 md:p-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                  맞춤형 디자인 제작
                </h3>
                <p className="text-white/90 text-sm md:text-base">
                  시간표와 썸네일을 나만의 디자인으로 제작해보세요
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <svg
                className="w-6 h-6 md:w-8 md:h-8 text-white transform group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </Link>

        <div className="bg-timetable-form-bg rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-tertiary mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-primary">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5H21"
                />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-dark-gray mb-2">
              템플릿 상점
            </h1>
            <p className="text-dark-gray/70">
              시간표와 썸네일 템플릿을 종류별로 둘러보고 구매하세요
            </p>
          </div>

          {/* 컨텐츠 영역 */}
          <div
            role="tablist"
            aria-label="상점 상품 종류"
            className="mb-6 flex justify-center gap-2 border-b border-tertiary"
          >
            {SHOP_SECTIONS.map((section) => {
              const isSelected = section.value === shopSection;

              return (
                <button
                  key={section.value}
                  id={`shop-tab-${section.value}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls="shop-panel"
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleShopSectionChange(section.value)}
                  onKeyDown={(event) =>
                    handleShopSectionKeyDown(event, section.value)
                  }
                  className={`min-w-24 border-b-2 px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-primary text-primary"
                      : "border-transparent text-dark-gray/60 hover:border-primary/40 hover:text-dark-gray"
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id="shop-panel"
            aria-labelledby={`shop-tab-${shopSection}`}
            tabIndex={0}
            className="outline-none"
          >
            {/* 정렬 및 필터 컨트롤 */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-dark-gray">
                  정렬:
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="px-3 py-2 border border-tertiary rounded-lg text-sm bg-timetable-input-bg text-dark-gray focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="newest">최신 순</option>
                  <option value="oldest">오래된 순</option>
                </select>
              </div>

              {user && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-dark-gray">
                    구매하지 않은 템플릿만:
                  </span>
                  <button
                    onClick={() => setShowOnlyUnpurchased(!showOnlyUnpurchased)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      showOnlyUnpurchased ? "bg-primary" : "bg-tertiary"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                        showOnlyUnpurchased ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const templateKind = resolveConsumerTemplateKind(
                  template.templates.template_engine,
                  template.templates.template_kind,
                );

                if (!templateKind) {
                  return null;
                }

                const templateEngine =
                  template.templates.template_engine === "legacy"
                    ? "legacy"
                    : "studio";
                const coverUrl = resolveConsumerTemplateCover({
                  id: template.templates.id,
                  engine: templateEngine,
                  kind: templateKind,
                  thumbnailUrl: template.templates.thumbnail_url,
                });
                const kindLabel =
                  templateKind === "thumbnail" ? "썸네일" : "시간표";
                const kindDescription =
                  templateKind === "thumbnail"
                    ? "방송·SNS용 이미지를 만드는 템플릿"
                    : "방송 일정과 메모를 정리하는 시간표 템플릿";
                const primaryArtist =
                  template.template_artists?.find((item) => item.is_primary)
                    ?.artist || template.template_artists?.[0]?.artist;

                return (
                  <Link
                    key={template.id}
                    href={`/shop/${template.template_id}`}
                    className="group block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-tertiary hover:border-primary/50"
                  >
                    <TemplateCover
                      src={coverUrl}
                      alt={template.templates.name || "템플릿"}
                      kind={templateKind}
                      className="aspect-video rounded-t-2xl group-hover:scale-[1.02] transition-transform duration-300"
                    />

                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <TemplateKindBadge kind={templateKind} />
                        <span className="text-xs text-slate-500">
                          작가: {primaryArtist?.name || "테미스"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-dark-gray group-hover:text-primary transition-colors mb-2">
                        {template.templates.name}
                      </h3>
                      <p className="text-dark-gray/70 text-sm line-clamp-2 mb-2">
                        {template.templates.description || kindDescription}
                      </p>
                      <p className="text-xs text-dark-gray/55 mb-4">
                        {kindDescription}
                      </p>
                      {template.template_plans &&
                        template.template_plans.length > 0 && (
                          <div className="flex items-center gap-3 mb-4">
                            {template.template_plans.find(
                              (p) => p.plan === "lite",
                            ) && (
                              <div className="flex-1 bg-tertiary rounded-lg px-3 py-2">
                                <div className="text-xs text-dark-gray/70 mb-1">
                                  LITE
                                </div>
                                <div className="text-sm font-bold text-dark-gray">
                                  ₩
                                  {template.template_plans
                                    .find((p) => p.plan === "lite")
                                    ?.price?.toLocaleString()}
                                </div>
                              </div>
                            )}
                            {template.template_plans.find(
                              (p) => p.plan === "pro",
                            ) && (
                              <div className="flex-1 bg-secondary/20 rounded-lg px-3 py-2">
                                <div className="text-xs text-dark-gray mb-1">
                                  PRO
                                </div>
                                <div className="text-sm font-bold text-dark-gray">
                                  ₩
                                  {template.template_plans
                                    .find((p) => p.plan === "pro")
                                    ?.price?.toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      <div className="flex items-center text-primary text-sm font-medium">
                        <span>{kindLabel} 자세히 보기</span>
                        <svg
                          className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-tertiary">
                  <svg
                    className="w-8 h-8 text-dark-gray/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <p className="text-dark-gray/60 text-lg">
                  {emptyTemplateMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-dark-gray/70">상점을 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}
