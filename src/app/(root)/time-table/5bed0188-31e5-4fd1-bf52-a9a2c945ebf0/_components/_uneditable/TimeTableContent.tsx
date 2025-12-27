import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";

import { TAddonData } from "@/components/TimeTable/FixedComponents/TimeTableAddonList";
import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TDefaultCard, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import { templateSize } from "../../_settings/settings";
import ProfileImageSection from "../ProfileImageContainer";

import TimeTableGrid from "../TimeTableGrid";
import TimeTableMemo from "../TimeTableMemo";
import TimeTableTopObject from "../TimeTableTopObject";
import TimeTableWeekFlag from "../TimeTableWeekFlag";

export interface TimeTableContentProps {
  currentTheme: TTheme;
  data: TDefaultCard[];
  placeholders: TPlaceholders;
  addonData?: TAddonData;
}

const TimeTableContent: React.FC<TimeTableContentProps> = ({
  currentTheme,
  data,
  placeholders,
  addonData,
}) => {
  const { imageSrc, weekDates, profileText, memoText } = useTimeTableData();
  const { scale, isProfileTextVisible, isMemoTextVisible } = useTimeTableUI();

  if (weekDates.length === 0) return null;

  return (
    <div
      id="timetable"
      className=" box-border select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,
        backgroundImage: `url(${Imgs[currentTheme].bg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: templateSize.width,
        height: templateSize.height,
      }}
    >
      {isGuideEnabled && <TimeTableDesignGuide />}
      <TimeTableTopObject />
      <TimeTableMemo
        isMemoTextVisible={isMemoTextVisible}
        memoText={memoText}
      />
      <TimeTableWeekFlag currentTheme={currentTheme} weekDates={weekDates} />
      <TimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <ProfileImageSection
        imageSrc={imageSrc}
        currentTheme={currentTheme}
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
        isProfileTextVisible={isProfileTextVisible}
      />
    </div>
  );
};

export default TimeTableContent;
