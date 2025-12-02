import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";

import { AutoResizeText } from "@/components/AutoResizeTextCard";
import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TDefaultCard, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled } from "@/utils/time-table/data";
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

interface ProfileTextProps {
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

export const ProfileText = ({
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}: ProfileTextProps) => {
  if (!isProfileTextVisible) return null;
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
      }}
      className="absolute z-50 flex flex-col items-start "
    >
      <div
        style={{
          width: 640,
          height: 120,
          zIndex: 20,
          bottom: 80,
          right: 610,
          rotate: "-3.1deg",
        }}
        className="absolute flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 0,
            color: colors["first"]["primary"],
            fontFamily: fontOption.secondary,
          }}
          className="text-center"
          maxFontSize={100}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        className=" pointer-events-none"
        src={Imgs["first"]["artist"].src}
        alt="artist"
      />
    </div>
  );
};

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
      <ProfileText
        isProfileTextVisible={isProfileTextVisible}
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
      />
      <div
        style={{
          width: 4000,
          height: 2250,
          position: "absolute",
          zIndex: 30,
          opacity: 1,
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
    </div>
  );
};

export default TimeTableContent;
