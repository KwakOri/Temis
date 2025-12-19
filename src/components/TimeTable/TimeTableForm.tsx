import ImageCropModal from "@/components/ImageCropModal";
import ImageSaveModal from "@/components/TimeTable/ImageSaveModal";
import MondaySelector from "@/components/TimeTable/MondaySelector";
import ResetButton from "@/components/TimeTable/ResetButton";
import TimeTableFormTabs from "@/components/TimeTable/TimeTableFormTabs";
import { useTimeTable } from "@/contexts/TimeTableContext";
import {
  useHasActiveTeam,
  useSaveTeamScheduleFromDynamicCards,
} from "@/hooks/query/useTeam";
import { OptionType } from "@/hooks/useTimeTableState";
import { TeamService } from "@/services/teamService";
import { CroppedAreaPixels } from "@/types/image-edit";
import { TDefaultCard } from "@/types/time-table/data";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import React, { Fragment, PropsWithChildren, useRef, useState } from "react";
import { Point } from "react-easy-crop";
interface TimeTableFormProps {
  isArtist?: boolean;
  isMemo?: boolean;
  saveable?: boolean;
  addons?: React.ReactNode;
  onReset: () => void;
  cropWidth?: number;
  cropHeight?: number;
  teamData?: TDefaultCard[]; // 팀 시간표 저장을 위한 데이터
  multiSelect?: boolean; // true: 여러 버튼 동시 활성화 가능, false: 최대 1개만 활성화 가능
}

interface ProfileOptionButtonProps {
  handler: () => void;

