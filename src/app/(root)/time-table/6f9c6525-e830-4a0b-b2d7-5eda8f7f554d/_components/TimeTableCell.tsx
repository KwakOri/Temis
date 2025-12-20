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
  isGuerrilla: boolean;
  time: string;
  day: number;
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
        color: colors[currentTheme || "first"]["primary"],
      }}
      className="flex justify-center items-center h-10 text-[28px]"
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["primary"],

        width: "100%",
        height: 80,
        lineHeight: 1,
        fontWeight: 400,
        letterSpacing: -4,
      }}
      className=" flex justify-center items-center text-[80px] font-bold "
    >
      {date}
    </p>
  );
};

const StreamingTimeAndDay = ({
  time,
  currentTheme,
  isGuerrilla,
  day,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        top: 394,
        width: 420,
        height: 80,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        fontSize: 64,
        color: colors[currentTheme || "first"]["secondary"],
      }}
      className="absolute flex justify-center items-center "
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}{" "}
      {weekdays[weekdayOption][day].toUpperCase()}
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
        height: 240,
        width: "100%",
        top: 120,
      }}
      className="absolute flex justify-center items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 1.15,
        }}
        className="leading-none text-center"
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
        width: 488,
        height: 60,
        top: 26,
      }}
      className="absolute flex justify-start items-center "
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.secondary,
          color: colors["first"]["secondary"],
        }}
        className="leading-none text-left w-full"
        maxFontSize={48}
      >
        {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"]["online"].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      className="absolute -z-10"
      style={{
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
        width: 612,
        height: 528,
        top: 30,
      }}
      className="absolute w-full h-full flex flex-col items-center ml-4"
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
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  return (
    <div
      style={{
        width: 850,
        height: onlineCardHeight,
      }}
      key={time.day}
      className="relative flex justify-center "
    >
      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : (
        <>
          <CellContentArea>
            <CellTextTitle cellTextTitle={entrySubTitle} />
            <CellTextMainTitle mainTitle={entryMainTitle} />

            <StreamingTimeAndDay
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
              day={time.day}
            />
          </CellContentArea>
          <OnlineCardBG day={time.day} />
        </>
      )}
    </div>
  );
};

export default TimeTableCell;
