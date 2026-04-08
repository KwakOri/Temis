import { FormCard } from '@/components/TimeTable/FixedComponents/FormCard';
import TimeTableProfileImageSelector from '@/components/TimeTable/TimeTableProfileImageSelector';
import TextRenderer from '@/components/TimeTable/fieldRenderer/TextRenderer';
import TextareaRenderer from '@/components/TimeTable/fieldRenderer/TextareaRenderer';
import { useTimeTable } from '@/contexts/TimeTableContext';
import { useTemplateRenderConfigContext } from '@/contexts/v2/template-render-config-context';
import { useTemplateEditorRuntimeContext } from '@/contexts/v2/template-editor-runtime-context';
import {
  useHasActiveTeam,
  useSaveTeamScheduleFromDynamicCards,
} from '@/hooks/query/useTeam';
import { TeamService } from '@/services/teamService';
import { CroppedAreaPixels } from '@/types/image-edit';
import { isGuideEnabled } from '@/utils/time-table/data';
import { SizeProps } from '@/utils/utils';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { Point } from 'react-easy-crop';
import V2ImageCropModal from '../modals/image-crop-modal';
import V2ImageSaveModal from '../modals/image-save-modal';
import V2TimeTableDesignGuideController from '../tools/design-guide-controller';
import V2MondaySelector from './monday-selector';
import V2ResetButton from './reset-button';
import V2TimeTableFormTabs from './template-form-tabs';
import V2TimeTableInputList from './template-input-list';

