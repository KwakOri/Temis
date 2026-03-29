import React from 'react';

import { TimeTableProvider } from '@/contexts/TimeTableContext';
import { TimeTableDesignGuideProvider } from '@/contexts/TimeTableDesignGuideContext';
import { useV2TemplateRenderConfigContext } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { useTimeTableEditor } from '@/hooks';
import { TTheme } from '@/types/time-table/theme';
import { getPlaceholders } from '@/utils/time-table/data';
import { useMemo } from 'react';

import { isGuideEnabled } from '@/utils/time-table/data';
import V2TimeTableContent from '../content/V2TimeTableContent';
import V2TimeTableForm from '../form/V2TimeTableForm';
import V2TimeTableInputList from '../form/V2TimeTableInputList';
import V2Loading from '../shared/V2Loading';
import V2TimeTableDesignGuideController from '../tools/V2TimeTableDesignGuideController';
import V2MobileHeader from './V2MobileHeader';
import V2TimeTableControls from './V2TimeTableControls';
import V2TimeTablePreview from './V2TimeTablePreview';

const useV2TemplateEditorSettings = () => {
  const { renderConfig } = useV2TemplateRenderConfigContext();

  const cardInputConfig = renderConfig.cardInputConfig;
  const weekdayOption = renderConfig.weekdayOption;
  const captureSize = renderConfig.templateSize;
  const profileSize = renderConfig.cardSizes.profile;
  const defaultTheme = (renderConfig.defaultTheme || 'first') as TTheme;

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
  if (!isInitialized || state.weekDates.length === 0) return <V2Loading />;

  return (
    <div className="w-full h-full flex flex-col">
      {/* 데스크탑 버전 - TimeTableControls (뒤로가기 + 배율 조절 통합) */}
      {!state.isMobile && <V2TimeTableControls />}

      {/* 모바일 버전 - 상단 헤더에 뒤로가기 + 배율 조절 */}
      {state.isMobile && <V2MobileHeader />}

      <div className="flex flex-col md:flex-row md:items-center min-h-0 gap-0 h-full">
        <V2TimeTablePreview>
          <V2TimeTableContent currentTheme={currentTheme} data={data} />
        </V2TimeTablePreview>
        <V2TimeTableForm
          isArtist={true}
          onReset={resetData}
          addons={isGuideEnabled && <V2TimeTableDesignGuideController />}
          cropWidth={profileSize.width}
          cropHeight={profileSize.height}
        >
          <V2TimeTableInputList
            cardInputConfig={cardInputConfig}
            placeholders={placeholders}
            data={data}
            onDataChange={updateData}
            weekdayOption={weekdayOption}
          />
        </V2TimeTableForm>
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
