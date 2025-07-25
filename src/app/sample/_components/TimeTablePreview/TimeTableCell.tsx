import React from "react";

import { Imgs } from "@/app/sample/_img/imgs";
import { TDefaultCard, weekdays } from "@/app/sample/_settings/general";
import {
  colors,
  fontOption,
  offlineCardHeight,
  offlineCardWidth,
  onlineCardHeight,
  onlineCardWidth,
  TTheme,
  weekdayOption,
} from "@/app/sample/_settings/settings";

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  index,
  currentTheme,
}) => {
  if (!weekDate) return "Loading";
  if (time.isOffline) {
    return (
      <div
        style={{
          width: offlineCardWidth + "px",
          height: offlineCardHeight + "px",
        }}
        key={time.day}
      >
        <img src={Imgs[currentTheme]["offline"].src} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: onlineCardWidth + "px",
        height: onlineCardHeight + "px",
      }}
      key={time.day}
      className="relative"
    >
      <div
        style={{
          fontFamily: fontOption.primary,
        }}
        className="w-full flex flex-col pt-[20px] px-6"
      >
        <p
          style={{
            color: colors[currentTheme]["primary"],
          }}
          className="flex justify-center items-center h-10 text-[20px]"
        >
          {weekdays[weekdayOption][time.day]} {`(${weekDate.getDate()})`}
        </p>
        <p
          style={{
            color: colors[currentTheme]["secondary"],
          }}
          className=" flex justify-center items-center h-[30px] text-[16px] pt-2"
        >
          {time.topic}
        </p>

        <div className="flex flex-col justify-center items-center  h-[77px] pb-2">
          {time.description
            .split("\n")
            .filter((line) => line.trim() !== "") // 공백 줄 제거
            .map((line, idx) => (
              <p
                style={{
                  color: colors[currentTheme]["primary"],
                }}
                className=" text-[32px] leading-none text-center"
                key={index + "-" + idx}
              >
                {line}
              </p>
            ))}
        </div>
        <p
          style={{
            color: colors[currentTheme]["primary"],
          }}
          className=" flex justify-center items-center  h-[27px] text-[16px]"
        >
          {time.time}
        </p>
      </div>
      <img
        className="absolute top-0 left-0 -z-10"
        src={Imgs[currentTheme]["online"].src}
      />
    </div>
  );
};

export default TimeTableCell;
