"use client";

import FilePreview, { FilePreviewItem } from "@/components/FilePreview";
import {
  FAST_DELIVERY_OPTION,
  OTHER_OPTIONS,
  REQUIRED_AREA_OPTIONS,
} from "@/constants/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminOptions } from "@/hooks/query/useAdminOptions";
import {
  useDeleteFiles,
  useFilesByOrderId,
  useUploadFiles,
} from "@/hooks/query/useFiles";
import { usePriceOptions } from "@/hooks/query/usePricing";
import { CustomOrderData, CustomOrderFormData } from "@/types/customOrder";
import { FileApiResponse } from "@/types/file";
import { PriceOption } from "@/types/priceOption";
import {
  AlertTriangle,
  Calculator,
  CreditCard,
  FileText,
  Palette,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Step1Data {
  youtubeSnsAddress: string;
  emailDiscord: string;
}

interface Step2Data {
  orderRequirements: string;
  hasCharacterImages: boolean;
  characterImageFiles: FilePreviewItem[];
  characterImageFileIds: string[];
  wantsOmakase: boolean;
  designKeywords: string;
  referenceFiles: FilePreviewItem[];
  referenceFileIds: string[];
}

interface Step3Data {
  selectedOptions: Record<string, boolean>; // option.value -> selected 상태
  requiredArea: string; // 필수 영역 선택 (라디오 버튼)
  fastDelivery: boolean; // 빠른 마감 선택 (체크박스)
  externalContract: boolean;
  priceQuoted: number;
  depositorName: string;
}

interface CustomOrderFormProps {
  onClose: () => void;
  onSubmit: (formData: CustomOrderFormData) => Promise<void>;
  existingOrder?: CustomOrderData; // 수정 모드일 때 기존 주문 데이터
  isEditMode?: boolean; // 수정 모드 여부
}

export default function CustomOrderForm({
  onClose,
  onSubmit,
  existingOrder,
  isEditMode = false,
}: CustomOrderFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // React Query hooks
  const { data: priceOptions, isLoading: loadingPricing } =
    usePriceOptions("timetable");
  const { data: adminOptions } = useAdminOptions("general");
  const { data: existingFilesData } = useFilesByOrderId(
    isEditMode ? existingOrder?.id : undefined
  );
  const uploadFilesMutation = useUploadFiles();
  const deleteFilesMutation = useDeleteFiles();

  // 빠른 마감 옵션 활성화 여부 확인
  const isWorkFastEnabled =
    adminOptions?.some((opt) => opt.value === "work_fast" && opt.is_enabled) ??
    false;

  const [step1Data, setStep1Data] = useState<Step1Data>({
    youtubeSnsAddress: existingOrder?.youtube_sns_address || "",
    emailDiscord: existingOrder?.email_discord || "",
  });

  const [step2Data, setStep2Data] = useState<Step2Data>({
    orderRequirements: existingOrder?.order_requirements || "",
    hasCharacterImages: existingOrder?.has_character_images || false,
    characterImageFiles: [], // 파일은 useEffect에서 로드
    characterImageFileIds: [], // 파일은 useEffect에서 로드
    wantsOmakase: existingOrder?.wants_omakase || false,
    designKeywords: existingOrder?.design_keywords || "",
    referenceFiles: [], // 파일은 useEffect에서 로드
    referenceFileIds: [], // 파일은 useEffect에서 로드
  });

  // 필수 영역 옵션 값들
  const REQUIRED_AREA_VALUES = new Set(
    REQUIRED_AREA_OPTIONS.map((opt) => opt.value)
  );

  // 필수 영역 선택 복원
  const getInitialRequiredArea = (): string => {
    if (!existingOrder?.selected_options) return REQUIRED_AREA_OPTIONS[0].value;
    // selected_options 배열에서 필수 영역 옵션 찾기
    const requiredAreaValue = existingOrder.selected_options.find((opt) =>
      REQUIRED_AREA_VALUES.has(opt)
    );
    return requiredAreaValue || REQUIRED_AREA_OPTIONS[0].value;
  };

  // 빠른 마감 선택 복원
  const getInitialFastDelivery = (): boolean => {
    if (!existingOrder?.selected_options) return false;
    return existingOrder.selected_options.includes("fast_delivery_custom");
  };

  // 외부 계약 체크 (한글 라벨 또는 영어 value)
  const getInitialExternalContract = (): boolean => {
    if (!existingOrder?.selected_options) return false;
    return (
      existingOrder.selected_options.includes("외부 계약") ||
      existingOrder.selected_options.includes("external_contract")
    );
  };

  // 기존 주문의 선택된 옵션들을 value 기반으로 복원
  // REQUIRED_AREA, FAST_DELIVERY, EXTERNAL_CONTRACT는 제외하고 DB 옵션과 OTHER_OPTIONS만 복원
  const getInitialSelectedOptions = (): Record<string, boolean> => {
    if (!existingOrder?.selected_options) return {};
    const selectedOptions: Record<string, boolean> = {};

    // 제외할 옵션 값들
    const excludedValues = new Set([
      ...REQUIRED_AREA_VALUES,
      "fast_delivery_custom",
      "external_contract",
      "외부 계약",
    ]);

    // OTHER_OPTIONS 값들
    const otherOptionValues = new Set(OTHER_OPTIONS.map((opt) => opt.value));

    existingOrder.selected_options.forEach((optionKey: string) => {
      // 제외할 옵션들은 건너뛰기
      if (excludedValues.has(optionKey)) return;

      // OTHER_OPTIONS 값이거나 DB 옵션이면 추가
      if (otherOptionValues.has(optionKey)) {
        selectedOptions[optionKey] = true;
      } else {
        // DB 옵션일 가능성이 있으므로 추가 (priceOptions에서 검증됨)
        selectedOptions[optionKey] = true;
      }
    });

    return selectedOptions;
  };

  const [step3Data, setStep3Data] = useState<Step3Data>({
    selectedOptions: getInitialSelectedOptions(),
    requiredArea: getInitialRequiredArea(),
    fastDelivery: getInitialFastDelivery(),
    externalContract: getInitialExternalContract(),
    priceQuoted: existingOrder?.price_quoted || 80000,
    depositorName: existingOrder?.depositor_name || "",
  });

  // 수정 모드일 때 기존 파일들 로드
  useEffect(() => {
    if (!isEditMode || !existingOrder || !existingFilesData) return;

    // 파일 카테고리별로 분류
    const characterImageFiles = existingFilesData.files
      .filter(
        (file: FileApiResponse) => file.file_category === "character_image"
      )
      .map((file: FileApiResponse) => ({
        id: file.id,
        file: null, // 수정 모드에서는 실제 File 객체가 없음
        url: file.url,
        mime_type: file.mime_type,
        original_name: file.original_name,
        file_size: file.file_size,
      }));

    const referenceFiles = existingFilesData.files
      .filter((file: FileApiResponse) => file.file_category === "reference")
      .map((file: FileApiResponse) => ({
        id: file.id,
        file: null, // 수정 모드에서는 실제 File 객체가 없음
        url: file.url,
        mime_type: file.mime_type,
        original_name: file.original_name,
        file_size: file.file_size,
      }));

    setStep2Data((prev) => ({
      ...prev,
      characterImageFiles,
      referenceFiles,
      characterImageFileIds: characterImageFiles.map(
        (f: FilePreviewItem) => f.id
      ),
      referenceFileIds: referenceFiles.map((f: FilePreviewItem) => f.id),
    }));
  }, [isEditMode, existingOrder, existingFilesData]);

  // 옵션 헬퍼 함수들
  const getOptionByValue = (value: string): PriceOption | undefined => {
    return priceOptions?.find((opt) => opt.value === value);
  };

  // 기본 가격이 아닌 옵션들만 필터링 (선택 가능한 옵션들)
  // 기타 옵션으로 이동한 항목들은 제외
  const selectableOptions =
    priceOptions?.filter(
      (opt) =>
        opt.value !== "base_price" &&
        opt.value !== "portfolio_private" &&
        opt.value !== "review_event"
    ) || [];

  // 필수 영역 선택 시 외부 계약 여부 자동 업데이트
  useEffect(() => {
    const isExternalContract = step3Data.requiredArea === "external_contract";
    if (step3Data.externalContract !== isExternalContract) {
      setStep3Data((prev) => ({
        ...prev,
        externalContract: isExternalContract,
        // 외부 계약 선택 시 다른 옵션들 해제
        ...(isExternalContract && {
          selectedOptions: {},
          fastDelivery: false,
        }),
      }));
    }
  }, [step3Data.requiredArea]);

  // 가격 계산
  useEffect(() => {
    // 외부 계약일 경우 가격은 0원
    if (step3Data.externalContract) {
      setStep3Data((prev) => ({ ...prev, priceQuoted: 0 }));
      return;
    }

    let total = 0;

    // 필수 영역 가격
    const selectedRequiredArea = REQUIRED_AREA_OPTIONS.find(
      (opt) => opt.value === step3Data.requiredArea
    );
    if (selectedRequiredArea) {
      total = selectedRequiredArea.price;
    }

    // 선택된 옵션들의 가격을 계산 (DB 옵션 + 기타 옵션)
    Object.entries(step3Data.selectedOptions).forEach(
      ([optionValue, isSelected]) => {
        if (isSelected) {
          // DB 옵션 확인
          const dbOption = getOptionByValue(optionValue);
          if (dbOption) {
            if (dbOption.is_discount) {
              total -= dbOption.price;
            } else {
              total += dbOption.price;
            }
            return;
          }

          // 기타 옵션 확인
          const otherOption = OTHER_OPTIONS.find(
            (opt) => opt.value === optionValue
          );
          if (otherOption) {
            if (otherOption.is_discount) {
              total -= otherOption.price;
            } else {
              total += otherOption.price;
            }
          }
        }
      }
    );

    // 빠른 마감 선택 시 전체 가격 2배
    if (step3Data.fastDelivery) {
      total *= FAST_DELIVERY_OPTION.multiplier;
    }

    setStep3Data((prev) => ({ ...prev, priceQuoted: total }));
  }, [
    step3Data.selectedOptions,
    step3Data.requiredArea,
    step3Data.fastDelivery,
    step3Data.externalContract,
    priceOptions,
  ]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Data.youtubeSnsAddress || !step1Data.emailDiscord) {
      alert("모든 필수 항목을 입력해주세요.");
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!step2Data.orderRequirements) {
      alert("시간표 제작에 필요한 요소들을 입력해주세요.");
      return;
    }

    if (uploadingFiles) {
      alert("파일 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setCurrentStep(3);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(4);
  };

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const formData: CustomOrderFormData = {
        ...step1Data,
        ...step2Data,
        ...step3Data,
        ...(isEditMode && existingOrder && { orderId: existingOrder.id }),
      };
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(
        isEditMode
          ? "수정 중 오류가 발생했습니다."
          : "신청 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCharacterImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 파일 개수 제한 확인
    const currentCount = step2Data.characterImageFiles.length;
    const newCount = files.length;
    if (currentCount + newCount > 5) {
      alert(
        `최대 5개의 파일까지 업로드할 수 있습니다. (현재: ${currentCount}개)`
      );
      return;
    }

    setUploadingFiles(true);
    try {
      const result = await uploadFilesMutation.mutateAsync({
        files: Array.from(files),
        type: "character-images",
      });

      // FilePreviewItem 형식으로 변환
      const newFileItems: FilePreviewItem[] = Array.from(files).map(
        (file, index) => ({
          id: result.files[index].id,
          file: file,
          url: result.files[index].url,
        })
      );

      setStep2Data((prev) => ({
        ...prev,
        characterImageFiles: [...prev.characterImageFiles, ...newFileItems],
        characterImageFileIds: [
          ...prev.characterImageFileIds,
          ...result.files.map((file) => file.id),
        ],
      }));
    } catch (error) {
      console.error("캐릭터 이미지 업로드 실패:", error);
      alert(
        error instanceof Error ? error.message : "파일 업로드에 실패했습니다."
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleReferenceFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 파일 개수 제한 확인
    const currentCount = step2Data.referenceFiles.length;
    const newCount = files.length;
    if (currentCount + newCount > 10) {
      alert(
        `최대 10개의 파일까지 업로드할 수 있습니다. (현재: ${currentCount}개)`
      );
      return;
    }

    setUploadingFiles(true);
    try {
      const result = await uploadFilesMutation.mutateAsync({
        files: Array.from(files),
        type: "reference-files",
      });

      // FilePreviewItem 형식으로 변환
      const newFileItems: FilePreviewItem[] = Array.from(files).map(
        (file, index) => ({
          id: result.files[index].id,
          file: file,
          url: result.files[index].url,
        })
      );

      setStep2Data((prev) => ({
        ...prev,
        referenceFiles: [...prev.referenceFiles, ...newFileItems],
        referenceFileIds: [
          ...prev.referenceFileIds,
          ...result.files.map((file) => file.id),
        ],
      }));
    } catch (error) {
      console.error("참고 파일 업로드 실패:", error);
      alert(
        error instanceof Error ? error.message : "파일 업로드에 실패했습니다."
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  // 캐릭터 이미지 파일 삭제
  const handleRemoveCharacterImage = async (fileId: string) => {
    try {
      await deleteFilesMutation.mutateAsync([fileId]);

      // 로컬 상태에서 파일 제거
      setStep2Data((prev) => ({
        ...prev,
        characterImageFiles: prev.characterImageFiles.filter(
          (file) => file.id !== fileId
        ),
        characterImageFileIds: prev.characterImageFileIds.filter(
          (id) => id !== fileId
        ),
      }));
    } catch (error) {
      console.error("파일 삭제 실패:", error);
      alert(
        error instanceof Error ? error.message : "파일 삭제에 실패했습니다."
      );
    }
  };

  // 참고 파일 삭제
  const handleRemoveReferenceFile = async (fileId: string) => {
    try {
      await deleteFilesMutation.mutateAsync([fileId]);

      // 로컬 상태에서 파일 제거
      setStep2Data((prev) => ({
        ...prev,
        referenceFiles: prev.referenceFiles.filter(
          (file) => file.id !== fileId
        ),
        referenceFileIds: prev.referenceFileIds.filter((id) => id !== fileId),
      }));
    } catch (error) {
      console.error("파일 삭제 실패:", error);
      alert(
        error instanceof Error ? error.message : "파일 삭제에 실패했습니다."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden sm:bg-black/50 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4 sm:overflow-y-auto">
      <div className="bg-timetable-form-bg h-full w-full overflow-y-auto sm:rounded-2xl sm:max-w-2xl sm:w-full sm:max-h-[90vh] sm:h-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-timetable-form-bg border-b border-tertiary px-4 sm:px-6 py-4 sm:rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-dark-gray">
                {isEditMode ? "주문 수정" : "TEMIS 맞춤형 시간표 제작 신청폼"}
              </h2>
              <div className="flex items-center mt-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 1
                      ? "bg-primary text-white"
                      : "bg-tertiary text-dark-gray/70"
                  }`}
                >
                  1
                </div>
                <div
                  className={`w-8 h-1 ${
                    currentStep >= 2 ? "bg-primary" : "bg-tertiary"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 2
                      ? "bg-primary text-white"
                      : "bg-tertiary text-dark-gray/70"
                  }`}
                >
                  2
                </div>
                <div
                  className={`w-8 h-1 ${
                    currentStep >= 3 ? "bg-primary" : "bg-tertiary"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 3
                      ? "bg-primary text-white"
                      : "bg-tertiary text-dark-gray/70"
                  }`}
                >
                  3
                </div>
                <div
                  className={`w-8 h-1 ${
                    currentStep >= 4 ? "bg-primary" : "bg-tertiary"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 4
                      ? "bg-primary text-white"
                      : "bg-tertiary text-dark-gray/70"
                  }`}
                >
                  4
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-dark-gray/70 hover:text-dark-gray text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6">
          {currentStep === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              {/* 가격 안내 */}
              <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                <h3 className="font-medium text-primary mb-2 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  TEMIS 시간표 커미션 예약 안내
                </h3>
                <div className="text-sm text-dark-gray space-y-1">
                  <p>
                    기본적인 진행 방법은 레퍼런스 확인 → 디자인 → 디자인
                    수정(기본 3회) → 웹 제작 → 완성 입니다!
                  </p>
                  <p>작업 시작 후 약 2주 뒤, 정상 기준 3~4주가 소요됩니다.</p>
                  <p>{`자세한 작업 일정은 "작업 일정표"에서 확인하실 수 있습니다.`}</p>
                  <p>입금 완료 확인 후에 작업이 접수됩니다.</p>
                  <p>
                    커뮤 연락 디스코드의 경우 <strong>사악이 evilsnake_</strong>
                    로 친추 드리고 있습니다.
                  </p>
                  <p className="font-medium">
                    ※ 후기 작성 이벤트 참여 시, 사용 후기를 꼭 작성해주셔야
                    합니다.
                  </p>
                  <p>→ 트위터에 @TEMIS 태그와 함께 리뷰 부탁드립니다.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-1">
                    버튜버 활동명과 SNS 주소 *
                  </label>
                  <textarea
                    required
                    value={step1Data.youtubeSnsAddress}
                    onChange={(e) =>
                      setStep1Data((prev) => ({
                        ...prev,
                        youtubeSnsAddress: e.target.value,
                      }))
                    }
                    className="w-full border border-tertiary bg-timetable-input-bg rounded-lg px-3 py-2 h-20 resize-none text-dark-gray focus:outline-none bg-timetable-input-bg text-dark-gray focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="활동명과 SNS 주소를 입력해주세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-1">
                    컨펌 & 연락가능한 메일이나 디스코드 *
                  </label>
                  <textarea
                    required
                    value={step1Data.emailDiscord}
                    onChange={(e) =>
                      setStep1Data((prev) => ({
                        ...prev,
                        emailDiscord: e.target.value,
                      }))
                    }
                    className="w-full border border-tertiary bg-timetable-input-bg rounded-lg px-3 py-2 h-20 resize-none text-dark-gray focus:outline-none bg-timetable-input-bg text-dark-gray focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="연락 가능한 이메일 또는 디스코드를 입력해주세요"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 font-medium"
                >
                  다음
                </button>
              </div>
            </form>
          ) : currentStep === 2 ? (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              {/* 요구사항 안내 */}
              <div className="bg-[#4c6ef5] text-white p-4 rounded-lg">
                <h3 className="font-medium mb-2">
                  시간표 제작에 필요한 요소들을 첨부해주세요
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    원하는 디자인이 명확하지 않으신 분은 오마카세 요청을
                    추천드립니다!
                  </p>
                  <p>(디자인은 대부분 작업 시작 이후 1주 사이로 나갑니다.)</p>
                  <p>
                    단, 오마카세 요청시 <strong>1회만 수정</strong>가능합니다
                    (다 다시 만들어 달라는 수정은 불가능)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-1">
                    시간표 제작에 필요한 요소들 *
                  </label>
                  <textarea
                    required
                    value={step2Data.orderRequirements}
                    onChange={(e) =>
                      setStep2Data((prev) => ({
                        ...prev,
                        orderRequirements: e.target.value,
                      }))
                    }
                    className="w-full border border-tertiary bg-timetable-input-bg rounded-lg px-3 py-2 h-32 resize-none text-dark-gray focus:outline-none bg-timetable-input-bg text-dark-gray focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="필요한 시간표 내용, 스케줄 등을 자세히 작성해주세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">
                    버튜버 캐릭터 사진을 첨부해주세요 *
                  </label>
                  <p className="text-xs text-dark-gray/70 mb-3">
                    지원되는 파일을 최대 5개까지 업로드하세요. 파일당 최대
                    크기는 1 GB입니다.
                  </p>
                  <div className="border-2 border-dashed border-tertiary rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <Upload className="h-8 w-8 text-dark-gray/40 mx-auto mb-2" />
                    <p className="text-sm text-dark-gray/70 mb-2">
                      파일을 드래그하거나 클릭하여 업로드
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleCharacterImageUpload}
                      className="hidden"
                      id="character-images"
                    />
                    <label
                      htmlFor="character-images"
                      className="inline-flex items-center px-4 py-2 border border-tertiary rounded-lg text-sm font-medium text-dark-gray bg-white hover:bg-tertiary cursor-pointer"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      파일 선택
                    </label>
                  </div>
                  {uploadingFiles && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      파일 업로드 중...
                    </div>
                  )}

                  {/* 파일 미리보기 */}
                  <FilePreview
                    files={step2Data.characterImageFiles}
                    onRemove={handleRemoveCharacterImage}
                    maxFiles={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">
                    오마카세 요청 (오마카세 시 제작 속도가 빨라집니다.) *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="omakase"
                        checked={step2Data.wantsOmakase === true}
                        onChange={() =>
                          setStep2Data((prev) => ({
                            ...prev,
                            wantsOmakase: true,
                          }))
                        }
                        className="mr-2"
                      />
                      예
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="omakase"
                        checked={step2Data.wantsOmakase === false}
                        onChange={() =>
                          setStep2Data((prev) => ({
                            ...prev,
                            wantsOmakase: false,
                          }))
                        }
                        className="mr-2"
                      />
                      아니요
                    </label>
                  </div>

                  {!step2Data.wantsOmakase && (
                    <div className="mt-4 p-3 bg-tertiary rounded-lg">
                      <h4 className="font-medium text-dark-gray mb-2">
                        오마카세 아니요에 체크 제크하신 분 공지
                      </h4>
                      <ul className="text-sm text-dark-gray/70 space-y-1 list-disc list-inside">
                        <li>이미지 위치 (첨독, 우측)</li>
                        <li>내용 입력 칸의 형태 (정사각형, 가로형 등)</li>
                        <li>휴일의 표기 방식</li>
                        <li>시간표 상단에 들어갈 제목 문구</li>
                      </ul>
                      <p className="text-xs text-dark-gray/60 mt-2">
                        (예: 이번 주 스케줄, 시간표, Schedule 등)
                      </p>
                      <p className="text-sm text-dark-gray/70 mt-2">
                        원하시는 디자인요소가 있다면 모든 작성 부탁 드립니다!
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-1">
                    시간표에 원하는 디자인이나 간단 키워드 *
                  </label>
                  <textarea
                    required
                    value={step2Data.designKeywords}
                    onChange={(e) =>
                      setStep2Data((prev) => ({
                        ...prev,
                        designKeywords: e.target.value,
                      }))
                    }
                    className="w-full border border-tertiary bg-timetable-input-bg rounded-lg px-3 py-2 h-24 resize-none text-dark-gray focus:outline-none bg-timetable-input-bg text-dark-gray focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="원하는 디자인 스타일, 색상, 키워드 등을 입력해주세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">
                    원하시는 디자인 시안이나 레퍼런스를 준비해주신 분에
                    올려주세요
                  </label>
                  <p className="text-xs text-dark-gray/70 mb-3">
                    지원되는 파일을 최대 10개까지 업로드하세요. 파일당 최대
                    크기는 100 MB입니다.
                  </p>
                  <div className="border-2 border-dashed border-tertiary rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <Palette className="h-8 w-8 text-dark-gray/40 mx-auto mb-2" />
                    <p className="text-sm text-dark-gray/70 mb-2">
                      레퍼런스 파일 업로드
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleReferenceFileUpload}
                      className="hidden"
                      id="reference-files"
                    />
                    <label
                      htmlFor="reference-files"
                      className="inline-flex items-center px-4 py-2 border border-tertiary rounded-lg text-sm font-medium text-dark-gray bg-white hover:bg-tertiary cursor-pointer"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      파일 선택
                    </label>
                  </div>
                  {/* 참고 파일 미리보기 */}
                  <FilePreview
                    files={step2Data.referenceFiles}
                    onRemove={handleRemoveReferenceFile}
                    maxFiles={10}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentStep(1);
                  }}
                  className="border border-tertiary px-6 py-2 rounded-lg hover:bg-tertiary font-medium text-dark-gray"
                >
                  이전
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 font-medium"
                >
                  다음
                </button>
              </div>
            </form>
          ) : currentStep === 3 ? (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              {/* 가격 계산 단계 */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  가격 계산 및 옵션 선택
                </h3>
                <p className="text-sm text-green-700">
                  추가 옵션을 선택하고 최종 금액을 확인해주세요.
                </p>
                <p className="text-sm text-green-700">
                  별도의 문의사항이 있으시면 공식 트위터{" "}
                  <a className="text-blue-600" href="https://x.com/TEMISforyou">
                    @TEMISforyou
                  </a>
                  로 문의주세요
                </p>
              </div>

              {loadingPricing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a] mx-auto"></div>
                  <p className="text-dark-gray/70 mt-2">
                    가격 정보를 불러오는 중...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 필수 영역 부분 */}
                  <div>
                    <h4 className="font-medium text-dark-gray mb-3 text-lg">
                      필수 영역 부분
                    </h4>
                    <div className="space-y-3">
                      {REQUIRED_AREA_OPTIONS.map((option) => {
                        const isExternalContract =
                          option.value === "external_contract";
                        const isSelected =
                          step3Data.requiredArea === option.value;

                        return (
                          <label
                            key={option.value}
                            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                              isExternalContract
                                ? isSelected
                                  ? "border-purple-200 bg-purple-50"
                                  : "border-purple-200 hover:bg-purple-50"
                                : isSelected
                                ? "border-[#1e3a8a] bg-blue-50"
                                : "border-slate-200 hover:bg-tertiary"
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="requiredArea"
                                checked={isSelected}
                                onChange={() =>
                                  setStep3Data((prev) => ({
                                    ...prev,
                                    requiredArea: option.value,
                                  }))
                                }
                                className={`mr-3 h-4 w-4 border-slate-300 ${
                                  isExternalContract
                                    ? "text-purple-600 focus:ring-purple-500"
                                    : "text-primary focus:ring-primary"
                                }`}
                              />
                              <div>
                                <div
                                  className={`font-medium ${
                                    isExternalContract
                                      ? "text-purple-800"
                                      : "text-dark-gray"
                                  }`}
                                >
                                  {option.label}
                                </div>
                                {option.description && (
                                  <div
                                    className={`text-sm ${
                                      isExternalContract
                                        ? "text-purple-600"
                                        : "text-dark-gray/70"
                                    }`}
                                  >
                                    {option.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`font-bold ${
                                isExternalContract
                                  ? "text-purple-600"
                                  : "text-primary"
                              }`}
                            >
                              {option.price === 0
                                ? isExternalContract
                                  ? "별도 협의"
                                  : "포함"
                                : `₩${option.price.toLocaleString()}`}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 선택 영역 부분 */}
                  {selectableOptions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-dark-gray mb-3 text-lg">
                        선택 영역 부분
                      </h4>
                      <div className="space-y-3">
                        {selectableOptions.map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                              step3Data.externalContract
                                ? "border-slate-100 bg-slate-25 opacity-50 cursor-not-allowed"
                                : option.is_discount
                                ? "border-green-200 hover:bg-green-50 bg-green-25"
                                : "border-slate-200 hover:bg-tertiary"
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={
                                  step3Data.selectedOptions[option.value] ||
                                  false
                                }
                                disabled={step3Data.externalContract}
                                onChange={(e) =>
                                  setStep3Data((prev) => ({
                                    ...prev,
                                    selectedOptions: {
                                      ...prev.selectedOptions,
                                      [option.value]: e.target.checked,
                                    },
                                  }))
                                }
                                className={`mr-3 h-4 w-4 border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                                  option.is_discount
                                    ? "text-green-600 focus:ring-green-500"
                                    : "text-primary focus:ring-primary"
                                }`}
                              />
                              <div>
                                <div
                                  className={`font-medium ${
                                    step3Data.externalContract
                                      ? "text-dark-gray/40"
                                      : option.is_discount
                                      ? "text-green-800"
                                      : "text-dark-gray"
                                  }`}
                                >
                                  {option.label}
                                </div>
                                {option.description && (
                                  <div
                                    className={`text-sm ${
                                      step3Data.externalContract
                                        ? "text-slate-300"
                                        : option.is_discount
                                        ? "text-green-600"
                                        : "text-dark-gray/70"
                                    }`}
                                  >
                                    {option.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`font-bold ${
                                step3Data.externalContract
                                  ? "text-dark-gray/40"
                                  : option.is_discount
                                  ? "text-green-600"
                                  : "text-primary"
                              }`}
                            >
                              {option.is_discount ? "-" : "+"}₩
                              {option.price.toLocaleString()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 기타 옵션 */}
                  <div>
                    <h4 className="font-medium text-dark-gray mb-3 text-lg">
                      기타 옵션
                    </h4>
                    <div className="space-y-3">
                      {OTHER_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                            step3Data.externalContract
                              ? "border-slate-100 bg-slate-25 opacity-50 cursor-not-allowed"
                              : option.is_discount
                              ? "border-green-200 hover:bg-green-50 bg-green-25"
                              : "border-slate-200 hover:bg-tertiary"
                          }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={
                                step3Data.selectedOptions[option.value] || false
                              }
                              disabled={step3Data.externalContract}
                              onChange={(e) =>
                                setStep3Data((prev) => ({
                                  ...prev,
                                  selectedOptions: {
                                    ...prev.selectedOptions,
                                    [option.value]: e.target.checked,
                                  },
                                }))
                              }
                              className={`mr-3 h-4 w-4 border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                                option.is_discount
                                  ? "text-green-600 focus:ring-green-500"
                                  : "text-primary focus:ring-primary"
                              }`}
                            />
                            <div>
                              <div
                                className={`font-medium ${
                                  step3Data.externalContract
                                    ? "text-dark-gray/40"
                                    : option.is_discount
                                    ? "text-green-800"
                                    : "text-dark-gray"
                                }`}
                              >
                                {option.label}
                              </div>
                              <div
                                className={`text-sm ${
                                  step3Data.externalContract
                                    ? "text-slate-300"
                                    : option.is_discount
                                    ? "text-green-600"
                                    : "text-dark-gray/70"
                                }`}
                              >
                                {option.description}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`font-bold ${
                              step3Data.externalContract
                                ? "text-dark-gray/40"
                                : option.is_discount
                                ? "text-green-600"
                                : "text-primary"
                            }`}
                          >
                            {option.is_discount ? "-" : "+"}₩
                            {option.price.toLocaleString()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 빠른 마감 부분 */}
                  {isWorkFastEnabled && (
                    <div>
                      <h4 className="font-medium text-dark-gray mb-3 text-lg">
                        빠른 마감 부분
                      </h4>
                      <label className="flex items-center justify-between p-4 border border-orange-200 rounded-lg hover:bg-orange-50 cursor-pointer bg-orange-25">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={step3Data.fastDelivery}
                            disabled={step3Data.externalContract}
                            onChange={(e) =>
                              setStep3Data((prev) => ({
                                ...prev,
                                fastDelivery: e.target.checked,
                              }))
                            }
                            className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div>
                            <div
                              className={`font-medium ${
                                step3Data.externalContract
                                  ? "text-dark-gray/40"
                                  : "text-orange-800"
                              }`}
                            >
                              {FAST_DELIVERY_OPTION.label}
                            </div>
                            <div
                              className={`text-sm ${
                                step3Data.externalContract
                                  ? "text-slate-300"
                                  : "text-orange-600"
                              }`}
                            >
                              {FAST_DELIVERY_OPTION.description}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`font-bold ${
                            step3Data.externalContract
                              ? "text-dark-gray/40"
                              : "text-orange-600"
                          }`}
                        >
                          ×{FAST_DELIVERY_OPTION.multiplier}
                        </span>
                      </label>
                    </div>
                  )}

                  {/* 총 금액 표시 */}
                  <div className="bg-primary text-white p-6 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">총 결제 금액</span>
                      <span className="text-2xl font-bold">
                        {step3Data.externalContract
                          ? "별도 협의"
                          : `₩${step3Data.priceQuoted.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentStep(2);
                  }}
                  className="border border-tertiary px-6 py-2 rounded-lg hover:bg-tertiary font-medium text-dark-gray"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loadingPricing}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
                >
                  다음
                </button>
              </div>
            </form>
          ) : currentStep === 4 ? (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              {/* 송금 안내 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-primary mb-2 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  송금 계좌 정보
                </h3>
                <div className="text-sm text-dark-gray space-y-1">
                  <p>• 은행: 토스뱅크</p>
                  <p>• 계좌번호: 1000-7564-4995</p>
                  <p>• 예금주: 이세영</p>
                  <p>
                    • 총 결제 금액:{" "}
                    {step3Data.externalContract
                      ? "별도 협의"
                      : `₩${step3Data.priceQuoted.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      중요 안내
                    </h4>
                    <div className="text-sm text-yellow-700 mt-1 space-y-1">
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

              {/* 사용자 정보 표시 */}
              <div className="p-3 bg-tertiary rounded-lg">
                <h4 className="font-medium mb-2 text-dark-gray">신청자 정보</h4>
                <div className="text-sm text-dark-gray/70 space-y-1">
                  <p>
                    <span className="font-medium">이름:</span> {user?.name}
                  </p>
                  <p>
                    <span className="font-medium">이메일:</span> {user?.email}
                  </p>
                </div>
              </div>

              {/* 입금자명 입력 */}
              <div>
                <label className="block text-sm font-medium mb-1 text-dark-gray">
                  입금자명 *
                </label>
                <input
                  type="text"
                  required
                  value={step3Data.depositorName}
                  onChange={(e) =>
                    setStep3Data((prev) => ({
                      ...prev,
                      depositorName: e.target.value,
                    }))
                  }
                  placeholder="계좌 이체 시 사용할 입금자명을 입력하세요"
                  className="w-full border border-tertiary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentStep(3);
                  }}
                  className="border border-tertiary px-6 py-2 rounded-lg hover:bg-tertiary font-medium text-dark-gray"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
                >
                  {submitting
                    ? isEditMode
                      ? "수정 중..."
                      : "신청 중..."
                    : isEditMode
                    ? "수정 완료"
                    : "신청 완료"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
