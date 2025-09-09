import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import React, { Fragment } from "react";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { TPlaceholders } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { padZero } from "@/utils/date-formatter";
import { isGuideEnabled, TDefaultCard } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";
import { fontOption, Settings, templateSize } from "../../_settings/settings";
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
      <div
        className="absolute grid grid-cols-3 z-50"
        style={{
          top: 136,
          left: 100,
          columnGap: 30,
          rowGap: 58,
        }}
      >
        {data.map((time, i) => (
          <Fragment key={time.day}>
            <div
              className=" flex justify-center items-center pointer-events-none "
              style={{
                width: Settings.card.offline.width,
                height: Settings.card.offline.height,
                position: "relative",
              }}
              key={time.day}
            >
              <p
                style={{
                  top: 14,
                  left: 28,
                  fontFamily: fontOption.primary,
                  color: "#1d2a41",
                  fontSize: 64,
                  rotate: "-10deg",
                  width: 100,
                  height: 100,
                }}
                className="absolute  text-center"
              >
                {padZero(weekDates[i].getDate())}
              </p>
            </div>
            {(i === 1 || i === 3) && <div className="w-10 h-10"></div>}
          </Fragment>
        ))}
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
