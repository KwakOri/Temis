import type { ReactNode } from "react";

import { TemplateCover } from "@/components/templates/template-cover";
import { TemplateKindBadge } from "@/components/templates/template-kind-badge";
import type { ShopTemplateWithPlans } from "@/types/templateDetail";
import { getTemplateUseHref } from "@/utils/template-links";
import {
  resolveConsumerTemplateCover,
  resolveConsumerTemplateKind,
} from "@/utils/templates/consumer-template";

interface TemplateDetailContentProps {
  template: ShopTemplateWithPlans;
  showTransferNotice?: boolean;
  purchaseSection?: ReactNode;
}

const formatPrice = (price: number | null) =>
  `₩${(price ?? 0).toLocaleString()}`;

const getPlanFeatures = (
  plan: ShopTemplateWithPlans["template_plans"][number],
  templateKind: "timetable" | "thumbnail",
) => {
  if (templateKind === "thumbnail") {
    return [];
  }

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
      ?.name ||
    linkedArtists[0] ||
    null;

  const litePlan = template.template_plans?.find((p) => p.plan === "lite");
  const proPlan = template.template_plans?.find((p) => p.plan === "pro");
  const sortedPlans = [...(template.template_plans || [])].sort((a, b) =>
    a.plan === "lite" ? -1 : b.plan === "lite" ? 1 : 0,
  );
  const templateEngine =
    template.templates.template_engine === "legacy" ? "legacy" : "studio";
  const templateKind =
    resolveConsumerTemplateKind(
      template.templates.template_engine,
      template.templates.template_kind,
    ) ?? "timetable";
  const coverUrl = resolveConsumerTemplateCover({
    id: template.templates.id,
    engine: templateEngine,
    kind: templateKind,
    thumbnailUrl: template.templates.thumbnail_url,
  });
  const executionHref = getTemplateUseHref(
    template.templates.id,
    template.templates.template_engine,
    template.templates.template_kind,
  );
  const kindDescription =
    templateKind === "thumbnail"
      ? "방송·SNS용 이미지를 직접 구성하고 저장하는 썸네일 템플릿입니다."
      : "방송 일정과 메모를 정리하고 주간 시간표를 만드는 템플릿입니다.";

  return (
    <div className="bg-timetable-form-bg rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm border border-tertiary">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-lg bg-timetable-input-bg">
            <TemplateCover
              alt={template.templates.name || "템플릿"}
              className="h-full w-full"
              kind={templateKind}
              src={coverUrl}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-dark-gray">
              {template.templates.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <TemplateKindBadge kind={templateKind} />
              <span className="text-sm text-dark-gray/65">
                {kindDescription}
              </span>
            </div>
            <p className="text-dark-gray/70">
              {template.templates.description}
            </p>
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
            <h3 className="font-semibold mb-3 text-dark-gray">사용 경로</h3>
            <p className="text-sm text-dark-gray/70 leading-relaxed">
              구매가 완료되면 마이페이지에서{" "}
              {templateKind === "thumbnail" ? "썸네일" : "시간표"} 만들기로
              이동해 사용할 수 있습니다.
            </p>
            <code className="mt-3 block rounded-lg bg-dark-gray/5 px-3 py-2 text-xs text-dark-gray/70 break-all">
              {executionHref}
            </code>
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
                  const features = getPlanFeatures(plan, templateKind);

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

          {template.detailed_description && (
            <div className="border-t border-tertiary pt-6">
              <h3 className="font-semibold mb-3 text-dark-gray">
                상품 상세 설명
              </h3>
              <div className="prose prose-sm max-w-none">
                <div className="text-dark-gray/70 whitespace-pre-wrap leading-relaxed">
                  {template.detailed_description}
                </div>
              </div>
            </div>
          )}

          {template.purchase_instructions && (
            <div className="border-t border-tertiary pt-6">
              <h3 className="font-semibold mb-3 text-dark-gray">구매 안내</h3>
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
            <div className="border-t border-tertiary pt-6">
              {purchaseSection}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
