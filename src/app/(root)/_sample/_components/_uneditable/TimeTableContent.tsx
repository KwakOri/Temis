import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";

import { TDefaultCard, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { Imgs } from "../../_img/imgs";
import { templateSize } from "../../_settings/settings";
import ProfileImageSection from "../ProfileImageContainer";
import TimeTableGrid from "../TimeTableGrid";
import TimeTableWeekFlag from "../TimeTableWeekFlag";

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
      className=" box-border select-none font-sans relative rounded-[120px] overflow-hidden"
      style={{
        transform: `scale(${0.275})`,
        width: templateSize.width,
        height: templateSize.height,
        transformOrigin: "left top",
      }}
    >
      <div
        className=""
        style={{
          width: 4000,
          height: 2250,
          position: "absolute",
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: 4000,
            height: 2250,
            position: "absolute",
            zIndex: 30,
          }}
        >
          <img
            src={Imgs["first"]["topObject"].src}
            alt={"top-object"}
            draggable={false}
          />
        </div>

        <TimeTableWeekFlag currentTheme={currentTheme} weekDates={weekDates} />
        <TimeTableGrid
          data={data}
          weekDates={weekDates}
          currentTheme={currentTheme}
        />
        <ProfileImageSection
          imageSrc={imageSrc}
          profileText={profileText}
          profileTextPlaceholder={placeholders.profileText}
          currentTheme={currentTheme}
          isProfileTextVisible={isProfileTextVisible}
        />
        <img className="absolute inset-0" src={Imgs["first"].bg.src} alt="" />
      </div>
    </div>
  );
};

export default TimeTableContent;
