import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled, TDefaultCard } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import { colors, fontOption, templateSize } from "../../_settings/settings";
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
      className=" box-border select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        backgroundImage: `url(${Imgs[currentTheme].bg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        transform: `scale(${scale})`,
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
          zIndex: 50,
        }}
      >
        <img
          src={Imgs["first"]["topObject"].src}
          alt={"top-object"}
          draggable={false}
        />
      </div>
      {!isProfileTextVisible ? null : (
        <div
          style={{
            color: colors["first"]["quaternary"],
            fontFamily: fontOption.primary,
            width: 4000,
            height: 2250,
          }}
          className="absolute inset-0 z-50"
        >
          <div
            style={{
              position: "absolute",
              bottom: 232,
              right: 68,
              width: 1200,
              height: 200,
              rotate: "4.8deg",
              zIndex: 20,
            }}
            className="flex justify-center items-center"
          >
            <AutoResizeText className="text-center" maxFontSize={80}>
              {profileText ? profileText : placeholders.profileText}
            </AutoResizeText>
          </div>
          <img
            className="absolute inset-0 z-50"
            src={Imgs["first"]["artist"].src}
            alt="artist"
          />
        </div>
      )}

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
    </div>
  );
};

export default TimeTableContent;
