"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import RoyaltyManualAdjustmentModal from "@/components/admin/RoyaltyManualAdjustmentModal";
import {
  useAdminRoyaltySettlementRun,
  useMarkRoyaltiesPaid,
  useRecalculateRoyalties,
  useUpdateRoyalty,
} from "@/hooks/query/useAdminRoyalties";
import { getAdminPathByTabId } from "@/lib/adminTabs";
import { RoyaltyRuleType, RoyaltySaleItem } from "@/types/admin";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HandCoins,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatMonthValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function getPreviousMonthValue(): string {
  const today = new Date();
  return formatMonthValue(new Date(today.getFullYear(), today.getMonth() - 1, 1));
}

function normalizeMonthValue(value?: string | null): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return getPreviousMonthValue();
}

function addMonths(monthValue: string, amount: number): string {
  const [year, month] = monthValue.split("-").map(Number);
  return formatMonthValue(new Date(year, month - 1 + amount, 1));
}

function formatMonthLabel(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  return `${year}년 ${month}월`;
}

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR");
}

function formatRuleValue(
  type: RoyaltyRuleType | null,
  value: number | null
): string {
  if (!type || value === null) {
    return "-";
  }

  if (type === "fixed") {
    return formatWon(Math.round(value));
  }

  return `${value}%`;
}

function getRuleSourceLabel(royalty: RoyaltySaleItem): string {
  switch (royalty.royaltySource) {
    case "artist":
      return "작가 기본";
    case "template":
      return "템플릿 override";
    case "manual":
      return "수동";
    case "missing":
    default:
      return "미설정";
  }
}

interface RoyaltySettlementRunManagementProps {
  initialMonth?: string | null;
}

