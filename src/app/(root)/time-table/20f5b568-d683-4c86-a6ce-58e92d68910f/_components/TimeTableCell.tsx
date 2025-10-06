import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { TDefaultCard, weekdays } from "@/utils/time-table/data";
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

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  isEven: boolean;
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface CellTextDescriptionProps {
  currentTheme?: TTheme;
  description: string;
}

interface CellTextTopicProps {
  cellTextTitle: string | null;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  day: number;
  currentTheme?: TTheme;
}

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  const dayPos = {
    0: { top: 122, left: 252, rotate: 1.6 },
    1: { top: 120, left: 252, rotate: 0 },
    2: { top: 124, left: 253, rotate: 2 },
    3: { top: 120, left: 252, rotate: 0 },
    4: { top: 122, left: 252, rotate: 2 },
    5: { top: 120, left: 252, rotate: 0 },
    6: { top: 122, left: 252, rotate: 2 },
  };

  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["primary"],
        top: dayPos[day as 0 | 1 | 2 | 3 | 4 | 5 | 6].top,
        left: dayPos[day as 0 | 1 | 2 | 3 | 4 | 5 | 6].left,
        rotate: dayPos[day as 0 | 1 | 2 | 3 | 4 | 5 | 6].rotate + "deg",
        width: 120,
      }}
      className="absolute flex justify-center items-center h-10 text-[34px]"
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["tertiary"],
        top: 48,
        left: 28,
        width: 120,
        transform: "rotate(-22deg)",
      }}
      className="absolute flex justify-center items-center text-[56px] font-bold"
    >
      {date}
    </p>
  );
};

const StreamingTime = ({ time, currentTheme, isEven }: StreamingTimeProps) => {
  return (
    <p
      style={{
        bottom: isEven ? 54 : 52,
        right: isEven ? 52 : 32,
        width: 260,
        height: 100,
        rotate: isEven ? "2deg" : "0deg",
        lineHeight: 1,
        fontSize: 36,
        fontFamily: fontOption.secondary,
        color: colors[currentTheme || "first"]["primary"],
      }}
      className="absolute flex flex-col justify-center items-center"
    >
      {formatTime(time, "half")}
    </p>
  );
};

const CellTextDescription = ({
  currentTheme,
  description,
}: CellTextDescriptionProps) => {
  return (
    <div
      style={{
        height: 200,
        width: "90%",
      }}
      className="relative flex justify-center items-center shrink-0 mt-1"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 1.2,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={84}
      >
        {description ? (description as string) : placeholders.description}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextTopicProps) => {
  return (
    <p
      style={{
        color: colors["first"]["secondary"],
        width: "90%",
      }}
      className=" flex justify-center items-center text-[40px] mt-7"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.topic}
    </p>
  );
};

interface OnlineCardBGProps {
  day: number;

  isEven: boolean;
}

const CardBG = ({ day, isEven }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: isEven ? 615 : 614,
        height: isEven ? 671 : 662,
      }}
      className="absolute inset-0 -z-10 overflow-visible"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][isEven ? "online1" : "online2"].src.replace(
          "./",
          "/"
        )}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: 176,
        width: offlineCardWidth,
        height: offlineCardHeight,
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || "first"]["offline"].src.replace("./", "/")}
        alt="offline"
        style={{
          width: offlineCardWidth,
          height: offlineCardHeight,
        }}
      />
    </div>
  );
};

interface CellContentAreaProps {
  isEven: boolean;
}

const CellContentArea = ({
  children,
  isEven,
}: PropsWithChildren<CellContentAreaProps>) => {
  return (
    <div
      style={{
        width: 500,
        height: 360,
        marginTop: 224,
        left: isEven ? -6 : 0,
        rotate: isEven ? "2deg" : "0deg",
      }}
      className="relative w-full h-full flex flex-col items-center"
    >
      {children}
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  if (!weekDate) return "Loading";

  const isEven = time.day % 2 === 0;

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryDescription = (primaryEntry.description as string) || "";
  const entryTopic = (primaryEntry.topic as string) || "";

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
        fontFamily: fontOption.primary,
        top: isEven ? 0 : 10,
        rotate: time.day === 3 || time.day === 6 ? "-3.6deg" : "0deg",
      }}
      key={time.day}
      className="relative flex justify-center overflow-visible"
    >
      <StreamingDay day={time.day} />
      {time.isOffline ? (
        <OfflineCard day={time.day} currentTheme={currentTheme} />
      ) : (
        <>
          <StreamingTime isEven={isEven} time={entryTime} />
          <CellContentArea isEven={isEven}>
            <CellTextDescription description={entryDescription} />
            <CellTextTitle cellTextTitle={entryTopic} />

            {/* <StreamingDate date={weekDate.getDate()} /> */}
          </CellContentArea>
        </>
      )}
      <CardBG day={time.day} isEven={isEven} />
    </div>
  );
};

export default TimeTableCell;
