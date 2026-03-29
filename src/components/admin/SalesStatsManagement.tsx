"use client";

import { useAdminSalesStats } from "@/hooks/query/useAdminSalesStats";
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

  const { data, isLoading, error } = useAdminSalesStats(appliedRange);

  const applyRange = () => {
    if (from > to) {
      alert("시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }
    setAppliedRange({ from, to });
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
    </div>
  );
}

