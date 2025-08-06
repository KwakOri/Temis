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
        className="pointer-events-none flex justify-end items-end"
        style={{
          width: offlineCardWidth + "px",
          height: offlineCardHeight + "px",
        }}
        key={time.day}
      >
        <Image
          src={Imgs[currentTheme]["offline"].src.replace("./", "/")}
          alt="offline"
          width={228}
          height={171}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: onlineCardWidth + "px",
        height: onlineCardHeight + "px",
        fontFamily: fontOption.primary,
        fontSize: "24px",
      }}
      key={time.day}
      className="relative flex justify-end items-end"
    >
      <div
        className="absolute z-20"
        style={{
          width: "130px",
          height: "42px",
          transform: "rotate(-12deg)",
          left: "8px",
          top: "14px",
        }}
      >
        <div className="flex h-full relative z-10 items-center justify-between px-3">
          <p
            style={{
              color: colors[currentTheme]["primary"],
            }}
            className=" text-[20px]"
          >
            {weekdays[weekdayOption][time.day]}
          </p>
          <p
            style={{
              color: colors[currentTheme]["primary"],
            }}
            className="text-[20px] w-13 flex justify-center items-center"
          >
            {getFormattedTime(time.time as string)}
          </p>
        </div>
        <Image fill src={Imgs[currentTheme].onlineTime} alt={"onlineTime"} />
      </div>
      <div
        style={{
          width: "246px",
          height: "171px",
        }}
        className={"relative bottom-0 right-0"}
      >
        <div
          style={{
            fontFamily: fontOption.primary,
          }}
          className="absolute right-0 w-[228px] h-full flex flex-col items-center pt-11"
        >
          <div
            style={{
              height: "72px",
            }}
            className="flex justify-center items-center w-full pl-6 pr-6"
          >
            <AutoResizeText
              style={{
                color: colors[currentTheme]["secondary"],
                lineHeight: 1,
              }}
              className="leading-none text-center w-full"
              multiline={true}
              maxFontSize={35}
              minFontSize={20}
            >
              {time.description
                ? (time.description as string)
                : placeholders.description}
            </AutoResizeText>
          </div>
          <AutoResizeText
            style={{
              color: colors[currentTheme]["tertiary"],
            }}
            className=" mt-1 flex justify-center items-center h-[26px]  pl-6 pr-6"
            maxFontSize={16}
            minFontSize={12}
          >
            {time.topic ? (time.topic as string) : placeholders.topic}
          </AutoResizeText>
        </div>
        <Image
          className="-z-10"
          src={Imgs[currentTheme]["online"].src.replace("./", "/")}
          alt="online"
          fill
        />
      </div>
    </div>
  );
};

export default TimeTableCell;
