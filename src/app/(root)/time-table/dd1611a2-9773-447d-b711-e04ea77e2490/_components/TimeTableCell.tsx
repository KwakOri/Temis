import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { weekdays } from "@/utils/time-table/data";
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
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface CellTextMainTitleProps {
  currentTheme?: TTheme;
  mainTitle: string;
}

interface CellTextSubTitleProps {
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
  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["secondary"],
        top: 48,
        left: 66,
        width: 120,
        fontSize: 76,
        rotate: "-6deg",
      }}
      className="absolute flex justify-center items-center"
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

const StreamingTime = ({ time, currentTheme }: StreamingTimeProps) => {
  return (
    <p
      style={{
        left: 8,
        top: 36,
        width: "100%",
        height: 80,
        lineHeight: 1,
        fontSize: 64,

        color: colors[currentTheme || "first"]["secondary"],
      }}
      className="absolute flex justify-center items-center"
    >
      {formatTime(time, "half")}
    </p>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        height: 220,
        width: "100%",
      }}
      className="flex justify-center items-center shrink-0 mt-32"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 0.9,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={96}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    // <p
    //   style={{
    //     color: colors["first"]["primary"],
    //   }}
    //   className=" flex justify-center items-center text-[48px] mt-32"
    // >
    //   {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
    // </p>
    <div
      style={{
        height: 72,
        width: "100%",
      }}
      className="flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          color: colors["first"]["secondary"],
        }}
        className="leading-none text-center w-full"
        maxFontSize={56}
      >
        {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
  isOffline: boolean;
}

const CardBG = ({ day, isOffline }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][isOffline ? "offline" : "online"].src.replace(
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
      className=" pointer-events-none"
      style={{
        paddingTop: 2,
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

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 540,
        height: 440,
        left: 120,
        top: 32,
      }}
      className="absolute w-full h-full flex flex-col items-center"
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

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.description as string) || "";
  const entrySubTitle = (primaryEntry.topic as string) || "";

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      key={time.day}
      className="relative flex justify-center"
    >
      <StreamingDay day={time.day} />
      {time.isOffline || (
        <CellContentArea>
          <StreamingTime time={entryTime} />
          <CellTextMainTitle mainTitle={entryMainTitle} />
          <CellTextTitle cellTextTitle={entrySubTitle} />
          {/* <StreamingDate date={weekDate.getDate()} /> */}
        </CellContentArea>
      )}

      <CardBG day={time.day} isOffline={time.isOffline} />
    </div>
  );
};

export default TimeTableCell;
