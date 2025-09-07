import Image from "next/image";
import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import { TDefaultCard, weekdays } from "@/utils/time-table/data";
import { Imgs } from "../../_img/imgs";

import { placeholders } from "../../_settings/general";
import {
  colors,
  fontOption,
  offlineCardHeight,
  offlineCardWidth,
  onlineCardHeight,
  onlineCardWidth,
  weekdayOption,
} from "../../_settings/settings";

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

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = primaryEntry.time as string || "09:00";
  const entryDescription = primaryEntry.description as string || "";
  const entryTopic = primaryEntry.topic as string || "";

  if (time.isOffline) {
    return (
      <div
        style={{
          width: offlineCardWidth + "px",
          height: offlineCardHeight + "px",
        }}
        key={time.day}
      >
        <Image
          className="pointer-events-none"
          src={Imgs[currentTheme]["offline"].src.replace("./", "/")}
          alt="offline"
          width={offlineCardWidth}
          height={offlineCardHeight}
          draggable={false}
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
          {entryTopic ? entryTopic : placeholders.topic}
        </p>

        <div className="flex flex-col justify-center items-center  h-[77px] pb-2">
          {entryDescription ? (
            // entryDescription
            //   .split("\n")
            //   .filter((line) => line.trim() !== "") // 공백 줄 제거
            //   .map((line, idx) => (
            //     <p
            //       style={{
            //         color: colors[currentTheme]["primary"],
            //       }}
            //       className=" text-[32px] leading-none text-center"
            //       key={index + "-" + idx}
            //     >
            //       {line}
            //     </p>
            //   ))
            <AutoResizeText
              style={{
                color: colors[currentTheme]["primary"],
              }}
              className=" text-[32px] leading-none text-center"
              multiline={true}
              maxFontSize={32}
            >
              {entryDescription}
            </AutoResizeText>
          ) : (
            <p
              style={{
                color: colors[currentTheme]["primary"],
              }}
              className=" text-[32px] leading-none text-center"
            >
              {placeholders.description}
            </p>
          )}
        </div>

        <AutoResizeText
          style={{
            color: colors[currentTheme]["primary"],
          }}
          className=" flex justify-center items-center  h-[27px] text-[16px]"
        >
          {entryTime}
        </AutoResizeText>
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
