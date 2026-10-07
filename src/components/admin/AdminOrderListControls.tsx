"use client";

import { useEffect } from "react";
import { cva } from "class-variance-authority";
import type { PaginationInfo } from "@/types/admin";

export interface AdminOrderListState {
  status: string;
  page: number;
  sortBy: "created_at" | "deadline";
  sortOrder: "asc" | "desc";
}

export const DEFAULT_ADMIN_ORDER_LIST_STATE: AdminOrderListState = {
  status: "default",
  page: 1,
  sortBy: "created_at",
  sortOrder: "desc",
};

const statusButton = cva(
  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      active: {
        true: "border-primary bg-primary text-white",
        false: "border-gray-300 bg-white text-secondary hover:bg-gray-50",
      },
    },
  },
);

export function AdminOrderListFilters({
  value,
  onChange,
}: {
  value: AdminOrderListState;
  onChange: (value: AdminOrderListState) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-primary">
          주문 상태
        </legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["default", "제작 대기"],
            ["all", "전체"],
            ["pending", "대기 중"],
            ["accepted", "접수됨"],
            ["in_progress", "진행 중"],
            ["completed", "완료"],
            ["cancelled", "취소"],
          ].map(([status, label]) => (
            <button
              type="button"
              key={status}
              aria-pressed={value.status === status}
              className={statusButton({ active: value.status === status })}
              onClick={() => onChange({ ...value, status, page: 1 })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          제작 대기에서는 완료·취소 주문을 제외합니다.
        </p>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          정렬 기준
          <select
            className="rounded-md border border-gray-300 px-3 py-2"
            aria-label="정렬 기준"
            value={value.sortBy}
            onChange={(event) =>
              onChange({
                ...value,
                sortBy: event.target.value as AdminOrderListState["sortBy"],
                page: 1,
              })
            }
          >
            <option value="created_at">접수 날짜</option>
            <option value="deadline">마감 날짜</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          정렬 순서
          <select
            className="rounded-md border border-gray-300 px-3 py-2"
            aria-label="정렬 순서"
            value={value.sortOrder}
            onChange={(event) =>
              onChange({
                ...value,
                sortOrder: event.target
                  .value as AdminOrderListState["sortOrder"],
                page: 1,
              })
            }
          >
            <option value="desc">최신순</option>
            <option value="asc">오래된순</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function AdminOrderListPagination({
  pagination,
  onPageChange,
}: {
  pagination?: PaginationInfo;
  onPageChange: (page: number) => void;
}) {
  useEffect(() => {
    if (pagination && pagination.page > Math.max(1, pagination.totalPages)) {
      onPageChange(Math.max(1, pagination.totalPages));
    }
  }, [pagination, onPageChange]);
  if (!pagination) return null;
  const { page, total, totalPages, limit } = pagination;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
      <span>
        총 {total}건 · {total === 0 ? 0 : (page - 1) * limit + 1}–
        {Math.min(page * limit, total)}건 표시
      </span>
      {totalPages > 1 && (
        <nav aria-label="주문 목록 페이지" className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md border px-3 py-2 disabled:opacity-50"
          >
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md border px-3 py-2 disabled:opacity-50"
          >
            다음
          </button>
        </nav>
      )}
    </div>
  );
}
