import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import {
  useTemplateRuntimeData,
  useTemplateRuntimeUIContext,
} from "@/contexts/v2/template-runtime-ui-context";
import { cn } from "@/lib/utils";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import { CardInputConfig, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { Area, Point } from "react-easy-crop";
import React from "react";
import V2ImageCropModal from "../modals/image-crop-modal";
import RuntimeInputList from "./form-ui/runtime-input-list";
import RuntimeFormTabs from "./form-ui/runtime-form-tabs";
import RuntimeWeekSelector from "./form-ui/runtime-week-selector";
import TextRenderer from "./form-ui/field-renderers/text-renderer";
import TextareaRenderer from "./form-ui/field-renderers/textarea-renderer";
import RuntimeFormCard from "./form-ui/ui/form-card";
import RuntimeProfileImageSelector from "./form-ui/ui/profile-image-selector";
import { v2_resolveStructureCapabilities } from "@/utils/v2/template-render-config";

interface V2RuntimeFormProps {
  embedded?: boolean;
}

const V2RuntimeForm: React.FC<V2RuntimeFormProps> = ({ embedded = false }) => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const {
    data,
    updateData,
    globalData,
    updateGlobalData,
    currentTheme,
    updateTheme,
  } = useTemplateRuntimeContext();
  const {
    memoText,
    imageSrc,
    isTopObjectVisible,
    isArtistVisible,
    isMemoTextVisible,
    updateMemoText,
    updateImageSrc,
    handleOptionClick,
    mondayDateStr,
    updateMondayDate,
  } = useTemplateRuntimeData();
  const { actions: uiActions } = useTemplateRuntimeUIContext();
  const [activeTab, setActiveTab] = React.useState("main");
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  const themes = React.useMemo(() => {
    const baseThemes = Array.isArray(renderConfig.themes)
      ? renderConfig.themes
      : [];
    if (baseThemes.length === 0) return [renderConfig.defaultTheme];
    if (!baseThemes.includes(renderConfig.defaultTheme)) {
      return [...baseThemes, renderConfig.defaultTheme];
    }
    return baseThemes;
  }, [renderConfig.defaultTheme, renderConfig.themes]);

  const showThemeSelector = React.useMemo(() => {
    const isEnabled = Boolean(renderConfig.editorOptions?.enableThemeSelection);
    return isEnabled && themes.length >= 2;
  }, [renderConfig.editorOptions, themes.length]);

  const offlineMemoEnabled = Boolean(
    renderConfig.timetable.statusOptions.offlineMemo
  );
  const structureCapabilities = React.useMemo(
    () => v2_resolveStructureCapabilities(renderConfig),
    [renderConfig]
  );
  const showTopObjectControls = Boolean(
    structureCapabilities.objects.topObject.enabled &&
      structureCapabilities.objects.topObject.mode === "statefulAsset"
  );
  const hasArtistCapability = React.useMemo(() => {
    const nodes = renderConfig.graph.nodes ?? {};
    return Boolean(
      nodes["scene-artist-group"] ||
        nodes["scene-artist-text"] ||
        nodes["scene-artist-object"] ||
        renderConfig.formSchema.fields.some(
          (field) => field.scope === "global" && field.key === "artistText"
        )
    );
  }, [renderConfig.formSchema.fields, renderConfig.graph.nodes]);
  const hasProfileCapability = React.useMemo(() => {
    const nodes = renderConfig.graph.nodes ?? {};
    return Boolean(
      nodes["scene-profile"] ||
        nodes["scene-profile-image"] ||
        nodes["scene-profile-frame"]
    );
  }, [renderConfig.graph.nodes]);
  const hasMemoCapability = React.useMemo(() => {
    const nodes = renderConfig.graph.nodes ?? {};
    return Boolean(
      nodes["scene-memo"] ||
        nodes["scene-memo-object"] ||
        nodes["scene-memo-text"] ||
        renderConfig.formSchema.fields.some(
          (field) => field.scope === "global" && field.key === "memoText"
        )
    );
  }, [renderConfig.formSchema.fields, renderConfig.graph.nodes]);
  const showArtistControls = Boolean(
    renderConfig.editorOptions.isArtist && hasArtistCapability
  );
  const showMemoControls = Boolean(
    renderConfig.editorOptions.isMemo && hasMemoCapability
  );

  const cardInputConfig = React.useMemo<CardInputConfig>(() => {
    return {
      fields: renderConfig.formSchema.fields
        .filter(
          (field) =>
            offlineMemoEnabled ||
            !(field.scope === "card" && field.key === "offlineMemo")
        )
        .filter((field) => !(field.scope === "global" && field.key === "artistText"))
        .map((field) => ({
          key: field.key,
          scope: field.scope,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder || "",
          required: field.required,
          maxLength: field.maxLength,
          options: field.options?.map((option) => ({
            value: option.value,
            label: option.label,
          })),
          defaultValue: field.defaultValue,
        })),
      showLabels: renderConfig.formSchema.showLabels ?? true,
      offlineToggle: renderConfig.formSchema.offlineToggle,
    };
  }, [offlineMemoEnabled, renderConfig.formSchema]);

  const placeholders = React.useMemo<TPlaceholders>(() => {
    const fieldPlaceholders: Record<string, string> = {};
    renderConfig.formSchema.fields.forEach((field) => {
      fieldPlaceholders[field.key] = field.placeholder || "";
    });

    return fieldPlaceholders;
  }, [renderConfig.formSchema.fields]);

  const artistField = React.useMemo(
    () =>
      renderConfig.formSchema.fields.find(
        (field) => field.scope === "global" && field.key === "artistText"
      ),
    [renderConfig.formSchema.fields]
  );
  const artistTextValue =
    typeof globalData?.artistText === "string"
      ? globalData.artistText
      : typeof globalData?.artistText === "number"
        ? String(globalData.artistText)
        : "";

  const handleProfileImageSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const openCropModal = (imageDataUrl: string) => {
        setSelectedImage(imageDataUrl);
        uiActions.setOriginalImage(imageDataUrl, 400, 400);
        setShowCropModal(true);
      };

      const isPNG = file.type === "image/png";
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;

        if (isPNG) {
          openCropModal(result);
        } else {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              openCropModal(result);
              return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            openCropModal(canvas.toDataURL("image/png"));
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);

      event.target.value = "";
    },
    [uiActions]
  );

  const handleCropComplete = React.useCallback(
    (
      croppedImageSrc: string,
      croppedAreaPixels?: Area,
      crop?: Point,
      zoom?: number,
      rotation?: number
    ) => {
      updateImageSrc(croppedImageSrc);

      if (selectedImage && croppedAreaPixels) {
        uiActions.saveCroppedImage(croppedImageSrc, croppedAreaPixels);
        if (crop && zoom !== undefined && rotation !== undefined) {
          uiActions.updateEditProgress(crop, zoom, rotation);
        }
      }

      setShowCropModal(false);
      setSelectedImage(null);
    },
    [selectedImage, uiActions, updateImageSrc]
  );

  const handleCropCancel = React.useCallback(() => {
    setShowCropModal(false);
    setSelectedImage(null);
  }, []);

  return (
    <>
      <aside
        className={cn(
          "h-full overflow-y-auto bg-timetable-form-bg text-gray-800",
          embedded ? "border-0" : "border-l border-[#d9cec4]"
        )}
      >
        <RuntimeFormTabs
          activeTab={activeTab}
          onChangeActiveTab={setActiveTab}
          isAddons={showTopObjectControls || showArtistControls || showMemoControls}
        />

        <div className="space-y-4 p-4">
          {activeTab === "main" ? (
            <div className="space-y-4">
              {showThemeSelector ? (
                <section className="rounded-[16px] border-2 border-timetable-card-border bg-timetable-card-bg p-3 shadow-[0_2px_3.4px_rgba(0,0,0,0.08)]">
                  <label className="block text-xs font-semibold text-gray-600">
                    테마 선택
                  </label>
                  <select
                    value={currentTheme}
                    onChange={(event) =>
                      updateTheme(event.target.value as TTheme)
                    }
                    className="mt-2 h-10 w-full rounded-lg bg-timetable-input-bg px-3 text-sm text-gray-800 outline-none focus:shadow-[inset_0_0_0_2px_#FF9F45]"
                  >
                    {themes.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </section>
              ) : null}

              {structureCapabilities.objects.weekDates.enabled ? (
                <RuntimeWeekSelector
                  mondayDateStr={mondayDateStr}
                  onDateChange={updateMondayDate}
                />
              ) : null}

              <RuntimeInputList
                data={data}
                onDataChange={updateData}
                globalData={globalData}
                onGlobalDataChange={updateGlobalData}
                weekdayOption={renderConfig.weekdayOption}
                cardInputConfig={cardInputConfig}
                placeholders={placeholders}
                isMultiple={renderConfig.editorOptions.isMultiple}
                maxStreamingTimeByDay={Math.max(
                  1,
                  renderConfig.editorOptions.maxStreamingTimeByDay
                )}
                isOfflineMemo={offlineMemoEnabled}
                size="sm"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {showTopObjectControls ? (
                <RuntimeFormCard
                  label="상단 오브젝트"
                  isActive={isTopObjectVisible}
                  toggleIsActive={() => handleOptionClick("topObject", true)}
                  size="sm"
                >
                  <p className="text-xs text-gray-500">
                    top object on/off 오브젝트 표시를 전환합니다.
                  </p>
                </RuntimeFormCard>
              ) : null}

              {hasProfileCapability ? (
                <RuntimeProfileImageSelector
                  size="sm"
                  imageSrc={imageSrc}
                  onImageChange={handleProfileImageSelect}
                />
              ) : null}

              {showArtistControls ? (
                <RuntimeFormCard
                  label="아티스트"
                  isActive={isArtistVisible}
                  toggleIsActive={() => handleOptionClick("artist", true)}
                  size="sm"
                >
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      artist on/off 오브젝트 표시를 전환합니다.
                    </p>
                    <TextRenderer
                      height="sm"
                      value={artistTextValue}
                      handleTextChange={(nextValue: string) =>
                        updateGlobalData({
                          ...globalData,
                          artistText: nextValue,
                        })
                      }
                      placeholder={
                        artistField?.placeholder ||
                        renderConfig.artistTextPlaceholder ||
                        "아티스트명을 입력해 주세요"
                      }
                    />
                  </div>
                </RuntimeFormCard>
              ) : null}

              {showMemoControls ? (
                <RuntimeFormCard
                  label="주간 메모"
                  isActive={isMemoTextVisible}
                  toggleIsActive={() => handleOptionClick("memo", true)}
                  size="sm"
                >
                  <TextareaRenderer
                    value={memoText}
                    handleTextareaChange={updateMemoText}
                    placeholder="메모를 입력해 주세요"
                    rows={3}
                  />
                </RuntimeFormCard>
              ) : null}
            </div>
          )}

          <section className="rounded-[16px] border-2 border-timetable-card-border bg-timetable-card-bg p-3 shadow-[0_2px_3.4px_rgba(0,0,0,0.08)]">
            <p className="text-xs text-gray-500">
              작성한 값은 자동 저장되며, 즉시 프리뷰에 반영됩니다.
            </p>
          </section>
        </div>
      </aside>

      {selectedImage ? (
        <V2ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropCancel}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          cropWidth={400}
          cropHeight={400}
        />
      ) : null}
    </>
  );
};

export default V2RuntimeForm;
