import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { useTimeTableDesignGuideContext } from "@/contexts/TimeTableDesignGuideContext";
import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";
import { Imgs } from "../../_img/imgs";
import { TDefaultCard } from "../../_settings/general";
import { TTheme } from "../../_settings/settings";
import ProfileImage from "./ProfileImage";
import TimeTableGrid from "./TimeTableGrid";

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
      <TimeTableDesignGuide
        id="83b56e00-b93b-4dc0-81ff-0521c891ee26"
        isVisible={isVisible}
        opacity={opacity}
      />

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
