import React, { useMemo } from "react";

import Loading from "@/components/Loading";
import MobileHeader from "@/components/TimeTable/MobileHeader";
import TimeTableControls from "@/components/TimeTable/TimeTableControls";
import TimeTableForm from "@/components/TimeTable/TimeTableForm";
import TimeTablePreview from "@/components/TimeTable/TimeTablePreview";
import { TimeTableProvider } from "@/contexts/TimeTableContext";
import { TimeTableDesignGuideProvider } from "@/contexts/TimeTableDesignGuideContext";
import { useTimeTableEditor } from "@/hooks";

import { TeamService } from "@/services/teamService";

import TimeTableDesignGuideController from "@/components/tools/TimeTableDesignGuideController";
import { useTeamTimeTableEditor } from "@/hooks/query/useTeamTimeTableEditor";
import { getTeamDummyData } from "@/lib/dummy";
import { isGuideEnabled } from "@/utils/time-table/data";
import { placeholders } from "../../_settings/general";
import {
  CARD_INPUT_CONFIG,
  defaultTheme,
  Settings,
  templateSize,
} from "../../_settings/settings";
import TeamTimeTableContent from "./TeamTimeTableContent";

// TimeTableEditor의 내부 컴포넌트 (Context Provider 내부)
const TimeTableEditorContent: React.FC = () => {
  // TODO: 실제 팀 ID는 props나 URL 파라미터에서 받아올 예정
  const TEAM_ID = "c88abf05-e892-4765-b731-e5a7d28996ce"; // 임시 팀 ID

  // 현재 주의 시작일 계산 (월요일)
  const currentWeekStart = React.useMemo(() => {
    return TeamService.getWeekStartDate(new Date());
  }, []);

  const dummyTeamData = useMemo(() => getTeamDummyData(4), []);

  // 팀 시간표 데이터 로드
  const {
    data: teamData,
    isLoading: teamDataLoading,
    isInitialized: teamDataInitialized,
    error: teamDataError,
    refetch,
  } = useTeamTimeTableEditor({
    teamId: TEAM_ID,
    weekStartDate: currentWeekStart,
  });

  // 팀 데이터 리셋 함수 (팀 시간표는 DB에서 가져오므로 refetch 사용)
  const resetData = () => {
    refetch();
  };

  // 기존 로컬 에디터 상태 (UI 상태만 사용)
  const { state, currentTheme, isInitialized } = useTimeTableEditor({
    cardInputConfig: CARD_INPUT_CONFIG,
    defaultTheme: defaultTheme,
    captureSize: templateSize,
  });

  // 로딩 상태 체크
  if (
    !isInitialized ||
    !teamDataInitialized ||
    teamDataLoading ||
    state.weekDates.length === 0
  ) {
    return <Loading />;
  }

  // 에러 상태 표시
  if (teamDataError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">
            팀 시간표를 불러오는데 실패했습니다.
          </p>
          <p className="text-gray-500 text-sm">{teamDataError}</p>
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
            data={dummyTeamData}
            placeholders={placeholders}
          />
        </TimeTablePreview>
        <TimeTableForm
          onReset={resetData}
          addons={isGuideEnabled && <TimeTableDesignGuideController />}
          cropWidth={Settings.profile.image.width}
          cropHeight={Settings.profile.image.height}
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