  isChecked: boolean;
  label: string;
}
const ProfileOptionButton = ({
  handler,
  isChecked,
  label,
}: ProfileOptionButtonProps) => {
  return (
    <button
      onClick={handler}
      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-colors ${
        isChecked
          ? "bg-[#3E4A82] text-white "
          : " text-gray-500 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
};

const TimeTableForm = ({
  addons,
  children,
  onReset,
  teamData,
  cropWidth = 400,
  cropHeight = 400,
  isArtist = true,
  isMemo = false,
  saveable = true,
  multiSelect = false,
}: PropsWithChildren<TimeTableFormProps>) => {
  const { state, actions } = useTimeTable();
  const pathname = usePathname();

  // 사용자가 활성화된 팀에 속해있는지 확인
  const { data: isTeam = false } = useHasActiveTeam();

  const saveTeamScheduleMutation = useSaveTeamScheduleFromDynamicCards();

  // 현재 경로에서 template ID 추출하고 팀 템플릿인지 확인
  const templateId = pathname?.split("/").pop();
  const { data: isTeamCalendar = false } = useQuery({
    queryKey: ["isTeamCalendar", templateId],
    queryFn: async () => {
      if (!templateId) return false;

      try {
        const response = await fetch(`/api/team-template/check/${templateId}`);
        if (!response.ok) return false;

        const data = await response.json();
        return data.isTeamTemplate || false;
      } catch (error) {
        console.error("Error checking team calendar:", error);
        return false;
      }
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });

  const {
    profileText,
    memoText,
    mondayDateStr,
    imageSrc,
    isProfileTextVisible,
    isMemoTextVisible,
    selectedOptions,
    captureSize,
  } = state;
  const {
    handleProfileTextChange,
    handleMemoTextChange,
    handleDateChange,
    updateImageSrc,
    handleOptionClick,
    downloadImage,
  } = actions;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("main");
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleEditClick = () => {
    const editData = actions.startEditMode();
    if (editData && editData.originalImageSrc) {
      setSelectedImage(editData.originalImageSrc);
      setShowCropModal(true);
    } else {
      alert("편집할 이미지가 없습니다.");
    }
  };

  const handleImageDelete = () => {
    updateImageSrc(null);
    actions.resetImageEditData();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PNG 파일인지 확인
    const isPNG = file.type === "image/png";

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;

      if (isPNG) {
        // PNG 파일인 경우 그대로 사용 (투명도 보존)
        setSelectedImage(result);
        actions.setOriginalImage(result, cropWidth, cropHeight);
        setShowCropModal(true);
      } else {
        // PNG가 아닌 경우에만 canvas를 사용해서 PNG로 변환
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            setSelectedImage(result);
            actions.setOriginalImage(result, cropWidth, cropHeight);
            setShowCropModal(true);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;

          // 투명 배경 설정
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // PNG 형식으로 변환 (투명도 보존)
          const pngDataUrl = canvas.toDataURL("image/png");
          setSelectedImage(pngDataUrl);
          actions.setOriginalImage(pngDataUrl, cropWidth, cropHeight);
          setShowCropModal(true);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);

    // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = (
    croppedImageSrc: string,
    croppedAreaPixels?: CroppedAreaPixels,
    crop?: Point,
    zoom?: number,
    rotation?: number
  ) => {
    updateImageSrc(croppedImageSrc);

    // 편집 데이터 저장
    if (selectedImage && croppedAreaPixels) {
      actions.saveCroppedImage(croppedImageSrc, croppedAreaPixels);

      // 현재 편집 정보도 업데이트
      if (crop && zoom !== undefined && rotation !== undefined) {
        actions.updateEditProgress(crop, zoom, rotation);
      }
    }

    setShowCropModal(false);
    setSelectedImage(null);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImage(null);
  };

  const onChangeActiveTab = (nextTab: string) => {
    setActiveTab(nextTab);
  };

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleSaveModalClose = () => {
    setShowSaveModal(false);
  };

  const handleImageSave = async (width: number, height: number) => {
    try {
      // 이미지 다운로드
      downloadImage(width, height);

      // 활성화된 팀이 있고 팀 캘린더가 아닐 때만 자동으로 팀 시간표에도 저장
      if (isTeam && !isTeamCalendar && saveable && teamData) {
        const weekStartDate =
          TeamService.getWeekStartDateFromString(mondayDateStr);

        // 팀 시간표 저장 - mutation 완료까지 대기
        await saveTeamScheduleMutation.mutateAsync({
          weekStartDate,
          dynamicCards: teamData,
        });

        // 저장 완료 후 잠시 대기하여 캐시 무효화가 완료되도록 함
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("팀 시간표 자동 저장 실패:", error);
      // 에러를 다시 던져서 ImageSaveModal에서 처리할 수 있도록 함
      throw error;
    }
  };

  const ProfileOptionButtons = [
    {
      handler: () => handleOptionClick("profile", multiSelect),
      isEnabled: isArtist,
      isChecked: selectedOptions.includes("profile"),
      label: "이름",
      optionType: "profile" as OptionType,
    },
    {
      handler: () => handleOptionClick("memo", multiSelect),
      isEnabled: isMemo,
      isChecked: selectedOptions.includes("memo"),
      label: "메모",
      optionType: "memo" as OptionType,
    },
    {
      handler: () => handleOptionClick("none", multiSelect),
      isEnabled: true,
      isChecked: selectedOptions.includes("none"),
      label: "없음",
      optionType: "none" as OptionType,
    },
  ];

  const renderMainSettings = () => (
    <div className="space-y-6">
      {/* 프로필 섹션 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-800">프로필</h3>

          {/* 텍스트 표시 옵션 선택 */}

          {(isMemo || isArtist) && (
            <div className="flex space-x-2 bg-gray-200 rounded-md p-1">
              {ProfileOptionButtons.map(
                (button) =>
                  button.isEnabled && (
                    <ProfileOptionButton
                      key={button.label}
                      handler={button.handler}
                      isChecked={button.isChecked}
                      label={button.label}
                    />
                  )
              )}
            </div>
          )}
        </div>
        {/* 텍스트 입력 필드 */}
        {isArtist && isProfileTextVisible && (
          <input
            id="profile-text"
            value={profileText}
            onChange={handleProfileTextChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="이름을 입력해 주세요"
          />
        )}
        {isMemo && isMemoTextVisible && (
          <textarea
            id="memo-text"
            value={memoText}
            onChange={handleMemoTextChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="메모를 입력해 주세요"
            rows={3}
          />
        )}
        <div className="space-y-2">
          {/* 이미지 업로드/교체 버튼 */}

          {/* 이미지가 있을 때 편집/삭제 버튼 */}

          <div className="flex gap-2">
            <button
              onClick={handleUploadClick}
              className="w-full bg-[#3E4A82] text-white py-2 rounded-md text-sm font-medium hover:bg-[#2b2f4d] transition"
            >
              {imageSrc ? "이미지 변경" : "새 이미지 업로드"}
            </button>

            {imageSrc && (
              <Fragment>
                <button
                  onClick={handleEditClick}
                  className="w-full bg-[#3E4A82] text-white py-2 rounded-md text-sm font-medium hover:bg-[#2b2f4d] transition"
                >
                  이미지 편집
                </button>
                <button
                  onClick={handleImageDelete}
                  className="px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition flex items-center justify-center"
                  title="이미지 삭제"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </Fragment>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* 시간표 섹션 */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-800">시간표</h3>
        <MondaySelector
          mondayDateStr={mondayDateStr}
          onDateChange={handleDateChange}
        />
        {children}
      </div>
    </div>
  );

  const renderAddonsContent = () => (addons ? <>{addons}</> : null);

  return (
    <>
      <div className="md:h-full min-h-0 md:max-w-[400px] md:min-w-[300px] md:w-1/4 h-full">
        <div className="h-full shrink-0 flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full ">
          <div className="flex-1 flex flex-col min-h-0">
            <TimeTableFormTabs
              activeTab={activeTab}
              onChangeActiveTab={onChangeActiveTab}
              isAddons={!!addons}
            />
            <div className="flex-1 overflow-y-auto p-4 h-full">
              {activeTab === "main" && renderMainSettings()}
              {activeTab === "addons" && renderAddonsContent()}
            </div>
          </div>

          <div className="p-4 border-t border-gray-300 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={
                  saveable
                    ? handleSaveClick
                    : () => {
                        alert("PLAYGROUND에서는 제공되지 않는 기능입니다.");
                      }
                }
                className="flex-1 bg-[#2b2f4d] text-white py-3 rounded-md text-base font-bold hover:bg-gray-800 transition"
              >
                이미지로 저장
              </button>
              <ResetButton onReset={onReset} />
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 크롭 모달 */}
      {selectedImage && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropCancel}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          cropWidth={cropWidth}
          cropHeight={cropHeight}
          initialCrop={state.imageEditData?.crop}
          initialZoom={state.imageEditData?.zoom}
          initialRotation={state.imageEditData?.rotation}
          isEditMode={
            !!state.imageEditData &&
            selectedImage === state.imageEditData.originalImageSrc
          }
        />
      )}

      {/* 이미지 저장 배율 선택 모달 */}
      <ImageSaveModal
        isTeamCalendar={isTeamCalendar}
        isOpen={showSaveModal}
        onClose={handleSaveModalClose}
        onSave={handleImageSave}
        templateSize={captureSize}
        isTeam={isTeam}
        mondayDateStr={mondayDateStr}
      />
    </>
  );
};

export default TimeTableForm;
