"use client";

import { CreditCard, X } from "lucide-react";
import { useEffect } from "react";

interface DepositInfoModalProps {
  orderType: string;
  amount: number | null;
  depositorName: string | null;
  onClose: () => void;
}

export default function DepositInfoModal({
  orderType,
  amount,
  depositorName,
  onClose,
}: DepositInfoModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-info-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-timetable-form-bg p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="deposit-info-modal-title"
              className="flex items-center gap-2 text-lg font-bold text-dark-gray"
            >
              <CreditCard className="h-5 w-5 text-primary" />
              입금 정보
            </h2>
            <p className="mt-1 text-sm text-dark-gray/60">{orderType} 주문</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="입금 정보 닫기"
            className="rounded-lg p-2 text-dark-gray/60 transition-colors hover:bg-tertiary hover:text-dark-gray"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-primary bg-primary/5 p-4">
          <h3 className="font-semibold text-primary">송금 계좌 정보</h3>
          <dl className="mt-3 space-y-2 text-sm text-dark-gray">
            <div className="flex justify-between gap-4">
              <dt>은행</dt>
              <dd className="font-medium">토스뱅크</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>계좌번호</dt>
              <dd className="font-medium">1000-7564-4995</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>예금주</dt>
              <dd className="font-medium">이세영</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-primary/20 pt-2">
              <dt>결제 금액</dt>
              <dd className="font-bold text-primary">
                {amount === null
                  ? "관리자 확인 후 안내"
                  : amount === 0
                    ? "별도 협의"
                    : `₩${amount.toLocaleString()}`}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p>입금 확인 후 제작 작업이 시작됩니다.</p>
          <p className="mt-1">
            입금자명: {depositorName || "아직 입력하지 않음"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-primary/90"
        >
          확인
        </button>
      </div>
    </div>
  );
}
