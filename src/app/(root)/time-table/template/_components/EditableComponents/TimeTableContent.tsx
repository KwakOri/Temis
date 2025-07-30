import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";
import { Imgs } from "../../_img/imgs";
import { TDefaultCard } from "../../_settings/general";
import { TTheme } from "../../_settings/settings";
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
      <TimeTableDesignGuide id={""} />
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
