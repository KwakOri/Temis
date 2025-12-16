import React from "react";

import Loading from "@/components/Loading";
import MobileHeader from "@/components/TimeTable/MobileHeader";
import { TimeTableProvider } from "@/contexts/TimeTableContext";
import { TimeTableDesignGuideProvider } from "@/contexts/TimeTableDesignGuideContext";
import { useTimeTableEditor } from "@/hooks";

import TimeTableSampleForm from "@/app/(root)/_sample/_components/SampleTimeTableForm";
import TimeTableSampleInputList from "@/app/(root)/_sample/_components/SampleTimeTableInputList";
import TimeTableSamplePreview from "@/app/(root)/_sample/_components/SampleTimeTablePreview";
import TimeTableDesignGuideController from "@/components/tools/TimeTableDesignGuideController";
import { isGuideEnabled } from "@/utils/time-table/data";
import { placeholders } from "../../_settings/general";
import {
  CARD_INPUT_CONFIG,
  defaultTheme,
  Settings,
  templateSize,
  weekdayOption,
} from "../../_settings/settings";
import TimeTableContent from "./TimeTableContent";

// TimeTableEditor의 내부 컴포넌트 (Context Provider 내부)
const TimeTableEditorContent: React.FC = () => {
  // 통합 상태 관리 훅 사용 - CardInputConfig 주입

  const { state, data, updateData, currentTheme, resetData, isInitialized } =
    useTimeTableEditor({
      cardInputConfig: CARD_INPUT_CONFIG,
      defaultTheme: defaultTheme,
      captureSize: templateSize,
    });

  // 초기화되지 않았거나 주간 날짜가 로드되지 않았으면 로딩 표시
  if (!isInitialized || state.weekDates.length === 0) return <Loading />;

  return (
    <div className="w-full h-full flex flex-col px-9">
      {/* 데스크탑 버전 - TimeTableControls (뒤로가기 + 배율 조절 통합) */}
      {/* 모바일 버전 - 상단 헤더에 뒤로가기 + 배율 조절 */}
      {state.isMobile && <MobileHeader />}
      <TimeTableSamplePreview>
        <TimeTableContent
          currentTheme={currentTheme}
          data={data}
          placeholders={placeholders}
        />
      </TimeTableSamplePreview>
      <TimeTableSampleForm
        multiSelect
        isMemo
        isArtist
        saveable={false}
        onReset={resetData}
        addons={isGuideEnabled && <TimeTableDesignGuideController />}
        cropWidth={Settings.profile.image.width}
        cropHeight={Settings.profile.image.height}
      >
        <TimeTableSampleInputList
          isMultiple
          maxStreamingTimeByDay={2}
          cardInputConfig={CARD_INPUT_CONFIG}
          placeholders={placeholders}
          data={data}
          onDataChange={updateData}
          weekdayOption={weekdayOption}
        />
      </TimeTableSampleForm>
    </div>
  );
};

// 메인 TimeTableEditor 컴포넌트 (Context Provider 래퍼)
const TimeTableEditor: React.FC = () => {
  // 전역 상태는 통합 훅 내부에서 관리되므로 별도로 생성하지 않음
  // Context는 내부 컴포넌트에서 전역 상태를 받아서 제공
  const { state, actions } = useTimeTableEditor({
    cardInputConfig: CARD_INPUT_CONFIG,
    defaultTheme: defaultTheme,
    captureSize: templateSize,
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
