import React from "react";

import { Imgs } from "@/app/test/_img/imgs";
import { colors } from "@/app/test/_styles/colors";
import { Data, ThemeTypes, weekdays } from "./types";

interface TimeTableCellProps {
  time: Data;
  weekDate: Date;
  index: number;
  currentTheme: ThemeTypes;
}

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  index,
  currentTheme,
}) => {
  const descriptionFontSize = 20;
  if (!weekDate) return "Loading";
  if (time.isHoliday) {
    return (
      <div key={time.day}>
        <img src={Imgs[currentTheme]["offline"].src} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "188px",
        height: "228px",
      }}
      key={time.day}
      className="relative"
    >
      <div
        style={{
          fontFamily: "Ownglyph_ParkDaHyun",
        }}
        className="w-full flex flex-col pt-[20px] px-6"
      >
        <p
          style={{
            color: colors[currentTheme]["primary"],
          }}
          className="flex justify-center items-center h-10 text-[20px]"
        >
          {weekdays[time.day]} {`(${weekDate.getDate()})`}
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
