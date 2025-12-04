import React from "react";

import Loading from "@/components/Loading";
import MobileHeader from "@/components/TimeTable/MobileHeader";
import TimeTableControls from "@/components/TimeTable/TimeTableControls";
import TimeTableForm from "@/components/TimeTable/TimeTableForm";
import TimeTablePreview from "@/components/TimeTable/TimeTablePreview";
import { TimeTableProvider, useTimeTable } from "@/contexts/TimeTableContext";
import { TimeTableDesignGuideProvider } from "@/contexts/TimeTableDesignGuideContext";
import { useTimeTableEditor } from "@/hooks";

import TimeTableDesignGuideController from "@/components/tools/TimeTableDesignGuideController";
import { useTeamBatchSchedules } from "@/hooks/query/useTeamSchedules";
import { isGuideEnabled } from "@/utils/time-table/data";
import { placeholders } from "../../_settings/general";
import {
  CARD_INPUT_CONFIG,
  defaultTheme,
  Settings,
  team_ids,
  templateSize,
} from "../../_settings/settings";
import TeamTimeTableContent from "./TeamTimeTableContent";

// TimeTableEditor의 내부 컴포넌트 (Context Provider 내부)
const TimeTableEditorContent: React.FC = () => {
  // Context에서 상태 가져오기
  const { state } = useTimeTable();

  // 기존 로컬 에디터 상태 (UI 상태만 사용)
  const { currentTheme, isInitialized } = useTimeTableEditor({
    cardInputConfig: CARD_INPUT_CONFIG,
    defaultTheme: defaultTheme,
    captureSize: templateSize,
  });

  // 팀 멤버들의 스케줄 데이터 로드
  const {
    data: teamSchedulesData,
    isLoading: teamSchedulesLoading,
    error: teamSchedulesError,
    refetch,
  } = useTeamBatchSchedules(team_ids, state.mondayDateStr);

  // 래핑된 데이터를 TeamSchedule[] 형식으로 변환
  // Hook은 조건부 반환 이전에 호출되어야 함
  const scheduleData = React.useMemo(() => {
    if (!teamSchedulesData?.schedules) return [];

    return teamSchedulesData.schedules
      .filter((item) => item.success && item.schedule !== null)
      .map((item) => item.schedule!);
  }, [teamSchedulesData]);

  // 팀 데이터 리셋 함수
  const resetData = () => {
    refetch();
  };

  // 로딩 상태 체크
  if (
    !isInitialized ||
    !teamSchedulesData?.schedules ||
    teamSchedulesLoading ||
    state.weekDates.length === 0
  ) {
    return <Loading />;
  }

  // 에러 상태 표시
  if (teamSchedulesError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">
            팀 시간표를 불러오는데 실패했습니다.
          </p>
          <p className="text-gray-500 text-sm">{teamSchedulesError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* 데스크탑 버전 - TimeTableControls (뒤로가기 + 배율 조절 통합) */}
      {!state.isMobile && <TimeTableControls />}

      {/* 모바일 버전 - 상단 헤더에 뒤로가기 + 배율 조절 */}
      {state.isMobile && <MobileHeader />}

      <div className="flex flex-col md:flex-row md:items-center min-h-0 gap-0 h-full">
        <TimeTablePreview>
          <TeamTimeTableContent
            currentTheme={currentTheme}
            data={teamSchedulesData?.schedules}
            placeholders={placeholders}
          />
        </TimeTablePreview>
        <TimeTableForm
          onReset={resetData}
          addons={isGuideEnabled && <TimeTableDesignGuideController />}
          cropWidth={Settings.profile_image.width as number}
          cropHeight={Settings.profile_image.height as number}
        ></TimeTableForm>
      </div>
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