const V2TimeTableForm: React.FC = () => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const { data, resetData } = useTemplateEditorRuntimeContext();

  const teamData = data;
  const saveable = true;
  const isArtist = renderConfig.editorOptions.isArtist;
  const isMemo = false;
  const multiSelect = false;
  const size: SizeProps = 'sm';
  const cropWidth = renderConfig.cardSizes.profile.width;
  const cropHeight = renderConfig.cardSizes.profile.height;

  const { state, actions } = useTimeTable();
  const pathname = usePathname();

  const { data: isTeam = false } = useHasActiveTeam();
  const saveTeamScheduleMutation = useSaveTeamScheduleFromDynamicCards();

  const templateId = pathname?.split('/').pop();
  const { data: isTeamCalendar = false } = useQuery({
    queryKey: ['isTeamCalendar', templateId],
    queryFn: async () => {
      if (!templateId) return false;

      try {
        const response = await fetch(`/api/team-template/check/${templateId}`);
        if (!response.ok) return false;

        const responseData = await response.json();
        return responseData.isTeamTemplate || false;
      } catch (error) {
        console.error('Error checking team calendar:', error);
        return false;
      }
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    profileText,
    memoText,
    mondayDateStr,
    imageSrc,
    isProfileTextVisible,
    isMemoTextVisible,
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
  const [activeTab, setActiveTab] = useState('main');
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleEditClick = () => {
    const editData = actions.startEditMode();
    if (editData?.originalImageSrc) {
      setSelectedImage(editData.originalImageSrc);
      setShowCropModal(true);
      return;
    }
    alert('편집할 이미지가 없습니다.');
  };

  const handleImageDelete = () => {
    updateImageSrc(null);
    actions.resetImageEditData();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPNG = file.type === 'image/png';

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;

      if (isPNG) {
        setSelectedImage(result);
        actions.setOriginalImage(result, cropWidth, cropHeight);
        setShowCropModal(true);
      } else {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            setSelectedImage(result);
            actions.setOriginalImage(result, cropWidth, cropHeight);
            setShowCropModal(true);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const pngDataUrl = canvas.toDataURL('image/png');
          setSelectedImage(pngDataUrl);
          actions.setOriginalImage(pngDataUrl, cropWidth, cropHeight);
          setShowCropModal(true);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

    if (selectedImage && croppedAreaPixels) {
      actions.saveCroppedImage(croppedImageSrc, croppedAreaPixels);

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

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleSaveModalClose = () => {
    setShowSaveModal(false);
  };

  const handleImageSave = async (width: number, height: number) => {
    try {
      downloadImage(width, height);

      if (isTeam && !isTeamCalendar && saveable && teamData) {
        const weekStartDate =
          TeamService.getWeekStartDateFromString(mondayDateStr);

        await saveTeamScheduleMutation.mutateAsync({
          weekStartDate,
          dynamicCards: teamData,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('팀 시간표 자동 저장 실패:', error);
      throw error;
    }
  };

  const handleToggleProfileImage = () =>
    handleOptionClick('profile', multiSelect);
  const handleToggleMemo = () => handleOptionClick('memo', multiSelect);

  const renderMainSettings = () => (
    <div className="space-y-4">
      <h3 className="pl-1 font-bold text-lg text-gray-800">시간표</h3>

      <V2MondaySelector
        mondayDateStr={mondayDateStr}
        onDateChange={handleDateChange}
      />

      <TimeTableProfileImageSelector
        handleEditClick={handleEditClick}
        handleImageDelete={handleImageDelete}
        handleUploadClick={handleUploadClick}
        imageSrc={imageSrc}
        size={size}
      />

      {isArtist && (
        <FormCard
          size={size}
          isActive={isProfileTextVisible}
          toggleIsActive={handleToggleProfileImage}
          label="아티스트"
        >
          <TextRenderer
            height={size}
            value={profileText}
            placeholder={'이름을 입력해 주세요'}
            handleTextChange={handleProfileTextChange}
            maxLength={20}
            required={true}
          />
        </FormCard>
      )}

      {isMemo && (
        <FormCard
          size={size}
          isActive={isMemoTextVisible}
          toggleIsActive={handleToggleMemo}
          label="메모"
        >
          <TextareaRenderer
            value={memoText}
            placeholder={'메모를 입력해 주세요'}
            handleTextareaChange={handleMemoTextChange}
            maxLength={200}
            required={true}
          />
        </FormCard>
      )}

      <input
        ref={fileInputRef}
        id="file-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <h3 className="pl-1 font-bold text-lg text-gray-800">주간 시간표</h3>
      <V2TimeTableInputList size={size} />
    </div>
  );

  const showGuideController = isGuideEnabled;
  const renderAddonsContent = () =>
    showGuideController ? <V2TimeTableDesignGuideController /> : null;

  return (
    <>
      <div className="md:h-full min-h-0 md:max-w-[400px] md:min-w-[300px] md:w-1/4 h-full">
        <div className="v2-dark-form-theme h-full shrink-0 flex flex-col bg-gray-100 border-t-2 md:border-t-0 md:border-l-2 border-gray-300 w-full ">
          <div className="flex-1 flex flex-col min-h-0">
            <V2TimeTableFormTabs
              activeTab={activeTab}
              onChangeActiveTab={setActiveTab}
              isAddons={showGuideController}
            />
            <div className="flex-1 overflow-y-auto p-4 h-full bg-timetable-form-bg">
              {activeTab === 'main' && renderMainSettings()}
              {activeTab === 'addons' && renderAddonsContent()}
            </div>
          </div>

          <div className="p-4 border-t border-gray-300 bg-timetable-form-bg">
            <div className="flex gap-2">
              <button
                onClick={
                  saveable
                    ? handleSaveClick
                    : () => {
                        alert('PLAYGROUND에서는 제공되지 않는 기능입니다.');
                      }
                }
                className="flex-1 bg-timetable-primary text-white py-3 rounded-md text-base font-bold hover:bg-timetable-primary-hover transition"
              >
                이미지로 저장
              </button>
              <V2ResetButton onReset={resetData} />
            </div>
          </div>
        </div>
      </div>

      {selectedImage && (
        <V2ImageCropModal
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

      <V2ImageSaveModal
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

export default V2TimeTableForm;
