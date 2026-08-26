"use client";

import FilePreview, { FilePreviewItem } from "@/components/FilePreview";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteFiles, useUploadFiles } from "@/hooks/query/useFiles";
import { usePriceOptions } from "@/hooks/query/usePricing";
import type { ThumbnailCustomOrderFormData } from "@/types/customThumbnailOrder";
import type { PriceOption } from "@/types/priceOption";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

type FormStep = 1 | 2 | 3;
type UploadingFileType = "character" | null;

interface ThumbnailCustomOrderFormProps {
  onClose: () => void;
  onSubmit: (formData: ThumbnailCustomOrderFormData) => Promise<void>;
}

interface RequestData {
  contact: string;
  color: string;
  virtualConcept: string;
  sourceFiles: FilePreviewItem[];
  sourceFileIds: string[];
}

interface PriceData {
  priceOptionId: string;
  depositorName: string;
  portfolioConsent: boolean;
}

const MAX_CHARACTER_FILES = 5;

export default function ThumbnailCustomOrderForm({
  onClose,
  onSubmit,
}: ThumbnailCustomOrderFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFileType, setUploadingFileType] =
    useState<UploadingFileType>(null);
  const [requestData, setRequestData] = useState<RequestData>({
    contact: "",
    color: "",
    virtualConcept: "",
    sourceFiles: [],
    sourceFileIds: [],
  });
  const [priceData, setPriceData] = useState<PriceData>({
    priceOptionId: "",
    depositorName: "",
    portfolioConsent: false,
  });

  const {
    data: priceOptions,
    isLoading: isLoadingPriceOptions,
    error: priceOptionsError,
  } = usePriceOptions("thumbnail");
  const uploadFilesMutation = useUploadFiles();
  const deleteFilesMutation = useDeleteFiles();

  const isUploading = uploadingFileType !== null;
  const selectedPriceOption = priceOptions?.find(
    (option) => option.id === priceData.priceOptionId,
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;

    const currentCount = requestData.sourceFiles.length;

    if (currentCount + files.length > MAX_CHARACTER_FILES) {
      window.alert(
        `최대 ${MAX_CHARACTER_FILES}개의 파일까지 업로드할 수 있습니다.`,
      );
      return;
    }

    if (isUploading) return;

    setUploadingFileType("character");
    try {
      const result = await uploadFilesMutation.mutateAsync({
        files,
        type: "character-images",
      });

      if (result.files.length !== files.length) {
        throw new Error("업로드된 파일 정보가 일치하지 않습니다.");
      }

      const newItems: FilePreviewItem[] = files.map((file, index) => ({
        id: result.files[index].id,
        file,
        url: result.files[index].url,
      }));
      const newIds = result.files.map((file) => file.id);

      setRequestData((previous) => ({
        ...previous,
        sourceFiles: [...previous.sourceFiles, ...newItems],
        sourceFileIds: [...previous.sourceFileIds, ...newIds],
      }));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
      );
    } finally {
      setUploadingFileType(null);
    }
  };

  const handleRemoveFile = async (id: string) => {
    try {
      await deleteFilesMutation.mutateAsync([id]);
      setRequestData((previous) => ({
        ...previous,
        sourceFiles: previous.sourceFiles.filter((file) => file.id !== id),
        sourceFileIds: previous.sourceFileIds.filter((fileId) => fileId !== id),
      }));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "파일 삭제에 실패했습니다.",
      );
    }
  };

  const handleRequestStepSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !requestData.contact.trim() ||
      !requestData.color.trim() ||
      !requestData.virtualConcept.trim()
    ) {
      window.alert("연락처, 원하는 색상, 버추얼 컨셉을 모두 입력해주세요.");
      return;
    }

    if (requestData.sourceFileIds.length === 0) {
      window.alert("캐릭터 사진을 최소 1개 업로드해주세요.");
      return;
    }

    if (isUploading) {
      window.alert("파일 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setCurrentStep(2);
  };

  const handlePriceStepSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!priceData.priceOptionId || !selectedPriceOption) {
      window.alert("가격을 하나 선택해주세요.");
      return;
    }

    setCurrentStep(3);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!priceData.priceOptionId || !selectedPriceOption) {
      window.alert("가격을 하나 선택해주세요.");
      return;
    }

    if (!priceData.depositorName.trim()) {
      window.alert("입금자명을 입력해주세요.");
      return;
    }

    const confirmMessage =
      "주문제작 신청을 진행하기 전에 확인해주세요:\n\n1. 입금이 완료되었는지 확인해주세요.\n2. 입금자명이 일치하는지 확인해주세요.\n\n신청을 계속 진행하시겠습니까?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        kind: "thumbnail",
        contact: requestData.contact.trim(),
        purpose: "맞춤형 썸네일 제작",
        requirements: `원하는 색상: ${requestData.color.trim()}`,
        textRequirements: "",
        imageRequirements: "",
        designKeywords: requestData.virtualConcept.trim(),
        canvas: { width: 3840, height: 2160 },
        portfolioConsent: priceData.portfolioConsent,
        depositorName: priceData.depositorName.trim(),
        priceOptionId: selectedPriceOption.id,
        sourceFileIds: requestData.sourceFileIds,
        referenceFileIds: [],
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "신청 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderPriceOption = (option: PriceOption) => {
    const isSelected = option.id === priceData.priceOptionId;

    return (
      <button
        key={option.id}
        type="button"
        aria-pressed={isSelected}
        onClick={() =>
          setPriceData((previous) => ({
            ...previous,
            priceOptionId: option.id,
          }))
        }
        className={`w-full rounded-xl border p-5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${
          isSelected
            ? "border-secondary bg-secondary/10 ring-2 ring-secondary/30"
            : "border-slate-200 bg-white hover:border-secondary/50 hover:bg-secondary/5"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-dark-gray">{option.label}</p>
            {option.description && (
              <p className="mt-2 text-sm leading-relaxed text-dark-gray/70">
                {option.description}
              </p>
            )}
          </div>
          <span className="shrink-0 text-lg font-bold text-secondary">
            ₩{option.price.toLocaleString()}
          </span>
        </div>
        {isSelected && (
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            선택됨
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 p-0 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-full w-full flex-col overflow-y-auto bg-timetable-form-bg sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 border-b border-tertiary bg-timetable-form-bg px-4 py-4 sm:rounded-t-2xl sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-dark-gray">
                TEMIS 맞춤형 썸네일 제작 신청
              </h2>
              <div
                className="mt-3 flex items-center gap-2"
                aria-label="신청 단계"
              >
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        currentStep >= step
                          ? "bg-secondary text-white"
                          : "bg-tertiary text-dark-gray/70"
                      }`}
                    >
                      {step}
                    </span>
                    {step < 3 && (
                      <span
                        className={`h-1 w-10 rounded-full ${
                          currentStep > step ? "bg-secondary" : "bg-tertiary"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="신청 폼 닫기"
              className="rounded-lg p-2 text-dark-gray/60 transition-colors hover:bg-tertiary hover:text-dark-gray"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6">
          {currentStep === 1 ? (
            <form onSubmit={handleRequestStepSubmit} className="space-y-6">
              <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-sm leading-relaxed text-dark-gray/75">
                캐릭터 사진과 원하는 썸네일 방향을 보내주시면, 3840 × 2160
                규격의 고객 전용 썸네일 템플릿으로 제작합니다.
              </div>

              <label className="block text-sm font-medium text-dark-gray">
                연락 가능한 연락처 *
                <input
                  type="text"
                  value={requestData.contact}
                  onChange={(event) =>
                    setRequestData((previous) => ({
                      ...previous,
                      contact: event.target.value,
                    }))
                  }
                  placeholder="이메일 또는 Discord"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>

              <label className="block text-sm font-medium text-dark-gray">
                원하는 색상 *
                <input
                  type="text"
                  value={requestData.color}
                  onChange={(event) =>
                    setRequestData((previous) => ({
                      ...previous,
                      color: event.target.value,
                    }))
                  }
                  placeholder="예: 파스텔톤, 검정과 빨강, #1e3a8a"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>

              <label className="block text-sm font-medium text-dark-gray">
                버추얼 컨셉 *
                <textarea
                  value={requestData.virtualConcept}
                  onChange={(event) =>
                    setRequestData((previous) => ({
                      ...previous,
                      virtualConcept: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="예: 밝고 귀여운 느낌의 핑크색 버추얼 캐릭터"
                  className="mt-1 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>

              <section className="rounded-xl border border-slate-200 bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-dark-gray">
                      <ImageIcon className="h-5 w-5 text-secondary" />
                      캐릭터 사진 *
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-dark-gray/60">
                      제작에 사용할 캐릭터 사진을 1~5개 업로드해주세요. JPG,
                      PNG, WebP 형식, 파일당 10MB까지 가능합니다.
                    </p>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-white transition hover:bg-secondary/90">
                    <Upload className="h-4 w-4" />
                    업로드
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleUpload}
                      disabled={
                        isUploading ||
                        requestData.sourceFiles.length >= MAX_CHARACTER_FILES
                      }
                    />
                  </label>
                </div>
                {uploadingFileType === "character" && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    캐릭터 사진 업로드 중...
                  </p>
                )}
                <FilePreview
                  files={requestData.sourceFiles}
                  onRemove={handleRemoveFile}
                  maxFiles={MAX_CHARACTER_FILES}
                />
              </section>

              <div className="flex justify-end border-t border-tertiary pt-5">
                <button
                  type="submit"
                  disabled={isUploading || deleteFilesMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-3 font-semibold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  가격 선택으로
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : currentStep === 2 ? (
            <form onSubmit={handlePriceStepSubmit} className="space-y-6">
              <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-dark-gray">
                  <CreditCard className="h-5 w-5 text-secondary" />
                  제작 가격을 선택해주세요
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-gray/70">
                  선택한 가격은 신청 내역에 견적 금액으로 기록됩니다. 다음
                  단계에서 입금 계좌와 결제 금액을 확인할 수 있습니다.
                </p>
              </div>

              {isLoadingPriceOptions ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-dark-gray/60">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  가격 옵션을 불러오는 중...
                </div>
              ) : priceOptionsError ? (
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  가격 옵션을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                </p>
              ) : priceOptions && priceOptions.length > 0 ? (
                <div className="space-y-3">
                  {priceOptions.map(renderPriceOption)}
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
                  현재 선택할 수 있는 썸네일 가격 옵션이 없습니다.
                </p>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <h3 className="font-semibold text-dark-gray">신청 내용 확인</h3>
                <dl className="mt-3 space-y-2 text-dark-gray/70">
                  <div className="flex justify-between gap-4">
                    <dt>원하는 색상</dt>
                    <dd className="text-right font-medium text-dark-gray">
                      {requestData.color}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>버추얼 컨셉</dt>
                    <dd className="max-w-[65%] text-right font-medium text-dark-gray">
                      {requestData.virtualConcept}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>캐릭터 사진</dt>
                    <dd className="font-medium text-dark-gray">
                      {requestData.sourceFiles.length}개
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                    <dt>선택 가격</dt>
                    <dd className="font-bold text-secondary">
                      {selectedPriceOption
                        ? `₩${selectedPriceOption.price.toLocaleString()}`
                        : "미선택"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-tertiary pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary px-5 py-3 font-semibold text-dark-gray transition hover:bg-tertiary disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전으로
                </button>
                <button
                  type="submit"
                  disabled={isLoadingPriceOptions || !selectedPriceOption}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 font-semibold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  입금 안내로
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg border border-primary p-4">
                <h3 className="mb-2 flex items-center font-medium text-primary">
                  <CreditCard className="mr-2 h-5 w-5" />
                  송금 계좌 정보
                </h3>
                <div className="space-y-1 text-sm text-dark-gray">
                  <p>• 은행: 토스뱅크</p>
                  <p>• 계좌번호: 1000-7564-4995</p>
                  <p>• 예금주: 이세영</p>
                  <p>
                    • 총 결제 금액:{" "}
                    {selectedPriceOption
                      ? `₩${selectedPriceOption.price.toLocaleString()}`
                      : "미선택"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-400" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      중요 안내
                    </h4>
                    <div className="mt-1 space-y-1 text-sm text-yellow-700">
                      <p>• 위 계좌로 총 결제 금액을 송금해주세요.</p>
                      <p>• 입금 확인 후 제작 작업이 시작됩니다.</p>
                      <p>
                        • 작업 일정은 공식 X (Twitter) @TEMISforyou 를
                        확인해주세요.
                      </p>
                      <p>
                        • 입금자명과 아래 입력한 정보가 일치하지 않으면 결제
                        확인이 어렵습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-tertiary p-3">
                <h4 className="mb-2 font-medium text-dark-gray">신청자 정보</h4>
                <div className="space-y-1 text-sm text-dark-gray/70">
                  <p>
                    <span className="font-medium">이름:</span> {user?.name}
                  </p>
                  <p>
                    <span className="font-medium">이메일:</span> {user?.email}
                  </p>
                </div>
              </div>

              <label className="block text-sm font-medium text-dark-gray">
                입금자명 *
                <input
                  type="text"
                  value={priceData.depositorName}
                  onChange={(event) =>
                    setPriceData((previous) => ({
                      ...previous,
                      depositorName: event.target.value,
                    }))
                  }
                  placeholder="계좌 이체 시 사용할 입금자명을 입력하세요"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-tertiary pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary px-5 py-3 font-semibold text-dark-gray transition hover:bg-tertiary disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전으로
                </button>
                <button
                  type="submit"
                  disabled={submitting || !priceData.depositorName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 font-semibold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      신청 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      신청 완료
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
