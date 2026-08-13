"use client";

import {
  useCreatePriceOption,
  useDeletePriceOption,
  usePriceOptions as useAdminPriceOptions,
  useTogglePriceOption,
  useUpdatePriceOption,
} from "@/hooks/query/usePriceOptions";
import type { CreatePriceOptionInput, PriceOption } from "@/types/priceOption";
import { Edit2, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

const THUMBNAIL_PRICE_CATEGORY = "thumbnail";

interface PriceOptionForm {
  label: string;
  value: string;
  description: string;
  price: number;
  is_enabled: boolean;
}

const initialForm: PriceOptionForm = {
  label: "",
  value: "",
  description: "",
  price: 0,
  is_enabled: true,
};

export default function ThumbnailPriceOptionManagement() {
  const { data: options, isLoading } = useAdminPriceOptions(
    THUMBNAIL_PRICE_CATEGORY,
  );
  const createMutation = useCreatePriceOption();
  const updateMutation = useUpdatePriceOption();
  const deleteMutation = useDeletePriceOption();
  const toggleMutation = useTogglePriceOption(THUMBNAIL_PRICE_CATEGORY);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PriceOptionForm>(initialForm);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setIsFormOpen(true);
  };

  const openEditForm = (option: PriceOption) => {
    setEditingId(option.id);
    setForm({
      label: option.label,
      value: option.value,
      description: option.description || "",
      price: option.price,
      is_enabled: option.is_enabled,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.label.trim() || !form.value.trim()) {
      window.alert("가격 이름과 값은 필수입니다.");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          input: {
            category: THUMBNAIL_PRICE_CATEGORY,
            label: form.label.trim(),
            value: form.value.trim(),
            description: form.description.trim(),
            price: form.price,
            is_discount: false,
            is_enabled: form.is_enabled,
          },
        });
      } else {
        const input: CreatePriceOptionInput = {
          category: THUMBNAIL_PRICE_CATEGORY,
          label: form.label.trim(),
          value: form.value.trim(),
          description: form.description.trim(),
          price: form.price,
          is_discount: false,
          is_enabled: form.is_enabled,
        };
        await createMutation.mutateAsync(input);
      }
      closeForm();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "가격 옵션 저장에 실패했습니다.",
      );
    }
  };

  const handleDelete = async (option: PriceOption) => {
    if (!window.confirm(`'${option.label}' 가격을 삭제하시겠습니까?`)) return;

    try {
      await deleteMutation.mutateAsync({
        id: option.id,
        category: THUMBNAIL_PRICE_CATEGORY,
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "가격 옵션 삭제에 실패했습니다.",
      );
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
            맞춤 썸네일 가격 옵션
          </h3>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            썸네일 주문제작 2단계에서 고객이 선택할 가격 패키지를 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
        >
          <Plus className="h-4 w-4" />
          가격 추가
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          가격 옵션을 불러오는 중...
        </div>
      ) : options && options.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {options.map((option) => (
            <div
              key={option.id}
              className={`rounded-xl border bg-white p-4 ${
                option.is_enabled
                  ? "border-secondary/30"
                  : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-semibold text-gray-900">
                      {option.label}
                    </h4>
                    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                      {option.is_enabled ? "공개" : "비공개"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{option.value}</p>
                  {option.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {option.description}
                    </p>
                  )}
                </div>
                <strong className="shrink-0 text-lg text-secondary">
                  ₩{option.price.toLocaleString()}
                </strong>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleMutation.mutate({
                      id: option.id,
                      is_enabled: !option.is_enabled,
                    })
                  }
                  disabled={toggleMutation.isPending}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {option.is_enabled ? "비공개" : "공개"}
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(option)}
                  className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-secondary"
                  aria-label={`${option.label} 수정`}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(option)}
                  disabled={isMutating}
                  className="rounded-md p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label={`${option.label} 삭제`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
          등록된 썸네일 가격 옵션이 없습니다. 가격을 하나 이상 등록해야 고객이
          신청할 수 있습니다.
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">
                  {editingId ? "썸네일 가격 수정" : "썸네일 가격 추가"}
                </h4>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="가격 옵션 폼 닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                가격 이름 *
                <input
                  value={form.label}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      label: event.target.value,
                    }))
                  }
                  placeholder="예: 기본 썸네일"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                가격 식별자 *
                <input
                  value={form.value}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      value: event.target.value,
                    }))
                  }
                  placeholder="예: standard"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                설명
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="포함 범위나 제작 기준을 입력하세요."
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                가격 (원) *
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      price: Number(event.target.value) || 0,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  required
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      is_enabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                />
                고객에게 공개
              </label>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-50"
                >
                  {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
