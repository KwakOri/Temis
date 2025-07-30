import React from "react";

import Loading from "@/components/Loading";
import MobileHeader from "@/components/TimeTable/MobileHeader";
import TimeTableControls from "@/components/TimeTable/TimeTableControls";
import TimeTableForm from "@/components/TimeTable/TimeTableForm";
import TimeTablePreview from "@/components/TimeTable/TimeTablePreview";
import { TimeTableProvider } from "@/contexts/TimeTableContext";
import { useTimeTableState } from "@/hooks/useTimeTableState";

import { useTimeTableEditor } from "../../_hooks";
import TimeTableInputList from "../FixedComponents/TimeTableInputList";
import TimeTableContent from "./TimeTableContent";

// TimeTableEditor의 내부 컴포넌트 (Context Provider 내부)
const TimeTableEditorContent: React.FC = () => {
  // 통합 상태 관리 훅 사용
  const { state, data, updateData, currentTheme, handleThemeChange } =
    useTimeTableEditor();

  if (state.weekDates.length === 0) return <Loading />;

  return (
    <div className="w-full h-full flex flex-col">
      {/* 데스크탑 버전 - TimeTableControls (뒤로가기 + 배율 조절 통합) */}
      {!state.isMobile && <TimeTableControls />}

      {/* 모바일 버전 - 상단 헤더에 뒤로가기 + 배율 조절 */}
      {state.isMobile && <MobileHeader />}

      <div className="flex flex-col md:flex-row md:items-center min-h-0 gap-0 h-full">
        <TimeTablePreview>
          <TimeTableContent currentTheme={currentTheme} data={data} />
        </TimeTablePreview>
        <TimeTableForm addons={null}>
          <TimeTableInputList data={data} onDataChange={updateData} />
        </TimeTableForm>
      </div>
    </div>
  );
};

// 메인 TimeTableEditor 컴포넌트 (Context Provider 래퍼)
const TimeTableEditor: React.FC = () => {
  const timeTableState = useTimeTableState();

  return (
    <TimeTableProvider value={timeTableState}>
      <TimeTableEditorContent />
    </TimeTableProvider>
  );
};

export default TimeTableEditor;
