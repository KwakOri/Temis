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
  isOrange: boolean;
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  isOrange: boolean;
  isGuerrilla: boolean;
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps {
  isOrange: boolean;
  date: number;
  currentTheme?: TTheme;
}

interface CellTextMainTitleProps {
  isOrange: boolean;
  currentTheme?: TTheme;
  mainTitle: string;
}

interface CellTextSubTitleProps {
  isOrange: boolean;
  cellTextTitle: string | null;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  isOrange: boolean;
  day: number;
  currentTheme?: TTheme;
}

const StreamingDay = ({ isOrange, currentTheme, day }: DayTextProps) => {
  return (
    <div
      style={{
        width: 120,
        height: 120,
        top: 112,
        left: 86,
        fontFamily: fontOption.primary,
        color:
          colors[currentTheme || "first"][isOrange ? "secondary" : "primary"],
        fontSize: 36,
        fontWeight: 700,
        zIndex: 3,
      }}
      className="absolute flex flex-col justify-center items-start"
    >
      <p style={{ lineHeight: 1 }}>
        {weekdays[weekdayOption][day].toUpperCase()}
      </p>
    </div>
  );
};

const StreamingDate = ({ isOrange, date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        color:
          colors[currentTheme || "first"][isOrange ? "secondary" : "primary"],
        width: 200,
        height: 120,
        top: 196,
        left: 72,
        fontSize: 128,
        fontWeight: 900,

        lineHeight: 1,
      }}
      className=" absolute flex justify-center items-center"
    >
      {date}
    </p>
  );
};

const StreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  isOrange,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 300,
        height: 80,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        color:
          colors[currentTheme || "first"][isOrange ? "secondary" : "primary"],
        fontSize: 36,
        fontWeight: 700,
        bottom: 28,
        left: 300,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
    </p>
  );
};

const CellTextMainTitle = ({
  isOrange,
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        left: 360,
        top: 210,
        height: 100,
        width: 480,
        fontWeight: 700,
      }}
      className="absolute flex justify-center items-start"
    >
      <AutoResizeText
        style={{
          color: colors["first"][isOrange ? "secondary" : "primary"],
          fontFamily: fontOption.primary,
          lineHeight: 1.1,
        }}
        className="leading-none text-center"
        maxFontSize={48}
        multiline
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ isOrange, cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <div
      className="absolute flex justify-center items-center"
      style={{
        width: 480,
        height: 60,
        top: 104,
        left: 360,
      }}
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          color: colors["first"][isOrange ? "secondary" : "primary"],
          fontWeight: 700,
        }}
        className="leading-none text-center"
        maxFontSize={36}
      >
        {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
  isOrange: boolean;
}

const OnlineCardBG = ({ day, isOrange }: OnlineCardBGProps) => {
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
        src={Imgs["first"][
          isOrange ? "online_orange" : "online_brown"
        ].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, isOrange, currentTheme }: OfflineCardProps) => {
  return (
    <div
      style={{
        width: offlineCardWidth,
        height: offlineCardHeight,
        top: -90,
        left: -30,
      }}
      className="absolute inset-0 z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][
          isOrange ? "offline_orange" : "offline_brown"
        ].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
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

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";
  const orangeDays = [0, 3, 4];
  const isOrange = orangeDays.includes(time.day);
  return (
    <div className="relative flex">
      <div
        style={{
          width: onlineCardWidth,
          height: onlineCardHeight,
        }}
        key={time.day}
        className="relative top-8 left-8 flex justify-center"
      >
        {time.isOffline ? (
          <OfflineCard day={time.day} isOrange={isOrange} />
        ) : (
          <>
            <StreamingTime
              isOrange={isOrange}
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
            />
            <StreamingDate isOrange={isOrange} date={weekDate.getDate()} />
            <StreamingDay isOrange={isOrange} day={time.day} />

            <CellTextMainTitle isOrange={isOrange} mainTitle={entryMainTitle} />
            <CellTextTitle isOrange={isOrange} cellTextTitle={entrySubTitle} />
          </>
        )}
        <OnlineCardBG isOrange={isOrange} day={time.day} />
      </div>
    </div>
  );
};

export default TimeTableCell;
