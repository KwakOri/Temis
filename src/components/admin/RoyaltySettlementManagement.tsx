"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import RoyaltyManualAdjustmentModal from "@/components/admin/RoyaltyManualAdjustmentModal";
import {
  useAdminRoyaltyBatches,
  useAdminRoyaltySales,
  useAdminRoyaltySummary,
  useMarkRoyaltiesPaid,
  useRecalculateRoyalties,
  useUpdateRoyalty,
} from "@/hooks/query/useAdminRoyalties";
import { useAdminSalesStats } from "@/hooks/query/useAdminSalesStats";
import { getAdminPathByTabId } from "@/lib/adminTabs";
import { RoyaltySaleItem, RoyaltyStatus } from "@/types/admin";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HandCoins,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const MONTH_COUNT_OPTIONS = [1, 2, 3, 5, 6, 12];
const ROYALTY_PAGE_LIMIT = 50;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function formatMonthValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function getCurrentMonthValue(): string {
  return formatMonthValue(new Date());
}

function parseMonthValue(monthValue: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue);

  if (!match) {
    const today = new Date();
    return {
      year: today.getFullYear(),
      monthIndex: today.getMonth(),
    };
  }

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
  };
}

function addMonths(monthValue: string, amount: number): string {
  const { year, monthIndex } = parseMonthValue(monthValue);
  return formatMonthValue(new Date(year, monthIndex + amount, 1));
}

