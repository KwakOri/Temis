import React, { useMemo } from 'react';

import { TimeTableDesignGuideProvider } from '@/contexts/TimeTableDesignGuideContext';
import { TimeTableProvider } from '@/contexts/TimeTableContext';
import { V2TimeTableEditorRuntimeProvider } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { useV2TemplateRenderConfigContext } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { useTimeTableEditor } from '@/hooks';
import { TTheme } from '@/types/time-table/theme';
import V2Loading from '../shared/V2Loading';
import V2MobileHeader from './V2MobileHeader';
import V2TimeTableControls from './V2TimeTableControls';
import V2TimeTablePreview from './V2TimeTablePreview';
import V2TimeTableForm from '../form/V2TimeTableForm';

const useV2TemplateEditorSettings = () => {
  const { renderConfig } = useV2TemplateRenderConfigContext();

  const cardInputConfig = renderConfig.cardInputConfig;
  const captureSize = renderConfig.templateSize;
  const defaultTheme = (renderConfig.defaultTheme || 'first') as TTheme;

  return {
    cardInputConfig,
    captureSize,
    defaultTheme,
  };
};

const V2TimeTableEditor: React.FC = () => {
  const { cardInputConfig, captureSize, defaultTheme } =
    useV2TemplateEditorSettings();

  const {
    state,
    actions,
    data,
    updateData,
    currentTheme,
    resetData,
    isInitialized,
  } = useTimeTableEditor({
    cardInputConfig,
    defaultTheme,
    captureSize,
  });

  const timeTableState = useMemo(
    () => ({ state, actions }),
    [actions, state]
  );

  const runtimeValue = useMemo(
    () => ({
      data,
      updateData,
      currentTheme,
      resetData,
    }),
    [currentTheme, data, resetData, updateData]
  );

  return (
    <TimeTableProvider value={timeTableState}>
      <TimeTableDesignGuideProvider>
        <V2TimeTableEditorRuntimeProvider value={runtimeValue}>
          {!isInitialized || state.weekDates.length === 0 ? (
            <V2Loading />
          ) : (
            <div className="w-full h-full flex flex-col">
              {!state.isMobile && <V2TimeTableControls />}
              {state.isMobile && <V2MobileHeader />}

              <div className="flex flex-col md:flex-row md:items-center min-h-0 gap-0 h-full">
                <V2TimeTablePreview />
                <V2TimeTableForm />
              </div>
            </div>
          )}
        </V2TimeTableEditorRuntimeProvider>
      </TimeTableDesignGuideProvider>
    </TimeTableProvider>
  );
};

export default V2TimeTableEditor;