export default function RoyaltySettlementRunManagement({
  initialMonth,
}: RoyaltySettlementRunManagementProps) {
  const router = useRouter();
  const normalizedInitialMonth = useMemo(
    () => normalizeMonthValue(initialMonth),
    [initialMonth]
  );
  const [month, setMonth] = useState(normalizedInitialMonth);
  const [draftMonth, setDraftMonth] = useState(normalizedInitialMonth);
  const [manualRoyalty, setManualRoyalty] = useState<RoyaltySaleItem | null>(
    null
  );
  const [manualAmountDraft, setManualAmountDraft] = useState("");

  useEffect(() => {
    setMonth(normalizedInitialMonth);
    setDraftMonth(normalizedInitialMonth);
    setManualRoyalty(null);
    setManualAmountDraft("");
  }, [normalizedInitialMonth]);

  const settlementRunQuery = useAdminRoyaltySettlementRun(month);
  const markPaidMutation = useMarkRoyaltiesPaid();
  const updateRoyaltyMutation = useUpdateRoyalty();
  const recalculateRoyaltiesMutation = useRecalculateRoyalties();
  const data = settlementRunQuery.data;
  const summary = data?.summary;
  const artists = data?.artists || [];
  const hasMissingRules = (summary?.missingRuleCount || 0) > 0;
  const hasTargets = (summary?.salesCount || 0) > 0;
  const isBusy =
    markPaidMutation.isPending ||
    updateRoyaltyMutation.isPending ||
    recalculateRoyaltiesMutation.isPending;

  const goToMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    setDraftMonth(nextMonth);
    setManualRoyalty(null);
    setManualAmountDraft("");
    router.push(`/admin/settlements/run?month=${nextMonth}`);
  };

  const completeSettlement = async () => {
    if (!summary || !hasTargets) {
      return;
    }

    if (hasMissingRules) {
      alert("로열티 설정이 누락된 항목을 먼저 조정해주세요.");
      return;
    }

    if (
      !confirm(
        `${formatMonthLabel(summary.month)} 정산을 완료 처리할까요?\n` +
          `작가 ${summary.artistCount}명, 정산 항목 ${summary.salesCount}건, ` +
          `정산금액 ${formatWon(summary.royaltyAmount)}`
      )
    ) {
      return;
    }

    try {
      const result = await markPaidMutation.mutateAsync({
        from: summary.periodFrom,
        to: summary.periodTo,
        settlementMonth: `${summary.month}-01`,
        title: `${formatMonthLabel(summary.month)} 로열티 정산`,
        rejectMissingRules: true,
      });

      alert(`${result.updatedCount}건을 정산 완료 처리했습니다.`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "정산 완료 처리 중 오류가 발생했습니다."
      );
    }
  };

  const recalculateCurrentMonth = async () => {
    if (!summary || !hasTargets) {
      return;
    }

    if (
      !confirm(
        `${formatMonthLabel(summary.month)} 미정산 로열티를 현재 설정 기준으로 재계산할까요?`
      )
    ) {
      return;
    }

    try {
      const result = await recalculateRoyaltiesMutation.mutateAsync({
        from: summary.periodFrom,
        to: summary.periodTo,
      });

      alert(`${result.updatedCount}건을 재계산했습니다.`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "로열티 재계산 중 오류가 발생했습니다."
      );
    }
  };

  const openManualRoyaltyModal = (royalty: RoyaltySaleItem) => {
    setManualRoyalty(royalty);
    setManualAmountDraft(String(royalty.royaltyAmount));
  };

  const closeManualRoyaltyModal = () => {
    setManualRoyalty(null);
    setManualAmountDraft("");
  };

  const saveManualRoyaltyAmount = async () => {
    if (!manualRoyalty) {
      return;
    }

    const nextAmount = Number(manualAmountDraft.replace(/,/g, "").trim());

    if (!Number.isFinite(nextAmount) || nextAmount < 0) {
      alert("정산금액은 0 이상의 숫자로 입력해주세요.");
      return;
    }

    try {
      await updateRoyaltyMutation.mutateAsync({
        id: manualRoyalty.id,
        data: {
          royaltyAmount: Math.round(nextAmount),
        },
      });
      closeManualRoyaltyModal();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "정산금액 저장 중 오류가 발생했습니다."
      );
    }
  };

  const resetManualRoyaltyToRule = async () => {
    if (!manualRoyalty) {
      return;
    }

    try {
      const result = await recalculateRoyaltiesMutation.mutateAsync({
        royaltyIds: [manualRoyalty.id],
        includeManual: true,
      });

      alert(`${result.updatedCount}건을 현재 규칙으로 갱신했습니다.`);
      closeManualRoyaltyModal();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "로열티 재계산 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div className="space-y-6">
      <AdminTabHeader
        title={`${formatMonthLabel(month)} 로열티 정산`}
        description="작가별 정산 대상과 판매 건별 로열티 산정 내역을 확인합니다"
        icon={HandCoins}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push(getAdminPathByTabId("settlements"))}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            정산 탭
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/settlements/royalty-settings")}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            로열티 설정
          </button>
        </div>
      </AdminTabHeader>

      <section className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">정산 대상 월</h3>
            <p className="text-sm text-gray-500 mt-1">
              미정산 상태인 판매 건만 정산 대상으로 표시됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="month"
              value={draftMonth}
              onChange={(event) => setDraftMonth(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              type="button"
              onClick={() => goToMonth(draftMonth)}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-secondary"
            >
              조회
            </button>
            <button
              type="button"
              onClick={() => goToMonth(addMonths(month, -1))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              이전 달
            </button>
            <button
              type="button"
              onClick={() => goToMonth(addMonths(month, 1))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              다음 달
            </button>
          </div>
        </div>
      </section>

      {settlementRunQuery.error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          정산 대상 정보를 불러오지 못했습니다.
        </div>
      ) : null}

      {hasMissingRules ? (
        <section className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
            <div>
              <h3 className="font-semibold text-orange-950">
                로열티 설정이 누락된 항목이 있습니다.
              </h3>
              <p className="text-sm text-orange-800 mt-1">
                누락된 {summary?.missingRuleCount || 0}건은 정산 완료 처리 전에
                로열티 설정을 보완하거나 수동 정산금액을 저장해야 합니다.
              </p>
            </div>
          </div>
        </section>
      ) : hasTargets ? (
        <section className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-950">
                정산 완료 처리가 가능합니다.
              </h3>
              <p className="text-sm text-green-800 mt-1">
                모든 정산 대상에 로열티 산정 방식이 기록되어 있습니다.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">작가</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary?.artistCount || 0}명
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">정산 항목</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary?.salesCount || 0}건
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">판매금액</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatWon(summary?.grossSales || 0)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">정산금액</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatWon(summary?.royaltyAmount || 0)}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">설정 누락</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary?.missingRuleCount || 0}건
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">작가별 정산 대상</h3>
            <p className="text-xs text-gray-500 mt-1">
              작가별 상세를 펼치면 상품 판매 기록과 로열티 산정 방식을 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={recalculateCurrentMonth}
              disabled={!hasTargets || isBusy || settlementRunQuery.isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  recalculateRoyaltiesMutation.isPending ? "animate-spin" : ""
                }`}
              />
              {recalculateRoyaltiesMutation.isPending
                ? "재계산 중"
                : "현재 규칙으로 재계산"}
            </button>
            <button
              type="button"
              onClick={completeSettlement}
              disabled={!hasTargets || hasMissingRules || isBusy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              <HandCoins className="h-4 w-4" />
              정산 완료 처리
            </button>
          </div>
        </div>

        {settlementRunQuery.isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            정산 대상을 불러오는 중입니다.
          </div>
        ) : artists.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            이 월에 남아있는 미정산 내역이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {artists.map((artist, index) => (
              <details
                key={artist.artistId}
                open={artist.missingRuleCount > 0 || index === 0}
                className="group"
              >
                <summary className="cursor-pointer list-none px-4 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(120px,0.6fr))] lg:items-center">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {artist.artistName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        상세 {artist.royalties.length}건
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 lg:text-right">
                      <div className="text-xs text-gray-500">판매 기록</div>
                      {artist.salesCount}건
                    </div>
                    <div className="text-sm text-gray-700 lg:text-right">
                      <div className="text-xs text-gray-500">판매금액</div>
                      {formatWon(artist.grossSales)}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 lg:text-right">
                      <div className="text-xs font-normal text-gray-500">
                        정산금액
                      </div>
                      {formatWon(artist.royaltyAmount)}
                    </div>
                    <div className="lg:text-right">
                      {artist.missingRuleCount > 0 ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-orange-100 text-xs font-medium text-orange-700">
                          설정 누락 {artist.missingRuleCount}건
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-green-100 text-xs font-medium text-green-700">
                          확인 완료
                        </span>
                      )}
                    </div>
                  </div>
                </summary>

                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-gray-600">
                          판매일
                        </th>
                        <th className="px-4 py-2 text-left text-xs text-gray-600">
                          템플릿
                        </th>
                        <th className="px-4 py-2 text-right text-xs text-gray-600">
                          판매금액
                        </th>
                        <th className="px-4 py-2 text-left text-xs text-gray-600">
                          산정 방식
                        </th>
                        <th className="px-4 py-2 text-right text-xs text-gray-600">
                          정산금액
                        </th>
                        <th className="px-4 py-2 text-right text-xs text-gray-600">
                          조정
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {artist.royalties.map((royalty) => {
                        const isMissing = royalty.royaltySource === "missing";

                        return (
                          <tr
                            key={royalty.id}
                            className={isMissing ? "bg-orange-50/40" : ""}
                          >
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatDate(royalty.salePaidAt)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="font-medium">
                                {royalty.templateName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {royalty.planName || "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                              {formatWon(royalty.saleAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div
                                className={
                                  isMissing
                                    ? "font-medium text-orange-700"
                                    : "font-medium text-gray-900"
                                }
                              >
                                {getRuleSourceLabel(royalty)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatRuleValue(
                                  royalty.royaltyTypeSnapshot,
                                  royalty.royaltyValueSnapshot
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                              {formatWon(royalty.royaltyAmount)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openManualRoyaltyModal(royalty)}
                                disabled={isBusy}
                                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                aria-label={`${royalty.artistName} ${royalty.templateName} 수동 정산 조정`}
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <RoyaltyManualAdjustmentModal
        amountDraft={manualAmountDraft}
        formatDate={formatDate}
        formatWon={formatWon}
        getRuleDetail={(royalty) =>
          formatRuleValue(
            royalty.royaltyTypeSnapshot,
            royalty.royaltyValueSnapshot
          )
        }
        getRuleLabel={getRuleSourceLabel}
        isBusy={isBusy}
        onAmountDraftChange={setManualAmountDraft}
        onApplyRule={resetManualRoyaltyToRule}
        onClose={closeManualRoyaltyModal}
        onSave={saveManualRoyaltyAmount}
        royalty={manualRoyalty}
      />
    </div>
  );
}