function getMonthRange(monthValue: string, monthCount: number) {
  const { year, monthIndex } = parseMonthValue(monthValue);
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + monthCount, 0);

  const startLabel = `${start.getFullYear()}년 ${start.getMonth() + 1}월`;
  const endLabel = `${end.getFullYear()}년 ${end.getMonth() + 1}월`;

  return {
    from: formatLocalDate(start),
    to: formatLocalDate(end),
    settlementMonth: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`,
    label: monthCount === 1 ? startLabel : `${startLabel} ~ ${endLabel}`,
  };
}

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function formatKoreanDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("ko-KR");
}

function getRoyaltyRuleLabel(royalty: RoyaltySaleItem) {
  if (royalty.royaltySource === "manual") {
    return "수동";
  }

  if (royalty.royaltySource === "missing") {
    return "미설정";
  }

  const sourceLabel = royalty.royaltySource === "template" ? "템플릿" : "작가";
  const valueLabel =
    royalty.royaltyTypeSnapshot === "fixed"
      ? formatWon(Math.round(royalty.royaltyValueSnapshot || 0))
      : `${royalty.royaltyValueSnapshot || 0}%`;

  return `${sourceLabel} ${valueLabel}`;
}

export default function RoyaltySettlementManagement() {
  const router = useRouter();
  const currentMonthValue = useMemo(() => getCurrentMonthValue(), []);
  const lastMonthValue = useMemo(() => addMonths(currentMonthValue, -1), [
    currentMonthValue,
  ]);
  const currentRange = useMemo(
    () => getMonthRange(currentMonthValue, 1),
    [currentMonthValue]
  );
  const lastMonthRange = useMemo(
    () => getMonthRange(lastMonthValue, 1),
    [lastMonthValue]
  );

  const [monthValue, setMonthValue] = useState(lastMonthValue);
  const [monthCount, setMonthCount] = useState(1);
  const [appliedPeriod, setAppliedPeriod] = useState({
    monthValue: lastMonthValue,
    monthCount: 1,
  });
  const [royaltyStatus, setRoyaltyStatus] =
    useState<RoyaltyStatus | "all">("all");
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRoyaltyIds, setSelectedRoyaltyIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isOpeningSettlementRun, setIsOpeningSettlementRun] = useState(false);
  const [manualRoyalty, setManualRoyalty] = useState<RoyaltySaleItem | null>(
    null
  );
  const [manualAmountDraft, setManualAmountDraft] = useState("");

  const appliedRange = useMemo(
    () => getMonthRange(appliedPeriod.monthValue, appliedPeriod.monthCount),
    [appliedPeriod]
  );
  const draftRange = useMemo(
    () => getMonthRange(monthValue, monthCount),
    [monthValue, monthCount]
  );

  const { data: currentSalesStats } = useAdminSalesStats({
    from: currentRange.from,
    to: currentRange.to,
  });
  const { data: currentRoyaltySummary } = useAdminRoyaltySummary({
    from: currentRange.from,
    to: currentRange.to,
    status: "all",
  });
  const {
    data: lastMonthUnpaidSummary,
    isLoading: isLastMonthUnpaidLoading,
    error: lastMonthUnpaidError,
  } = useAdminRoyaltySummary({
    from: lastMonthRange.from,
    to: lastMonthRange.to,
    status: "unpaid",
  });
  const {
    data: settlementSummary,
    isLoading: isSettlementSummaryLoading,
    error: settlementSummaryError,
  } = useAdminRoyaltySummary({
    from: appliedRange.from,
    to: appliedRange.to,
    status: "all",
  });
  const {
    data: royaltySales,
    isLoading: isRoyaltySalesLoading,
    error: royaltySalesError,
  } = useAdminRoyaltySales({
    from: appliedRange.from,
    to: appliedRange.to,
    artistId: selectedArtistId || undefined,
    status: royaltyStatus,
    page,
    limit: ROYALTY_PAGE_LIMIT,
  });
  const { data: batches } = useAdminRoyaltyBatches({
    from: appliedRange.from,
    to: appliedRange.to,
    status: "all",
    page: 1,
    limit: 10,
  });
  const updateRoyaltyMutation = useUpdateRoyalty();
  const markRoyaltiesPaidMutation = useMarkRoyaltiesPaid();
  const recalculateRoyaltiesMutation = useRecalculateRoyalties();

  const royaltyRows = royaltySales?.royalties || [];
  const selectedIds = Array.from(selectedRoyaltyIds);
  const lastMonthUnpaidCount =
    lastMonthUnpaidSummary?.summary.unpaidCount || 0;
  const lastMonthUnpaidAmount =
    lastMonthUnpaidSummary?.summary.unpaidRoyaltyAmount || 0;
  const totalRoyaltyCount =
    (settlementSummary?.summary.unpaidCount || 0) +
    (settlementSummary?.summary.paidCount || 0);
  const completionRate =
    totalRoyaltyCount > 0
      ? Math.round(
          ((settlementSummary?.summary.paidCount || 0) / totalRoyaltyCount) *
            100
        )
      : 0;
  const totalPages = Math.max(royaltySales?.pagination.totalPages || 1, 1);
  const sortedArtists = useMemo(
    () =>
      [...(settlementSummary?.byArtist || [])].sort((a, b) => {
        if (a.unpaidCount > 0 && b.unpaidCount === 0) return -1;
        if (a.unpaidCount === 0 && b.unpaidCount > 0) return 1;
        return b.unpaidRoyaltyAmount - a.unpaidRoyaltyAmount;
      }),
    [settlementSummary?.byArtist]
  );

  const applyPeriod = () => {
    setAppliedPeriod({ monthValue, monthCount });
    setSelectedArtistId("");
    setSelectedRoyaltyIds(new Set());
    setPage(1);
  };

  const moveAppliedPeriod = (direction: -1 | 1) => {
    const nextMonthValue = addMonths(
      appliedPeriod.monthValue,
      direction * appliedPeriod.monthCount
    );

    setMonthValue(nextMonthValue);
    setMonthCount(appliedPeriod.monthCount);
    setAppliedPeriod({
      monthValue: nextMonthValue,
      monthCount: appliedPeriod.monthCount,
    });
    setSelectedArtistId("");
    setSelectedRoyaltyIds(new Set());
    setPage(1);
  };

  const openSettlementRunWithRecalculation = async (
    month: string,
    range: { from: string; to: string }
  ) => {
    setIsOpeningSettlementRun(true);

    try {
      await recalculateRoyaltiesMutation.mutateAsync({
        from: range.from,
        to: range.to,
      });
      router.push(`/admin/settlements/run?month=${month}`);
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "로열티 재계산 중 오류가 발생했습니다."
      );
    } finally {
      setIsOpeningSettlementRun(false);
    }
  };

  const openLastMonthSettlementRun = () => {
    void openSettlementRunWithRecalculation(lastMonthValue, lastMonthRange);
  };

  const toggleRoyaltySelection = (id: string) => {
    setSelectedRoyaltyIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleAllRoyaltyRows = () => {
    setSelectedRoyaltyIds((prev) => {
      const allSelected =
        royaltyRows.length > 0 && royaltyRows.every((row) => prev.has(row.id));

      if (allSelected) {
        return new Set();
      }

      return new Set(royaltyRows.map((row) => row.id));
    });
  };

  const updateRoyaltyStatus = async (
    royalty: RoyaltySaleItem,
    status: RoyaltyStatus
  ) => {
    try {
      if (status === "paid") {
        await markRoyaltiesPaidMutation.mutateAsync({
          royaltyIds: [royalty.id],
          settlementMonth: appliedRange.settlementMonth,
        });
      } else {
        await updateRoyaltyMutation.mutateAsync({
          id: royalty.id,
          data: { status },
        });
      }

      setSelectedRoyaltyIds((prev) => {
        const next = new Set(prev);
        next.delete(royalty.id);
        return next;
      });
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "로열티 상태 변경 중 오류가 발생했습니다."
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

    const normalizedValue = manualAmountDraft.replace(/,/g, "").trim();
    const nextAmount = Number(normalizedValue || "0");

    if (!Number.isFinite(nextAmount) || nextAmount < 0) {
      alert("정산 금액은 0 이상의 숫자로 입력해주세요.");
      return;
    }

    const roundedAmount = Math.round(nextAmount);

    if (roundedAmount === manualRoyalty.royaltyAmount) {
      closeManualRoyaltyModal();
      return;
    }

    try {
      await updateRoyaltyMutation.mutateAsync({
        id: manualRoyalty.id,
        data: { royaltyAmount: roundedAmount },
      });
      closeManualRoyaltyModal();
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "정산 금액 변경 중 오류가 발생했습니다."
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
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "로열티 재계산 중 오류가 발생했습니다."
      );
    }
  };

  const markSelectedPaid = async () => {
    if (selectedIds.length === 0) {
      alert("정산 처리할 로열티를 선택해주세요.");
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}건을 정산 완료 처리하시겠습니까?`)) {
      return;
    }

    try {
      const result = await markRoyaltiesPaidMutation.mutateAsync({
        royaltyIds: selectedIds,
        settlementMonth: appliedRange.settlementMonth,
      });
      setSelectedRoyaltyIds(new Set());
      alert(`${result.updatedCount}건을 정산 완료 처리했습니다.`);
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "일괄 정산 처리 중 오류가 발생했습니다."
      );
    }
  };

  const recalculateCurrentPeriod = async () => {
    if (!confirm(`${appliedRange.label}의 미정산 로열티를 재계산하시겠습니까?`)) {
      return;
    }

    try {
      const result = await recalculateRoyaltiesMutation.mutateAsync({
        from: appliedRange.from,
        to: appliedRange.to,
      });

      alert(`${result.updatedCount}건을 재계산했습니다.`);
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "로열티 재계산 중 오류가 발생했습니다."
      );
    }
  };

  const hasRoyaltyError = settlementSummaryError || royaltySalesError;

  return (
    <div className="space-y-6">
      <AdminTabHeader
        title="정산"
        description="작가 로열티 현황과 정산 처리를 관리합니다"
        icon={HandCoins}
      >
        <button
          type="button"
          onClick={() =>
            router.push(
              `/admin/settlements/statements?month=${appliedPeriod.monthValue}`
            )
          }
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" />
          월별 내역
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/settlements/royalty-settings")}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-secondary"
        >
          <Settings className="h-4 w-4" />
          로열티 설정
        </button>
      </AdminTabHeader>

      <section
        className={`rounded-lg border p-4 sm:p-5 ${
          lastMonthUnpaidError
            ? "bg-red-50 border-red-200"
            : lastMonthUnpaidCount > 0
              ? "bg-orange-50 border-orange-200"
              : "bg-green-50 border-green-200"
        }`}
      >
        {isLastMonthUnpaidLoading ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-72 rounded bg-gray-100 animate-pulse mt-2" />
            </div>
            <div className="h-10 w-28 rounded-md bg-gray-200 animate-pulse" />
          </div>
        ) : lastMonthUnpaidError ? (
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">
                전월 미정산 상태를 확인하지 못했습니다.
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {lastMonthRange.label} 정산 데이터를 다시 불러오거나 네트워크
                상태를 확인해 주세요.
              </p>
            </div>
          </div>
        ) : lastMonthUnpaidCount > 0 ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-950">
                  미정산 내역이 남아있어요!
                </h3>
                <p className="text-sm text-orange-800 mt-1">
                  {lastMonthRange.label} 기준 {lastMonthUnpaidCount}건,{" "}
                  {formatWon(lastMonthUnpaidAmount)}의 로열티 정산 처리가
                  필요합니다.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openLastMonthSettlementRun}
              disabled={isOpeningSettlementRun}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              <HandCoins className="h-4 w-4" />
              {isOpeningSettlementRun ? "정산 기준 갱신 중" : "로열티 정산"}
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-950">
                미정산 내역이 없습니다.
              </h3>
              <p className="text-sm text-green-800 mt-1">
                {lastMonthRange.label} 기준으로 남아있는 로열티 정산 대기 건이
                없습니다.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              이번 달 현황
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {currentRange.from} ~ {currentRange.to}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(getAdminPathByTabId("salesStats"))}
            className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
          >
            매출 통계에서 보기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500">매출</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatWon(currentSalesStats?.summary.grossSales || 0)}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500">판매 건수</div>
            <div className="text-2xl font-bold text-gray-900">
              {(currentSalesStats?.summary.salesCount || 0).toLocaleString(
                "ko-KR"
              )}
              건
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500">예상 로열티</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatWon(
                (currentRoyaltySummary?.summary.unpaidRoyaltyAmount || 0) +
                  (currentRoyaltySummary?.summary.paidRoyaltyAmount || 0)
              )}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500">설정 누락</div>
            <div className="text-2xl font-bold text-gray-900">
              {currentRoyaltySummary?.summary.missingRuleCount || 0}건
            </div>
          </div>
        </div>
      </section>

      <section
        id="royalty-settlement-section"
        className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 scroll-mt-6"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {appliedRange.label} 정산
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                미정산 작가가 먼저 표시됩니다.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="month"
                value={monthValue}
                onChange={(event) => setMonthValue(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={monthCount}
                onChange={(event) => setMonthCount(Number(event.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {MONTH_COUNT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}개월
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyPeriod}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-secondary"
              >
                조회
              </button>
              <button
                type="button"
                onClick={recalculateCurrentPeriod}
                disabled={recalculateRoyaltiesMutation.isPending}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                재계산
              </button>
              <button
                type="button"
                onClick={() => moveAppliedPeriod(-1)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => moveAppliedPeriod(1)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            조회 예정: {draftRange.label} ({draftRange.from} ~ {draftRange.to})
          </div>
        </div>
      </section>

      {hasRoyaltyError ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          로열티 정산 정보를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">미정산 로열티</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatWon(settlementSummary?.summary.unpaidRoyaltyAmount || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {settlementSummary?.summary.unpaidCount || 0}건
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">정산 완료 로열티</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatWon(settlementSummary?.summary.paidRoyaltyAmount || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {settlementSummary?.summary.paidCount || 0}건
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">정산 대상</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalRoyaltyCount.toLocaleString("ko-KR")}건
              </div>
              <div className="text-xs text-gray-500 mt-1">
                설정 누락 {settlementSummary?.summary.missingRuleCount || 0}건
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500">처리율</div>
              <div className="text-2xl font-bold text-gray-900">
                {completionRate}%
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900">작가별 정산 요약</h3>
              <select
                value={selectedArtistId}
                onChange={(event) => {
                  setSelectedArtistId(event.target.value);
                  setSelectedRoyaltyIds(new Set());
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">전체 작가</option>
                {sortedArtists.map((artist) => (
                  <option key={artist.artistId} value={artist.artistId}>
                    {artist.artistName}
                  </option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      작가
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      매출
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      미정산
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      정산 완료
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      처리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isSettlementSummaryLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        정산 요약을 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!isSettlementSummaryLoading && sortedArtists.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                  {sortedArtists.map((artist) => (
                    <tr
                      key={artist.artistId}
                      className={artist.unpaidCount > 0 ? "bg-yellow-50/40" : ""}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedArtistId(artist.artistId);
                            setPage(1);
                          }}
                          className="font-medium text-left hover:text-primary"
                        >
                          {artist.artistName}
                        </button>
                        <div className="text-xs text-gray-500">
                          판매 {artist.salesCount}건
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatWon(artist.grossSales)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatWon(artist.unpaidRoyaltyAmount)}
                        <div className="text-xs text-gray-500">
                          {artist.unpaidCount}건
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatWon(artist.paidRoyaltyAmount)}
                        <div className="text-xs text-gray-500">
                          {artist.paidCount}건
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {artist.unpaidCount > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              void openSettlementRunWithRecalculation(
                                appliedPeriod.monthValue,
                                appliedRange
                              )
                            }
                            disabled={isOpeningSettlementRun}
                            className="px-3 py-1 bg-primary text-white rounded text-xs hover:bg-secondary disabled:opacity-50"
                          >
                            {isOpeningSettlementRun ? "갱신 중" : "로열티 정산"}
                          </button>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                            정산 완료
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">정산 배치 내역</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      배치명
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      건수
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      금액
                    </th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      지급일
                    </th>
                    <th className="px-4 py-2 text-center text-xs text-gray-600">
                      상태
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      내역
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(batches?.batches.length || 0) === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        정산 배치가 없습니다.
                      </td>
                    </tr>
                  )}
                  {batches?.batches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div className="font-medium">{batch.title}</div>
                        <div className="text-xs text-gray-500">
                          {batch.periodFrom} ~ {batch.periodTo}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">
                        {batch.totalCount}건
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                        {formatWon(batch.totalAmount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {formatKoreanDate(batch.paidAt)}
                      </td>
                      <td className="px-4 py-2 text-sm text-center">
                        {batch.status === "cancelled" ? "취소" : "정산 완료"}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/admin/settlements/statements?month=${batch.settlementMonth.slice(
                                0,
                                7
                              )}&batchId=${batch.id}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <summary className="list-none cursor-pointer px-4 py-3 border-b border-gray-200 hover:bg-gray-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    개별 판매 건 조정
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    예외 상황에서만 사용합니다. 일반 정산은 상단 로열티 정산
                    페이지에서 처리하세요.
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  펼쳐서 보기
                </span>
              </div>
            </summary>

            <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-medium text-gray-700">
                판매 건 필터
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={royaltyStatus}
                  onChange={(event) => {
                    setRoyaltyStatus(event.target.value as RoyaltyStatus | "all");
                    setSelectedRoyaltyIds(new Set());
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">전체</option>
                  <option value="unpaid">미정산</option>
                  <option value="paid">정산 완료</option>
                </select>
                <button
                  type="button"
                  onClick={markSelectedPaid}
                  disabled={
                    selectedIds.length === 0 ||
                    markRoyaltiesPaidMutation.isPending
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  선택 정산 완료
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={
                          royaltyRows.length > 0 &&
                          royaltyRows.every((row) =>
                            selectedRoyaltyIds.has(row.id)
                          )
                        }
                        onChange={toggleAllRoyaltyRows}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="전체 선택"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      판매일
                    </th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      작가
                    </th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      템플릿
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      판매금액
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      정산금액
                    </th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600">
                      산정
                    </th>
                    <th className="px-4 py-2 text-center text-xs text-gray-600">
                      상태
                    </th>
                    <th className="px-4 py-2 text-right text-xs text-gray-600">
                      처리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isRoyaltySalesLoading && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        판매 건별 로열티를 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!isRoyaltySalesLoading && royaltyRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                  {royaltyRows.map((royalty) => (
                    <tr key={royalty.id}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedRoyaltyIds.has(royalty.id)}
                          onChange={() => toggleRoyaltySelection(royalty.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`${royalty.artistName} ${royalty.templateName} 선택`}
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {formatKoreanDate(royalty.salePaidAt)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {royalty.artistName}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700 min-w-48">
                        <div className="font-medium text-gray-900">
                          {royalty.templateName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {royalty.planName || "플랜 없음"}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">
                        {formatWon(royalty.saleAmount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                        {formatWon(royalty.royaltyAmount)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {getRoyaltyRuleLabel(royalty)}
                      </td>
                      <td className="px-4 py-2 text-sm text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            royalty.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {royalty.status === "paid" ? "정산 완료" : "미정산"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          {royalty.status === "paid" ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateRoyaltyStatus(royalty, "unpaid")
                              }
                              disabled={updateRoyaltyMutation.isPending}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                            >
                              취소
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateRoyaltyStatus(royalty, "paid")}
                              disabled={markRoyaltiesPaidMutation.isPending}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                            >
                              정산 완료
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openManualRoyaltyModal(royalty)}
                            disabled={
                              updateRoyaltyMutation.isPending ||
                              recalculateRoyaltiesMutation.isPending
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            aria-label={`${royalty.artistName} ${royalty.templateName} 수동 정산 조정`}
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
              <span>
                총 {royaltySales?.pagination.total || 0}건 중 {page} /{" "}
                {totalPages}페이지
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1 || isRoyaltySalesLoading}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page >= totalPages || isRoyaltySalesLoading}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </details>
        </>
      )}

      <RoyaltyManualAdjustmentModal
        amountDraft={manualAmountDraft}
        formatDate={formatKoreanDate}
        formatWon={formatWon}
        getRuleLabel={getRoyaltyRuleLabel}
        isBusy={
          updateRoyaltyMutation.isPending ||
          recalculateRoyaltiesMutation.isPending
        }
        onAmountDraftChange={setManualAmountDraft}
        onApplyRule={resetManualRoyaltyToRule}
        onClose={closeManualRoyaltyModal}
        onSave={saveManualRoyaltyAmount}
        royalty={manualRoyalty}
      />
    </div>
  );
}
