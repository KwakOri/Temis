import Image from "next/image";
import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import {
  getFormattedTime,
  TDefaultCard,
  weekdays,
} from "@/utils/time-table/data";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import {
  colors,
  fontOption,
  offlineCardHeight,
  offlineCardWidth,
  onlineCardHeight,
  onlineCardWidth,
  weekdayOption,
} from "../_settings/settings";

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  if (!weekDate) return "Loading";

  if (time.isOffline) {
    return (
      <div
        className=" pointer-events-none"
        style={{
          paddingTop: 2,
          width: offlineCardWidth + "px",
          height: offlineCardHeight + "px",
        }}
        key={time.day}
      >
        <Image
          src={Imgs[currentTheme]["offline"].src.replace("./", "/")}
          alt="offline"
          width={offlineCardWidth}
          height={offlineCardHeight}
        />
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
        className="w-full h-full flex flex-col pt-[48px] px-8"
      >
        <p
          style={{
            color: colors[currentTheme]["tertiary"],
            top: 11,
            left: 2,
            width: 120,
          }}
          className="absolute flex justify-center items-center h-10 text-[19px]"
        >
          {weekdays[weekdayOption][time.day].toUpperCase()}{" "}
          {getFormattedTime(time.time as string)}
        </p>

        <div
          style={{
            height: "80px",
          }}
          className="flex justify-center items-center "
        >
          <AutoResizeText
            style={{
              color: colors[currentTheme]["primary"],
              lineHeight: 1,
            }}
            className="leading-none text-center w-full"
            multiline={true}
            maxFontSize={36}
            minFontSize={10}
          >
            {time.description
              ? (time.description as string)
              : placeholders.description}
          </AutoResizeText>
        </div>
        <p
          style={{
            color: colors[currentTheme]["primary"],
          }}
          className=" flex justify-center items-center h-[28px] text-[16px]"
        >
          {time.topic ? (time.topic as string) : placeholders.topic}
        </p>
      </div>
      <Image
        className="absolute top-0 left-0 -z-10"
        src={Imgs[currentTheme]["online"].src.replace("./", "/")}
        alt="online"
        width={onlineCardWidth}
        height={onlineCardHeight}
      />
    </div>
  );
};

export default TimeTableCell;
