import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";
import { Imgs } from "../_img/imgs";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled, TDefaultCard } from "@/utils/time-table/data";
import ProfileImageContainer from "./ProfileImageContainer";
import TimeTableGrid from "./TimeTableGrid";
import TimeTableWeekFlag from "./TimeTableWeekFlag";

export interface TimeTableContentProps {
  currentTheme: TTheme;
  data: TDefaultCard[];
  placeholders: TPlaceholders;
}

const TimeTableContent: React.FC<TimeTableContentProps> = ({
  currentTheme,
  data,
  placeholders,
}) => {
  const { imageSrc, weekDates, profileText } = useTimeTableData();
  const { scale, isProfileTextVisible } = useTimeTableUI();

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
      {isGuideEnabled && <TimeTableDesignGuide />}
      <TimeTableWeekFlag currentTheme={currentTheme} weekDates={weekDates} />
      <TimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <ProfileImageContainer
        imageSrc={imageSrc}
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
        currentTheme={currentTheme}
        isProfileTextVisible={isProfileTextVisible}
      />
    </div>
  );
};

export default TimeTableContent;
