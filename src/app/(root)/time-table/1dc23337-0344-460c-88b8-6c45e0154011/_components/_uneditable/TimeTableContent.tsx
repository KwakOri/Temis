import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React from "react";

import { AutoResizeText } from "@/components/AutoResizeTextCard";
import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TDefaultCard, TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { isGuideEnabled } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import { colors, fontOption, templateSize } from "../../_settings/settings";
import ProfileImageSection, {
  ProfileTextProps,
} from "../ProfileImageContainer";
import TimeTableGrid from "../TimeTableGrid";
import TimeTableWeekFlag from "../TimeTableWeekFlag";

export interface TimeTableContentProps {
  currentTheme: TTheme;
  data: TDefaultCard[];
  placeholders: TPlaceholders;
}

const ProfileText = ({
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}: ProfileTextProps) => {
  if (!isProfileTextVisible) return null;
  return (
    <div
      style={{
        color: colors["first"]["secondary"],
        fontFamily: fontOption.primary,
        width: 4000,
        height: 2250,
      }}
      className="absolute z-40 flex justify-end items-center "
    >
      <div
        style={{
          position: "absolute",
          bottom: 106,
          right: 100,
          width: 340,
          height: 120,
          zIndex: 20,

          color: colors["first"]["quaternary"],
          fontFamily: fontOption.secondary,
          fontWeight: 100,
        }}
        className="flex justify-left items-center "
      >
        <AutoResizeText
          style={{ lineHeight: 0 }}
          className="text-left"
          maxFontSize={44}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs["first"]["artist"].src}
        className="object-cover pointer-events-none"
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
        currentTheme={currentTheme}
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
        isProfileTextVisible={isProfileTextVisible}
      />
      <ProfileText
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
        isProfileTextVisible={isProfileTextVisible}
      />
    </div>
  );
};

export default TimeTableContent;
