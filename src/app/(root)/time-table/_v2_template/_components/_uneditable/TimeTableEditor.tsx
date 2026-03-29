import React from "react";

import Loading from "@/components/Loading";
import MobileHeader from "@/components/TimeTable/MobileHeader";
import TimeTableControls from "@/components/TimeTable/TimeTableControls";
import TimeTableForm from "@/components/TimeTable/TimeTableForm";
import TimeTablePreview from "@/components/TimeTable/TimeTablePreview";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { TimeTableProvider } from "@/contexts/TimeTableContext";
import { TimeTableDesignGuideProvider } from "@/contexts/TimeTableDesignGuideContext";
import { useTimeTableEditor } from "@/hooks";
import { TTheme } from "@/types/time-table/theme";
import { getPlaceholders } from "@/utils/time-table/data";
import { useMemo } from "react";

import TimeTableInputList from "@/components/TimeTable/FixedComponents/TimeTableInputList";
import TimeTableDesignGuideController from "@/components/tools/TimeTableDesignGuideController";
import { isGuideEnabled } from "@/utils/time-table/data";
import TimeTableContent from "./TimeTableContent";

const useV2TemplateEditorSettings = () => {
  const { renderConfig } = useV2TemplateRenderConfigContext();

  const cardInputConfig = renderConfig.cardInputConfig;
  const weekdayOption = renderConfig.weekdayOption;
  const captureSize = renderConfig.templateSize;
  const profileSize = renderConfig.cardSizes.profile;
  const defaultTheme = (renderConfig.defaultTheme || "first") as TTheme;

  const placeholders = useMemo(
    () =>
      getPlaceholders({
        cardInputConfig,
        profilePlaceholder: renderConfig.profileTextPlaceholder,
      }),
    [cardInputConfig, renderConfig.profileTextPlaceholder]
  );

  return {
    cardInputConfig,
    weekdayOption,
    captureSize,
    profileSize,
    defaultTheme,
    placeholders,
  };
};

// TimeTableEditor의 내부 컴포넌트 (Context Provider 내부)
const TimeTableEditorContent: React.FC = () => {
  const {
    cardInputConfig,
    defaultTheme,
    captureSize,
    profileSize,
    placeholders,
    weekdayOption,
  } = useV2TemplateEditorSettings();

  // 통합 상태 관리 훅 사용 - CardInputConfig 주입

  const { state, data, updateData, currentTheme, resetData, isInitialized } =
    useTimeTableEditor({
      cardInputConfig,
      defaultTheme: defaultTheme,
      captureSize,
    });

  // 초기화되지 않았거나 주간 날짜가 로드되지 않았으면 로딩 표시
  if (!isInitialized || state.weekDates.length === 0) return <Loading />;

  return (
    <div className="w-full h-full flex flex-col">
      {/* 데스크탑 버전 - TimeTableControls (뒤로가기 + 배율 조절 통합) */}
      {!state.isMobile && <TimeTableControls />}

      {/* 모바일 버전 - 상단 헤더에 뒤로가기 + 배율 조절 */}
      {state.isMobile && <MobileHeader />}

      <div className="flex flex-col md:flex-row md:items-center min-h-0 gap-0 h-full">
        <TimeTablePreview>
          <TimeTableContent
            currentTheme={currentTheme}
            data={data}
          />
        </TimeTablePreview>
        <TimeTableForm
          isArtist={true}
          onReset={resetData}
          addons={isGuideEnabled && <TimeTableDesignGuideController />}
          cropWidth={profileSize.width}
          cropHeight={profileSize.height}
        >
          <TimeTableInputList
            cardInputConfig={cardInputConfig}
            placeholders={placeholders}
            data={data}
            onDataChange={updateData}
            weekdayOption={weekdayOption}
          />
        </TimeTableForm>
      </div>
    </div>
  );
};

// 메인 TimeTableEditor 컴포넌트 (Context Provider 래퍼)
const TimeTableEditor: React.FC = () => {
  const { cardInputConfig, defaultTheme, captureSize } =
    useV2TemplateEditorSettings();

  // 전역 상태는 통합 훅 내부에서 관리되므로 별도로 생성하지 않음
  // Context는 내부 컴포넌트에서 전역 상태를 받아서 제공
  const { state, actions } = useTimeTableEditor({
    cardInputConfig,
    defaultTheme: defaultTheme,
    captureSize,
  });

  const timeTableState = { state, actions };

  return (
    <TimeTableProvider value={timeTableState}>
      <TimeTableDesignGuideProvider>
        <TimeTableEditorContent />
      </TimeTableDesignGuideProvider>
    </TimeTableProvider>
  );
};

export default TimeTableEditor;
