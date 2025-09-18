import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TeamSchedule } from "@/types/team-timetable";
import { TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import { templateSize } from "../../_settings/settings";
import ProfileImageSection from "../ProfileImageContainer";
import TeamTimeTableGrid from "../TeamTimeTableGrid";
import TimeTableWeekFlag from "../TimeTableWeekFlag";

export interface TeamTimeTableContentProps {
  currentTheme: TTheme;
  data: TeamSchedule[];
  placeholders: TPlaceholders;
}

const TeamTimeTableContent: React.FC<TeamTimeTableContentProps> = ({
  currentTheme,
  data,
  placeholders,
}) => {
  const { imageSrc, weekDates, profileText } = useTimeTableData();
  const { scale, isProfileTextVisible } = useTimeTableUI();

  if (weekDates.length === 0) return null;

  console.log("inner_data", data);

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
      <TeamTimeTableGrid
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
    </div>
  );
};

export default TeamTimeTableContent;
