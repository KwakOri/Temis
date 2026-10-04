"use client";
import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Image as ImageIcon, Search } from "lucide-react";
import AdminTabHeader from "@/components/admin/AdminTabHeader";
import { useLegacyAssetSets } from "@/hooks/query/useLegacyTemplateAssets";

export const ownerLabels = {
  timetable: "시간표",
  team_timetable: "팀 시간표",
  thumbnail: "썸네일",
  site: "공통",
};
export const purposeLabels = {
  runtime: "내부 이미지",
  cover: "대표 썸네일",
  site: "홈페이지",
};
export function LegacyAssetList() {
  const query = useLegacyAssetSets();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [purpose, setPurpose] = useState("");
  const sets = (query.data?.sets ?? []).filter(
    (set) =>
      (!kind || set.ownerKind === kind) &&
      (!purpose || (set.purpose ?? "runtime") === purpose) &&
      `${set.name} ${set.templateId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-5 text-gray-900">
      <AdminTabHeader
        title="레거시 에셋"
        description={`${query.data?.sets.length ?? 0}개 등록`}
      >
        <button
          type="button"
          title="새로고침"
          aria-label="새로고침"
          className="p-2 hover:bg-gray-100"
          onClick={() => query.refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </AdminTabHeader>
      <div className="flex flex-wrap gap-3 border-y border-gray-200 py-3">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <Search className="h-4 w-4 shrink-0" />
          <input
            className="min-w-0 w-full border border-gray-300 rounded px-3 py-2 text-sm"
            aria-label="템플릿 검색"
            placeholder="이름 또는 ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label="템플릿 종류"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          <option value="">전체 종류</option>
          {Object.entries(ownerLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="에셋 용도"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
        >
          <option value="">전체 용도</option>
          {Object.entries(purposeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {query.isLoading ? (
        <p role="status">불러오는 중...</p>
      ) : query.isError ? (
        <p role="alert" className="text-red-700">
          {query.error.message}
        </p>
      ) : !sets.length ? (
        <p className="py-12 text-center text-gray-500">
          등록된 에셋이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-3">템플릿</th>
                <th>종류</th>
                <th>용도</th>
                <th>슬롯</th>
                <th>적용</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <tr key={set.id} className="border-b border-gray-200">
                  <td className="py-4 pr-3">
                    <Link
                      className="flex items-center gap-2 text-blue-700 hover:underline"
                      href={`/admin/legacy-template-assets/${set.ownerKind}/${set.templateId}?purpose=${set.purpose ?? "runtime"}`}
                    >
                      <ImageIcon className="h-4 w-4 shrink-0" />
                      {set.name}
                    </Link>
                    <div className="mt-1 max-w-64 break-all text-xs text-gray-500">
                      {set.templateId}
                    </div>
                  </td>
                  <td className="pr-3 whitespace-nowrap">
                    {ownerLabels[set.ownerKind]}
                  </td>
                  <td className="pr-3 whitespace-nowrap">
                    {purposeLabels[set.purpose ?? "runtime"]}
                  </td>
                  <td className="pr-3">
                    {Object.values(set.expected_slots).reduce(
                      (sum, keys) => sum + keys.length,
                      0,
                    )}
                  </td>
                  <td
                    className={
                      set.mode === "r2" ? "text-green-700" : "text-gray-500"
                    }
                  >
                    {set.mode === "r2" ? "R2" : "로컬"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
