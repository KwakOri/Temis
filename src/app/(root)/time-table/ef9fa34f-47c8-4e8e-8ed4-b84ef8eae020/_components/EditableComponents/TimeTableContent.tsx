import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import { useTimeTableDesignGuideContext } from "@/contexts/TimeTableDesignGuideContext";
import React from "react";
import { Imgs } from "../../_img/imgs";
import { TDefaultCard, TTheme } from "../../_settings/general";
import ProfileImage from "./ProfileImage";
import TimeTableGrid from "./TimeTableGrid";
import TimeTableWeekFlag from "./TimeTableWeekFlag";

export interface TimeTableContentProps {
  currentTheme: TTheme;
  data: TDefaultCard[];
}

const TimeTableContent: React.FC<TimeTableContentProps> = ({
  currentTheme,
  data,
}) => {
  const { imageSrc, weekDates, profileText } = useTimeTableData();
  const { scale } = useTimeTableUI();
  const { isVisible, opacity } = useTimeTableDesignGuideContext();

  if (weekDates.length === 0) return null;

  return (
    <div
      id="timetable"
      className="w-[1280px] h-[720px] box-border text-[26px] select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,
        backgroundImage: `url(${Imgs[currentTheme].bg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <TimeTableDesignGuide id="ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020" />
      <TimeTableWeekFlag currentTheme={currentTheme} weekDates={weekDates} />
      <TimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <ProfileImage
        imageSrc={imageSrc}
        profileText={profileText}
        currentTheme={currentTheme}
      />
    </div>
  );
};

export default TimeTableContent;
