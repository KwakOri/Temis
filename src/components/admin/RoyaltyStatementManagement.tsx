"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import { useAdminRoyaltyStatement } from "@/hooks/query/useAdminRoyalties";
import { getAdminPathByTabId } from "@/lib/adminTabs";
import { RoyaltyRuleType, RoyaltySaleItem } from "@/types/admin";
import {
  ArrowLeft,
  Download,
  FileText,
  HandCoins,
  Printer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface RoyaltyStatementManagementProps {
  initialArtistId?: string | null;
  initialMonth?: string | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatMonthValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function getPreviousMonthValue(): string {
  const today = new Date();
  return formatMonthValue(
    new Date(today.getFullYear(), today.getMonth() - 1, 1)
  );
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

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

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
      return "작품 override";
    case "manual":
      return "매뉴얼";
    case "missing":
    default:
      return "미설정";
  }
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function buildCsvRows(month: string, royalties: RoyaltySaleItem[]) {
  const rows: Array<Array<string | number | null>> = [
    [
      "정산월",
      "판매일",
      "작가",
      "상품",
      "플랜",
      "입금자",
      "판매금액",
      "산정방식",
      "기준값",
      "로열티",
      "정산일",
    ],
  ];

  for (const royalty of royalties) {
    rows.push([
      month,
      formatDate(royalty.salePaidAt),
      royalty.artistName,
      royalty.templateName,
      royalty.planName,
      royalty.depositorName,
      royalty.saleAmount,
      getRuleSourceLabel(royalty),
      formatRuleValue(royalty.royaltyTypeSnapshot, royalty.royaltyValueSnapshot),
      royalty.royaltyAmount,
      formatDate(royalty.paidAt),
    ]);
  }

  return rows;
}

export default function RoyaltyStatementManagement({
  initialArtistId,
  initialMonth,
}: RoyaltyStatementManagementProps) {
  const router = useRouter();
  const normalizedInitialMonth = useMemo(
    () => normalizeMonthValue(initialMonth),
    [initialMonth]
  );
  const [month, setMonth] = useState(normalizedInitialMonth);
  const [draftMonth, setDraftMonth] = useState(normalizedInitialMonth);
  const [artistId, setArtistId] = useState(initialArtistId || "");

  useEffect(() => {
    setMonth(normalizedInitialMonth);
    setDraftMonth(normalizedInitialMonth);
    setArtistId(initialArtistId || "");
  }, [initialArtistId, normalizedInitialMonth]);

  const statementQuery = useAdminRoyaltyStatement({
    month,
    artistId: artistId || undefined,
  });
  const data = statementQuery.data;
  const summary = data?.summary;
  const artists = data?.artists || [];
  const royalties = data?.royalties || [];
  const selectedArtist = artists.find((artist) => artist.artistId === artistId);
  const titlePrefix = selectedArtist
    ? `${selectedArtist.artistName} `
    : "전체 ";

  const pushStatementRoute = (
    nextMonth: string,
    nextArtistId = artistId
  ) => {
    const params = new URLSearchParams();
    params.set("month", nextMonth);
    if (nextArtistId) {
      params.set("artistId", nextArtistId);
    }

    setMonth(nextMonth);
    setDraftMonth(nextMonth);
    setArtistId(nextArtistId);
    router.push(`/admin/settlements/statements?${params.toString()}`);
  };

  const exportCsv = () => {
    if (royalties.length === 0) {
      return;
    }

    const rows = buildCsvRows(formatMonthLabel(month), royalties);
    const csv = rows
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `royalty-statement-${month}${
      selectedArtist ? `-${sanitizeFilenamePart(selectedArtist.artistName)}` : ""
    }.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <AdminTabHeader
        title={`${formatMonthLabel(month)} ${titlePrefix}로열티 내역`}
        description="정산 완료된 월별 로열티 판매 내역과 작가별 지급 금액을 확인합니다"
        icon={FileText}
      >
        <div className="flex flex-wrap gap-2 print:hidden">
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
            onClick={() => router.push(`/admin/settlements/run?month=${month}`)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <HandCoins className="h-4 w-4" />
            정산 화면
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={royalties.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            출력
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={royalties.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-secondary disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </AdminTabHeader>

      <section className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">내역 필터</h3>
            <p className="text-sm text-gray-500 mt-1">
              월 단위 전체 내역이나 특정 작가의 내역만 출력할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="month"
              value={draftMonth}
              onChange={(event) => setDraftMonth(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <select
              value={artistId}
              onChange={(event) =>
                pushStatementRoute(month, event.target.value)
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 작가</option>
              {artists.map((artist) => (
                <option key={artist.artistId} value={artist.artistId}>
                  {artist.artistName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => pushStatementRoute(draftMonth)}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-secondary"
            >
              조회
            </button>
            <button
              type="button"
              onClick={() => pushStatementRoute(addMonths(month, -1))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              이전 달
            </button>
            <button
              type="button"
              onClick={() => pushStatementRoute(addMonths(month, 1))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              다음 달
            </button>
          </div>
        </div>
      </section>

      {statementQuery.error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          월별 로열티 정산 내역을 불러오지 못했습니다.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">작가</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary?.artistCount || 0}명
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">판매 기록</div>
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
          <div className="text-sm text-gray-500">로열티</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatWon(summary?.royaltyAmount || 0)}
          </div>
        </div>
      </section>

      {!artistId ? (
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">작가별 합계</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-600">
                    작가
                  </th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">
                    판매 기록
                  </th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">
                    판매금액
                  </th>
                  <th className="px-4 py-2 text-right text-xs text-gray-600">
                    로열티
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statementQuery.isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      작가별 합계를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : artists.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      작가별 정산 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  artists.map((artist) => (
                    <tr key={artist.artistId}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <button
                          type="button"
                          onClick={() =>
                            pushStatementRoute(month, artist.artistId)
                          }
                          className="font-medium text-left hover:text-primary print:pointer-events-none"
                        >
                          {artist.artistName}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {artist.salesCount}건
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatWon(artist.grossSales)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatWon(artist.royaltyAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">판매 건별 로열티</h3>
          <p className="text-xs text-gray-500 mt-1">
            상품 판매금액과 해당 판매에서 발생한 작가별 로열티입니다.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-600">
                  판매일
                </th>
                <th className="px-4 py-2 text-left text-xs text-gray-600">
                  작가
                </th>
                <th className="px-4 py-2 text-left text-xs text-gray-600">
                  상품
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">
                  판매금액
                </th>
                <th className="px-4 py-2 text-left text-xs text-gray-600">
                  산정방식
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-600">
                  로열티
                </th>
                <th className="px-4 py-2 text-left text-xs text-gray-600">
                  정산일
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {statementQuery.isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    판매 건별 로열티를 불러오는 중입니다.
                  </td>
                </tr>
              ) : royalties.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    정산 완료된 로열티 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                royalties.map((royalty) => (
                  <tr key={royalty.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatDate(royalty.salePaidAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {royalty.artistName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 min-w-52">
                      <div className="font-medium">{royalty.templateName}</div>
                      <div className="text-xs text-gray-500">
                        {royalty.planName || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {formatWon(royalty.saleAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">
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
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(royalty.paidAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
