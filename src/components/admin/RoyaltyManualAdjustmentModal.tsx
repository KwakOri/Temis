"use client";

import { RoyaltySaleItem } from "@/types/admin";
import { X } from "lucide-react";

interface RoyaltyManualAdjustmentModalProps {
  amountDraft: string;
  formatDate: (value: string) => string;
  formatWon: (amount: number) => string;
  getRuleDetail?: (royalty: RoyaltySaleItem) => string | null;
  getRuleLabel: (royalty: RoyaltySaleItem) => string;
  isBusy?: boolean;
  onAmountDraftChange: (value: string) => void;
  onApplyRule: () => void;
  onClose: () => void;
  onSave: () => void;
  royalty: RoyaltySaleItem | null;
}

export default function RoyaltyManualAdjustmentModal({
  amountDraft,
  formatDate,
  formatWon,
  getRuleDetail,
  getRuleLabel,
  isBusy = false,
  onAmountDraftChange,
  onApplyRule,
  onClose,
  onSave,
  royalty,
}: RoyaltyManualAdjustmentModalProps) {
  if (!royalty) {
    return null;
  }

  const ruleDetail = getRuleDetail?.(royalty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-900">수동 정산 조정</h3>
            <p className="mt-1 text-sm text-gray-500">{royalty.artistName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="수동 정산 조정 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {royalty.templateName}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {formatDate(royalty.salePaidAt)} · {royalty.planName || "-"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">판매금액</div>
              <div className="mt-1 font-semibold text-gray-900">
                {formatWon(royalty.saleAmount)}
              </div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">현재 산정</div>
              <div className="mt-1 font-semibold text-gray-900">
                {getRuleLabel(royalty)}
              </div>
              {ruleDetail ? (
                <div className="mt-0.5 text-xs text-gray-500">{ruleDetail}</div>
              ) : null}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              수동 정산금액
            </span>
            <input
              type="number"
              min={0}
              value={amountDraft}
              onChange={(event) => onAmountDraftChange(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-right text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onApplyRule}
            disabled={isBusy}
            className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            현재 규칙 적용
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isBusy}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              수동 정산 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
