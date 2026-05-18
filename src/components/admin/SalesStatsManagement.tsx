"use client";

import {
  useAdminRoyaltySales,
  useAdminRoyaltySummary,
  useMarkRoyaltiesPaid,
  useUpdateRoyalty,
} from "@/hooks/query/useAdminRoyalties";
import { useAdminSalesStats } from "@/hooks/query/useAdminSalesStats";
import { RoyaltySaleItem, RoyaltyStatus } from "@/types/admin";
import { useMemo, useState } from "react";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

export default function SalesStatsManagement() {
  const today = useMemo(() => new Date(), []);
  const initialTo = formatDate(today);
  const initialFrom = formatDate(
    new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
  );

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [appliedRange, setAppliedRange] = useState({ from: initialFrom, to: initialTo });
  const [royaltyStatus, setRoyaltyStatus] = useState<RoyaltyStatus | "all">("unpaid");
  const [selectedRoyaltyIds, setSelectedRoyaltyIds] = useState<Set<string>>(
    () => new Set()
  );

  const { data, isLoading, error } = useAdminSalesStats(appliedRange);
  const {
    data: royaltySummary,
    isLoading: isRoyaltySummaryLoading,
    error: royaltySummaryError,
  } = useAdminRoyaltySummary({
    ...appliedRange,
    status: "all",
  });
  const {
    data: royaltySales,
    isLoading: isRoyaltySalesLoading,
    error: royaltySalesError,
  } = useAdminRoyaltySales({
    ...appliedRange,
    status: royaltyStatus,
    page: 1,
    limit: 50,
  });
  const updateRoyaltyMutation = useUpdateRoyalty();
  const markRoyaltiesPaidMutation = useMarkRoyaltiesPaid();

  const royaltyRows = royaltySales?.royalties || [];
  const selectedIds = Array.from(selectedRoyaltyIds);

  const applyRange = () => {
    if (from > to) {
      alert("시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }
    setAppliedRange({ from, to });
    setSelectedRoyaltyIds(new Set());
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
      await updateRoyaltyMutation.mutateAsync({
        id: royalty.id,
        data: { status },
      });
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

  const updateRoyaltyAmount = async (
    royalty: RoyaltySaleItem,
    value: string
  ) => {
    const normalizedValue = value.replace(/,/g, "").trim();
    const nextAmount = Number(normalizedValue || "0");

    if (!Number.isFinite(nextAmount) || nextAmount < 0) {
      alert("정산 금액은 0 이상의 숫자로 입력해주세요.");
      return;
    }

    const roundedAmount = Math.round(nextAmount);
    if (roundedAmount === royalty.royaltyAmount) {
      return;
    }

    try {
      await updateRoyaltyMutation.mutateAsync({
        id: royalty.id,
        data: { royaltyAmount: roundedAmount },
      });
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "정산 금액 변경 중 오류가 발생했습니다."
      );
    }
  };

  const markSelectedPaid = async () => {
    if (selectedIds.length === 0) {
      alert("지급 처리할 로열티를 선택해주세요.");
      return;
    }

    if (!confirm(`선택한 ${selectedIds.length}건을 지급 완료 처리하시겠습니까?`)) {
      return;
    }

    try {
      const result = await markRoyaltiesPaidMutation.mutateAsync({
        royaltyIds: selectedIds,
      });
      setSelectedRoyaltyIds(new Set());
      alert(`${result.updatedCount}건을 지급 완료 처리했습니다.`);
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "일괄 지급 처리 중 오류가 발생했습니다."
      );
    }
  };

  const markArtistPaid = async (artistId: string, artistName: string) => {
    if (
      !confirm(
        `${artistName} 작가님의 현재 기간 미지급 로열티를 모두 지급 완료 처리하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const result = await markRoyaltiesPaidMutation.mutateAsync({
        ...appliedRange,
        artistIds: [artistId],
      });
      setSelectedRoyaltyIds(new Set());
      alert(`${result.updatedCount}건을 지급 완료 처리했습니다.`);
    } catch (mutationError) {
      alert(
        mutationError instanceof Error
          ? mutationError.message
          : "작가별 지급 처리 중 오류가 발생했습니다."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
        매출 통계를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={applyRange}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary"
          >
            조회
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">총 매출</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatWon(data.summary.grossSales)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.summary.from} ~ {data.summary.to}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">판매 건수</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.summary.salesCount.toLocaleString("ko-KR")}건
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">평균 객단가</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatWon(data.summary.averageOrderValue)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
            템플릿별 매출
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-600">템플릿</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">건수</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">매출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.byTemplate.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
                {data.byTemplate.slice(0, 10).map((item) => (
                  <tr key={item.templateId}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.templateName}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">
                      {item.salesCount}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                      {formatWon(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
            작가별 매출
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-600">작가</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">건수</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">매출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.byArtist.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
                {data.byArtist.slice(0, 10).map((item) => (
                  <tr key={item.artistName}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.artistName}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">
                      {item.salesCount}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                      {formatWon(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
          일자별 매출 추이
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-600">일자</th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">건수</th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.daily.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
              {data.daily.map((item) => (
                <tr key={item.date}>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.date}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-700">
                    {item.salesCount}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                    {formatWon(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">작가 로열티 정산</h2>
            <p className="text-sm text-gray-500">
              {appliedRange.from} ~ {appliedRange.to}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={royaltyStatus}
              onChange={(event) => {
                setRoyaltyStatus(event.target.value as RoyaltyStatus | "all");
                setSelectedRoyaltyIds(new Set());
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="unpaid">미지급</option>
              <option value="paid">지급완료</option>
              <option value="all">전체</option>
            </select>
            <button
              onClick={markSelectedPaid}
              disabled={
                selectedIds.length === 0 || markRoyaltiesPaidMutation.isPending
              }
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              선택 지급 완료
            </button>
          </div>
        </div>

        {royaltySummaryError || royaltySalesError ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            로열티 정산 정보를 불러오는 중 오류가 발생했습니다.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">미지급 로열티</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatWon(royaltySummary?.summary.unpaidRoyaltyAmount || 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {royaltySummary?.summary.unpaidCount || 0}건
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">지급완료 로열티</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatWon(royaltySummary?.summary.paidRoyaltyAmount || 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {royaltySummary?.summary.paidCount || 0}건
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500">조회된 정산 대상</div>
                <div className="text-2xl font-bold text-gray-900">
                  {(
                    (royaltySummary?.summary.unpaidCount || 0) +
                    (royaltySummary?.summary.paidCount || 0)
                  ).toLocaleString("ko-KR")}
                  건
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                작가별 정산 요약
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-600">작가</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">건수</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">매출</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">미지급</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">지급완료</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isRoyaltySummaryLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          로열티 요약을 불러오는 중입니다.
                        </td>
                      </tr>
                    )}
                    {!isRoyaltySummaryLoading &&
                      (royaltySummary?.byArtist.length || 0) === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                            데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    {royaltySummary?.byArtist.map((item) => (
                      <tr key={item.artistId}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.artistName}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                          {item.salesCount}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                          {formatWon(item.grossSales)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                          {formatWon(item.unpaidRoyaltyAmount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-700">
                          {formatWon(item.paidRoyaltyAmount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          <button
                            onClick={() =>
                              markArtistPaid(item.artistId, item.artistName)
                            }
                            disabled={
                              item.unpaidCount === 0 ||
                              markRoyaltiesPaidMutation.isPending
                            }
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            미지급 전체 완료
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">
                판매 건별 로열티
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
                            royaltyRows.every((row) => selectedRoyaltyIds.has(row.id))
                          }
                          onChange={toggleAllRoyaltyRows}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label="전체 선택"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600">판매일</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600">작가</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600">템플릿</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">판매금액</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">정산금액</th>
                      <th className="px-4 py-2 text-center text-xs text-gray-600">상태</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-600">처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isRoyaltySalesLoading && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                          판매 건별 로열티를 불러오는 중입니다.
                        </td>
                      </tr>
                    )}
                    {!isRoyaltySalesLoading && royaltyRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
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
                          {new Date(royalty.salePaidAt).toLocaleDateString("ko-KR")}
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
                        <td className="px-4 py-2 text-sm text-right">
                          <input
                            key={`${royalty.id}-${royalty.royaltyAmount}`}
                            type="number"
                            min={0}
                            defaultValue={royalty.royaltyAmount}
                            onBlur={(event) =>
                              updateRoyaltyAmount(royalty, event.target.value)
                            }
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              royalty.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {royalty.status === "paid" ? "지급완료" : "미지급"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {royalty.status === "paid" ? (
                            <button
                              onClick={() => updateRoyaltyStatus(royalty, "unpaid")}
                              disabled={updateRoyaltyMutation.isPending}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                            >
                              취소
                            </button>
                          ) : (
                            <button
                              onClick={() => updateRoyaltyStatus(royalty, "paid")}
                              disabled={updateRoyaltyMutation.isPending}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                            >
                              지급 완료
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
