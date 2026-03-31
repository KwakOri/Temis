import type { ReactNode } from "react";

import type { ShopTemplateWithPlans } from "@/types/templateDetail";

interface TemplateDetailContentProps {
  template: ShopTemplateWithPlans;
  showTransferNotice?: boolean;
  purchaseSection?: ReactNode;
}

const formatPrice = (price: number | null) => `₩${(price ?? 0).toLocaleString()}`;

const getPlanFeatures = (plan: ShopTemplateWithPlans["template_plans"][number]) => {
  const features: string[] = [];

  if (plan.is_artist) features.push("팬아트 아티스트명 작성 기능");
  if (plan.is_memo) features.push("주간 메모 기능");
  if (plan.is_multi_schedule) features.push("단일 요일 다중 시간표 기능");
  if (plan.is_guerrilla) features.push("게릴라 방송 설정 기능");
  if (plan.is_offline_memo) features.push("오프라인 메모 기능");

  return features;
};

export default function TemplateDetailContent({
  template,
  showTransferNotice = false,
  purchaseSection,
}: TemplateDetailContentProps) {
  const linkedArtists = (template.template_artists || [])
    .map((relation) => relation.artist?.name)
    .filter((name): name is string => Boolean(name));

  const primaryArtistName =
    template.template_artists?.find((relation) => relation.is_primary)?.artist
      ?.name || linkedArtists[0] || null;

  const litePlan = template.template_plans?.find((p) => p.plan === "lite");
  const proPlan = template.template_plans?.find((p) => p.plan === "pro");
  const sortedPlans = [...(template.template_plans || [])].sort((a, b) =>
    a.plan === "lite" ? -1 : b.plan === "lite" ? 1 : 0
  );

  return (
    <div className="bg-timetable-form-bg rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-tertiary">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-video bg-timetable-input-bg rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                template.templates.thumbnail_url ||
                `/thumbnail/${template.template_id}.png`
              }
              alt={template.templates.name || "템플릿"}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML =
                    '<div class="w-full h-full flex items-center justify-center text-dark-gray/40">썸네일 이미지 없음</div>';
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-dark-gray">
              {template.templates.name}
            </h1>
            <p className="text-dark-gray/70">{template.templates.description}</p>
            {primaryArtistName && (
              <p className="text-sm text-slate-500 mt-2">
                대표 작가: {primaryArtistName}
              </p>
            )}
            {linkedArtists.length > 1 && (
              <p className="text-sm text-slate-500 mt-1">
                참여 작가: {linkedArtists.join(", ")}
              </p>
            )}
          </div>

          <div className="border-t border-tertiary pt-6">
            <h3 className="font-semibold mb-3 text-dark-gray">플랜 선택</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {litePlan && (
                <div className="p-4 rounded-lg border-2 border-tertiary">
                  <div className="text-xs text-dark-gray/70 mb-1">LITE</div>
                  <div className="text-2xl font-bold text-dark-gray">
                    {formatPrice(litePlan.price)}
                  </div>
                </div>
              )}
              {proPlan && (
                <div className="p-4 rounded-lg border-2 border-secondary bg-secondary/20">
                  <div className="text-xs text-secondary mb-1">PRO</div>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(proPlan.price)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {sortedPlans.length > 0 && (
            <div className="border-t border-tertiary pt-6">
              <h3 className="font-semibold mb-3 text-dark-gray">
                플랜별 지원 기능
              </h3>
              <div className="space-y-4">
                {sortedPlans.map((plan) => {
                  const features = getPlanFeatures(plan);

                  return (
                    <div
                      key={plan.id}
                      className={`p-4 rounded-lg border ${
                        plan.plan === "pro"
                          ? "border-secondary bg-secondary/20"
                          : "border-tertiary bg-tertiary"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            plan.plan === "pro"
                              ? "bg-secondary text-white"
                              : "bg-dark-gray text-white"
                          }`}
                        >
                          {plan.plan.toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-dark-gray">
                          {formatPrice(plan.price)}
                        </span>
                      </div>
                      {features.length > 0 && (
                        <ul className="list-disc list-inside text-dark-gray/70 space-y-1 text-sm">
                          {features.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {template.purchase_instructions && (
            <div className="border-t border-tertiary pt-6">
              <h3 className="font-semibold mb-3 text-dark-gray">상품 상세 설명</h3>
              <div className="prose prose-sm max-w-none">
                <div className="text-dark-gray/70 whitespace-pre-wrap leading-relaxed">
                  {template.purchase_instructions}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-tertiary pt-4">
            <p className="text-sm text-dark-gray/60 mt-2">
              구매하신 템플릿은 본인만 사용 가능하며 타인과 공유하거나 타인에게
              양도할 수 없습니다.
            </p>
            {showTransferNotice && (
              <p className="text-sm text-dark-gray/60 mt-2">
                계좌 송금으로 결제가 진행됩니다
              </p>
            )}
          </div>

          {purchaseSection && (
            <div className="border-t border-tertiary pt-6">{purchaseSection}</div>
          )}
        </div>
      </div>
    </div>
  );
}
