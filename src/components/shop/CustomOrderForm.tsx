"use client";

import FilePreview, { FilePreviewItem } from "@/components/FilePreview";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDeleteFiles,
  useFilesByOrderId,
  useUploadFiles,
} from "@/hooks/query/useFiles";
import { usePricingSettings } from "@/hooks/query/usePricing";
import { CustomOrderData, CustomOrderFormData } from "@/types/customOrder";
import { FileApiResponse } from "@/types/file";
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
  fastDelivery: boolean;
  portfolioPrivate: boolean;
  reviewEvent: boolean;
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
  const { data: pricingSettings, isLoading: loadingPricing } =
    usePricingSettings();
  const { data: existingFilesData } = useFilesByOrderId(
    isEditMode ? existingOrder?.id : undefined
  );
  const uploadFilesMutation = useUploadFiles();
  const deleteFilesMutation = useDeleteFiles();

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

  const [step3Data, setStep3Data] = useState<Step3Data>({
    fastDelivery:
      existingOrder?.selected_options?.includes("빠른 마감") || false,
    portfolioPrivate:
      existingOrder?.selected_options?.includes("포트폴리오 비공개") || false,
    reviewEvent:
      existingOrder?.selected_options?.includes("후기 이벤트 참여") || false,
    externalContract:
      existingOrder?.selected_options?.includes("외부 계약") || false,
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

  // 가격 설정이 로드되면 기본 가격 설정
  useEffect(() => {
    if (pricingSettings && !existingOrder) {
      setStep3Data((prev) => ({
        ...prev,
        priceQuoted: pricingSettings.base_price,
      }));
    }
  }, [pricingSettings, existingOrder]);

  // 가격 계산
  useEffect(() => {
    if (!pricingSettings) return;

    // 외부 계약일 경우 가격은 0원
    if (step3Data.externalContract) {
      setStep3Data((prev) => ({ ...prev, priceQuoted: 0 }));
      return;
    }

    let total = pricingSettings.base_price;

    if (step3Data.fastDelivery) {
      total += pricingSettings.fast_delivery.price;
    }

    if (step3Data.portfolioPrivate) {
      total += pricingSettings.portfolio_private.price;
    }

    if (step3Data.reviewEvent) {
      total -= pricingSettings.review_event.discount;
    }

    setStep3Data((prev) => ({ ...prev, priceQuoted: total }));
  }, [
    step3Data.fastDelivery,
    step3Data.portfolioPrivate,
    step3Data.reviewEvent,
    step3Data.externalContract,
    pricingSettings,
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
    <div className="fixed inset-0 z-50 overflow-hidden sm:bg-black sm:bg-opacity-50 sm:flex sm:items-center sm:justify-center sm:p-4 sm:overflow-y-auto">
      <div className="bg-white h-full w-full overflow-y-auto sm:rounded-2xl sm:max-w-2xl sm:w-full sm:max-h-[90vh] sm:h-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode ? "주문 수정" : "TEMIS 맞춤형 시간표 제작 신청폼"}
              </h2>
              <div className="flex items-center mt-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 1
                      ? "bg-[#1e3a8a] text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  1
                </div>
                <div
                  className={`w-8 h-1 ${
                    currentStep >= 2 ? "bg-[#1e3a8a]" : "bg-slate-200"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 2
                      ? "bg-[#1e3a8a] text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  2
                </div>
                <div
                  className={`w-8 h-1 ${
                    currentStep >= 3 ? "bg-[#1e3a8a]" : "bg-slate-200"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 3
                      ? "bg-[#1e3a8a] text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  3
                </div>
                <div
                  className={`w-8 h-1 ${
                    currentStep >= 4 ? "bg-[#1e3a8a]" : "bg-slate-200"
                  }`}
                ></div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 4
                      ? "bg-[#1e3a8a] text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  4
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6">
          {currentStep === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              {/* 가격 안내 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-[#1e3a8a] mb-2 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  TEMIS 샘플 커미션 예약 안내
                </h3>
                <div className="text-sm text-slate-700 space-y-1">
                  <p>
                    시간표 제작의 기본 단가는 <strong>8만원</strong>입니다.
                  </p>
                  <p>
                    후기 작성 이벤트 참여시 <strong>1만원 할인</strong> 됩니다.
                  </p>
                  <p>업글이 완료 되어야 작업이 착수 됩니다.</p>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                    placeholder="활동명과 SNS 주소를 입력해주세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                    placeholder="연락 가능한 이메일 또는 디스코드를 입력해주세요"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium"
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
                    기본적인 진행 방법은 레퍼런스 확인 → 디자인 → 디자인
                    수정(기본 3회) → 웹 제작 → 완성 입니다!
                  </p>
                  <p>
                    작업 시간 약 2주 뒤 배달될 것, 정상 기준 3~4주가 소요됩니다.
                  </p>
                  <p>
                    원하는 디자인이 명확하지 않으신 분은 오마카세 요청을
                    추천드립니다!
                  </p>
                  <p>(디자인이 대부분 1주 사이로 나갑니다.)</p>
                  <p>
                    단, 오마카세 요청시 <strong>1회만 수정</strong>의 기준
                    합니다 (다 다시 만들어 달라는 수정은 불가능)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                    placeholder="필요한 시간표 내용, 스케줄 등을 자세히 작성해주세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    버튜버 캐릭터 사진을 첨부해주세요 *
                  </label>
                  <p className="text-xs text-slate-600 mb-3">
                    지원되는 파일을 최대 5개까지 업로드하세요. 파일당 최대
                    크기는 1 GB입니다.
                  </p>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#1e3a8a] transition-colors">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-2">
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
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-2">
                        오마카세 아니요에 체크 제크하신 분 공지
                      </h4>
                      <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                        <li>이미지 위치 (첨독, 우측)</li>
                        <li>내용 입력 칸의 형태 (정사각형, 가로형 등)</li>
                        <li>휴일의 표기 방식</li>
                        <li>시간표 상단에 들어갈 제목 문구</li>
                      </ul>
                      <p className="text-xs text-slate-500 mt-2">
                        (예: 이번 주 스케줄, 시간표, Schedule 등)
                      </p>
                      <p className="text-sm text-slate-600 mt-2">
                        원하시는 디자인요소가 있다면 모든 작성 부탁 드립니다!
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                    placeholder="원하는 디자인 스타일, 색상, 키워드 등을 입력해주세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    원하시는 디자인 시안이나 레퍼런스를 준비해주신 분에
                    올려주세요
                  </label>
                  <p className="text-xs text-slate-600 mb-3">
                    지원되는 파일을 최대 10개까지 업로드하세요. 파일당 최대
                    크기는 100 MB입니다.
                  </p>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#1e3a8a] transition-colors">
                    <Palette className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-2">
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
                      className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
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
                  className="border border-slate-300 px-6 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                >
                  이전
                </button>
                <button
                  type="submit"
                  className="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium"
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
              </div>

              {loadingPricing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a] mx-auto"></div>
                  <p className="text-slate-600 mt-2">
                    가격 정보를 불러오는 중...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 기본 가격 표시 */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-900">
                        기본 제작비
                      </span>
                      <span className="text-lg font-bold text-[#1e3a8a]">
                        ₩{pricingSettings?.base_price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 추가 옵션들 */}
                  <div className="space-y-3">
                    {/* 빠른 마감 옵션 */}
                    {pricingSettings?.fast_delivery.enabled && (
                      <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                        step3Data.externalContract
                          ? "border-slate-100 bg-slate-25 opacity-50 cursor-not-allowed"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}>
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
                            className="mr-3 h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a] border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div>
                            <div className={`font-medium ${
                              step3Data.externalContract ? "text-slate-400" : "text-slate-900"
                            }`}>
                              {pricingSettings.fast_delivery.description}
                            </div>
                            <div className={`text-sm ${
                              step3Data.externalContract ? "text-slate-300" : "text-slate-600"
                            }`}>
                              <p>맨 앞 순서로 작업을 진행합니다</p>
                              <p>일주일 안에 완성됩니다</p>
                            </div>
                          </div>
                        </div>
                        <span className={`font-bold ${
                          step3Data.externalContract ? "text-slate-400" : "text-[#1e3a8a]"
                        }`}>
                          +₩
                          {pricingSettings.fast_delivery.price.toLocaleString()}
                        </span>
                      </label>
                    )}

                    {/* 포트폴리오 비공개 옵션 */}
                    {pricingSettings?.portfolio_private.enabled && (
                      <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                        step3Data.externalContract
                          ? "border-slate-100 bg-slate-25 opacity-50 cursor-not-allowed"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={step3Data.portfolioPrivate}
                            disabled={step3Data.externalContract}
                            onChange={(e) =>
                              setStep3Data((prev) => ({
                                ...prev,
                                portfolioPrivate: e.target.checked,
                              }))
                            }
                            className="mr-3 h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a] border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div>
                            <div className={`font-medium ${
                              step3Data.externalContract ? "text-slate-400" : "text-slate-900"
                            }`}>
                              {pricingSettings.portfolio_private.description}
                            </div>
                            <div className={`text-sm ${
                              step3Data.externalContract ? "text-slate-300" : "text-slate-600"
                            }`}>
                              포트폴리오에 공개하지 않습니다
                            </div>
                          </div>
                        </div>
                        <span className={`font-bold ${
                          step3Data.externalContract ? "text-slate-400" : "text-[#1e3a8a]"
                        }`}>
                          +₩
                          {pricingSettings.portfolio_private.price.toLocaleString()}
                        </span>
                      </label>
                    )}

                    {/* 후기 이벤트 참여 옵션 */}
                    {pricingSettings?.review_event.enabled && (
                      <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                        step3Data.externalContract
                          ? "border-slate-100 bg-slate-25 opacity-50 cursor-not-allowed"
                          : "border-green-200 hover:bg-green-50 bg-green-25"
                      }`}>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={step3Data.reviewEvent}
                            disabled={step3Data.externalContract}
                            onChange={(e) =>
                              setStep3Data((prev) => ({
                                ...prev,
                                reviewEvent: e.target.checked,
                              }))
                            }
                            className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div>
                            <div className={`font-medium ${
                              step3Data.externalContract ? "text-slate-400" : "text-green-800"
                            }`}>
                              {pricingSettings.review_event.description}
                            </div>
                            <div className={`text-sm ${
                              step3Data.externalContract ? "text-slate-300" : "text-green-600"
                            }`}>
                              SNS에 후기를 작성해주시면 할인됩니다
                            </div>
                          </div>
                        </div>
                        <span className={`font-bold ${
                          step3Data.externalContract ? "text-slate-400" : "text-green-600"
                        }`}>
                          -₩
                          {pricingSettings.review_event.discount.toLocaleString()}
                        </span>
                      </label>
                    )}

                    {/* 외부 계약 옵션 */}
                    <label className="flex items-center justify-between p-4 border border-purple-200 rounded-lg hover:bg-purple-50 cursor-pointer bg-purple-25">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={step3Data.externalContract}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setStep3Data((prev) => ({
                              ...prev,
                              externalContract: isChecked,
                              // 외부 계약 선택 시 다른 옵션들 해제
                              ...(isChecked && {
                                fastDelivery: false,
                                portfolioPrivate: false,
                                reviewEvent: false,
                              }),
                            }))
                          }}
                          className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                        />
                        <div>
                          <div className="font-medium text-purple-800">
                            외부 계약
                          </div>
                          <div className="text-sm text-purple-600">
                            외부에서 별도로 계약한 경우 선택해주세요
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-purple-600">
                        별도 협의
                      </span>
                    </label>
                  </div>

                  {/* 총 금액 표시 */}
                  <div className="bg-[#1e3a8a] text-white p-6 rounded-lg">
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
                  className="border border-slate-300 px-6 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loadingPricing}
                  className="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
                >
                  다음
                </button>
              </div>
            </form>
          ) : currentStep === 4 ? (
            <form onSubmit={handleStep4Submit} className="space-y-6">
              {/* 송금 안내 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-[#1e3a8a] mb-2 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  송금 계좌 정보
                </h3>
                <div className="text-sm text-slate-700 space-y-1">
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
              <div className="p-3 bg-slate-50 rounded-lg">
                <h4 className="font-medium mb-2 text-slate-900">신청자 정보</h4>
                <div className="text-sm text-slate-600 space-y-1">
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
                <label className="block text-sm font-medium mb-1 text-slate-700">
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentStep(3);
                  }}
                  className="border border-slate-300 px-6 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium"
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
