"use client";

import FilePreview, { FilePreviewItem } from "@/components/FilePreview";
import { useDeleteFiles, useUploadFiles } from "@/hooks/query/useFiles";
import { usePriceOptions } from "@/hooks/query/usePricing";
import type { ThumbnailCustomOrderFormData } from "@/types/customThumbnailOrder";
import type { PriceOption } from "@/types/priceOption";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

type FormStep = 1 | 2;
type UploadingFileType = "character" | "reference" | null;

interface ThumbnailCustomOrderFormProps {
  onClose: () => void;
  onSubmit: (formData: ThumbnailCustomOrderFormData) => Promise<void>;
}

interface RequestData {
  contact: string;
  purpose: string;
  requirements: string;
  designKeywords: string;
  sourceFiles: FilePreviewItem[];
  sourceFileIds: string[];
  referenceFiles: FilePreviewItem[];
  referenceFileIds: string[];
}

interface PriceData {
  priceOptionId: string;
  depositorName: string;
  portfolioConsent: boolean;
}

const MAX_CHARACTER_FILES = 5;
const MAX_REFERENCE_FILES = 10;

export default function ThumbnailCustomOrderForm({
  onClose,
  onSubmit,
}: ThumbnailCustomOrderFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFileType, setUploadingFileType] =
    useState<UploadingFileType>(null);
  const [requestData, setRequestData] = useState<RequestData>({
    contact: "",
    purpose: "",
    requirements: "",
    designKeywords: "",
    sourceFiles: [],
    sourceFileIds: [],
    referenceFiles: [],
    referenceFileIds: [],
  });
  const [priceData, setPriceData] = useState<PriceData>({
    priceOptionId: "",
    depositorName: "",
    portfolioConsent: false,
  });

  const { data: priceOptions, isLoading: isLoadingPriceOptions, error: priceOptionsError } =
    usePriceOptions("thumbnail");
  const uploadFilesMutation = useUploadFiles();
  const deleteFilesMutation = useDeleteFiles();

  const isUploading = uploadingFileType !== null;
  const selectedPriceOption = priceOptions?.find(
    (option) => option.id === priceData.priceOptionId,
  );

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: Exclude<UploadingFileType, null>,
  ) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;

    const currentCount =
      type === "character"
        ? requestData.sourceFiles.length
        : requestData.referenceFiles.length;
    const maxFiles =
      type === "character" ? MAX_CHARACTER_FILES : MAX_REFERENCE_FILES;

    if (currentCount + files.length > maxFiles) {
      window.alert(`최대 ${maxFiles}개의 파일까지 업로드할 수 있습니다.`);
      return;
    }

    if (isUploading) return;

    setUploadingFileType(type);
    try {
      const uploadType =
        type === "character" ? "character-images" : "reference-files";
      const result = await uploadFilesMutation.mutateAsync({
        files,
        type: uploadType,
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

      setRequestData((previous) =>
        type === "character"
          ? {
              ...previous,
              sourceFiles: [...previous.sourceFiles, ...newItems],
              sourceFileIds: [...previous.sourceFileIds, ...newIds],
            }
          : {
              ...previous,
              referenceFiles: [...previous.referenceFiles, ...newItems],
              referenceFileIds: [...previous.referenceFileIds, ...newIds],
            },
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
      );
    } finally {
      setUploadingFileType(null);
    }
  };

  const handleRemoveFile = async (
    id: string,
    type: Exclude<UploadingFileType, null>,
  ) => {
    try {
      await deleteFilesMutation.mutateAsync([id]);
      setRequestData((previous) =>
        type === "character"
          ? {
              ...previous,
              sourceFiles: previous.sourceFiles.filter((file) => file.id !== id),
              sourceFileIds: previous.sourceFileIds.filter(
                (fileId) => fileId !== id,
              ),
            }
          : {
              ...previous,
              referenceFiles: previous.referenceFiles.filter(
                (file) => file.id !== id,
              ),
              referenceFileIds: previous.referenceFileIds.filter(
                (fileId) => fileId !== id,
              ),
            },
      );
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
      !requestData.purpose.trim() ||
      !requestData.requirements.trim() ||
      !requestData.designKeywords.trim()
    ) {
      window.alert("연락처, 사용 목적, 요청 내용, 컨셉을 모두 입력해주세요.");
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

    setSubmitting(true);
    try {
      await onSubmit({
        kind: "thumbnail",
        contact: requestData.contact.trim(),
        purpose: requestData.purpose.trim(),
        requirements: requestData.requirements.trim(),
        textRequirements: "",
        imageRequirements: "",
        designKeywords: requestData.designKeywords.trim(),
        canvas: { width: 3840, height: 2160 },
        portfolioConsent: priceData.portfolioConsent,
        depositorName: priceData.depositorName.trim(),
        priceOptionId: selectedPriceOption.id,
        sourceFileIds: requestData.sourceFileIds,
        referenceFileIds: requestData.referenceFileIds,
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
              <div className="mt-3 flex items-center gap-2" aria-label="신청 단계">
                {[1, 2].map((step) => (
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
                    {step === 1 && (
                      <span
                        className={`h-1 w-10 rounded-full ${
                          currentStep >= 2 ? "bg-secondary" : "bg-tertiary"
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
                캐릭터 사진과 원하는 썸네일 방향을 보내주시면, 3840 × 2160 규격의
                고객 전용 썸네일 템플릿으로 제작합니다.
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium text-dark-gray">
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
                <label className="text-sm font-medium text-dark-gray">
                  사용 목적 / 방송 내용 *
                  <input
                    type="text"
                    value={requestData.purpose}
                    onChange={(event) =>
                      setRequestData((previous) => ({
                        ...previous,
                        purpose: event.target.value,
                      }))
                    }
                    placeholder="예: 신작 게임 방송 썸네일"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-dark-gray">
                원하는 썸네일 내용 *
                <textarea
                  value={requestData.requirements}
                  onChange={(event) =>
                    setRequestData((previous) => ({
                      ...previous,
                      requirements: event.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="넣고 싶은 문구, 방송 제목, 강조하고 싶은 내용 등을 적어주세요."
                  className="mt-1 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>

              <label className="block text-sm font-medium text-dark-gray">
                컨셉과 분위기 *
                <textarea
                  value={requestData.designKeywords}
                  onChange={(event) =>
                    setRequestData((previous) => ({
                      ...previous,
                      designKeywords: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="원하는 색감, 분위기, 구성, 참고할 키워드를 적어주세요."
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
                      제작에 사용할 캐릭터 사진을 1~5개 업로드해주세요. JPG, PNG,
                      WebP 형식, 파일당 10MB까지 가능합니다.
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
                      onChange={(event) => handleUpload(event, "character")}
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
                  onRemove={(id) => handleRemoveFile(id, "character")}
                  maxFiles={MAX_CHARACTER_FILES}
                />
              </section>

              <section className="rounded-xl border border-slate-200 bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-dark-gray">
                      <FileText className="h-5 w-5 text-secondary" />
                      레퍼런스 이미지
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-dark-gray/60">
                      원하는 스타일을 보여주는 이미지를 선택적으로 첨부해주세요.
                      최대 10개까지 업로드할 수 있습니다.
                    </p>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-secondary px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/5">
                    <Upload className="h-4 w-4" />
                    업로드
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      multiple
                      onChange={(event) => handleUpload(event, "reference")}
                      disabled={
                        isUploading ||
                        requestData.referenceFiles.length >=
                          MAX_REFERENCE_FILES
                      }
                    />
                  </label>
                </div>
                {uploadingFileType === "reference" && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    레퍼런스 업로드 중...
                  </p>
                )}
                <FilePreview
                  files={requestData.referenceFiles}
                  onRemove={(id) => handleRemoveFile(id, "reference")}
                  maxFiles={MAX_REFERENCE_FILES}
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-dark-gray">
                  <CreditCard className="h-5 w-5 text-secondary" />
                  제작 가격을 선택해주세요
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-gray/70">
                  선택한 가격은 신청 내역에 견적 금액으로 기록됩니다. 세부 입금
                  안내는 신청 후 관리자 메모로 안내됩니다.
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
                <div className="space-y-3">{priceOptions.map(renderPriceOption)}</div>
              ) : (
                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
                  현재 선택할 수 있는 썸네일 가격 옵션이 없습니다.
                </p>
              )}

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
                  placeholder="가격 안내 후 입금할 분의 이름"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-dark-gray/80">
                <input
                  type="checkbox"
                  checked={priceData.portfolioConsent}
                  onChange={(event) =>
                    setPriceData((previous) => ({
                      ...previous,
                      portfolioConsent: event.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary"
                />
                <span>
                  완성된 작업물을 TEMIS 포트폴리오에 공개하는 것에 동의합니다.
                </span>
              </label>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <h3 className="font-semibold text-dark-gray">신청 내용 확인</h3>
                <dl className="mt-3 space-y-2 text-dark-gray/70">
                  <div className="flex justify-between gap-4">
                    <dt>사용 목적</dt>
                    <dd className="text-right font-medium text-dark-gray">
                      {requestData.purpose}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>캐릭터 사진</dt>
                    <dd className="font-medium text-dark-gray">
                      {requestData.sourceFiles.length}개
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>레퍼런스</dt>
                    <dd className="font-medium text-dark-gray">
                      {requestData.referenceFiles.length}개
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
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-tertiary px-5 py-3 font-semibold text-dark-gray transition hover:bg-tertiary disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  이전으로
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    isLoadingPriceOptions ||
                    !selectedPriceOption ||
                    !priceData.depositorName.trim()
                  }
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
                      제작 신청 완료
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
