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
    <div
      style={{
        width: 120,
        height: 120,
        top: 248,
        left: 96,
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["primary"],
        fontSize: 48,
        fontWeight: 700,
        zIndex: 3,
      }}
      className="absolute flex flex-col justify-center items-center "
    >
      <p style={{ lineHeight: 1 }}>
        {weekdays[weekdayOption][day].toUpperCase()}.
      </p>
    </div>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["primary"],
        width: 120,
        height: 120,
        top: 100,
        left: 84,
        fontSize: 92,
        letterSpacing: -4,
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
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 300,
        height: 80,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["primary"],
        fontSize: 48,
        top: -4,
        left: 272,
        letterSpacing: -1,
      }}
      className=" absolute flex justify-start items-center"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
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
        left: 88,
        top: 120,
        height: 80,
        width: 800,
      }}
      className="absolute flex justify-start items-center "
    >
      <AutoResizeText
        style={{
          color: colors["first"]["secondary"],
          fontFamily: fontOption.primary,
        }}
        className="leading-none text-center"
        maxFontSize={48}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <>
      <div
        style={{
          width: 9,
          height: 42,
          backgroundColor: "#008BCB",
          position: "absolute",
          top: 208,
          left: 88,
        }}
      ></div>
      <div
        className="absolute flex justify-start items-center "
        style={{
          width: 600,
          height: 60,
          top: 200,
          left: 112,
        }}
      >
        <AutoResizeText
          style={{
            fontFamily: fontOption.primary,
            color: colors["first"]["tertiary"],
            opacity: 0.8,
          }}
          className="leading-none text-center"
          maxFontSize={32}
        >
          {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
        </AutoResizeText>
      </div>
    </>
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
      className="absolute inset-0 -z-10"
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
      style={{
        width: offlineCardWidth,
        height: offlineCardHeight,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"]["offline"].src.replace("./", "/")}
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

  return (
    <div className="relative flex">
      <div
        style={{ width: 303, height: 392 }}
        className="relative flex justify-center items-center"
      >
        <StreamingDate date={weekDate.getDate()} />
        <StreamingDay day={time.day} />
        <img src={Imgs["first"]["day"].src.replace("./", "/")} alt="day" />
      </div>
      <div
        style={{
          width: onlineCardWidth,
          height: onlineCardHeight,
        }}
        key={time.day}
        className="relative top-8 left-8 flex justify-center"
      >
        {time.isOffline ? (
          <OfflineCard day={time.day} />
        ) : (
          <>
            <StreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
            />

            <CellTextMainTitle mainTitle={entryMainTitle} />
            <CellTextTitle cellTextTitle={entrySubTitle} />
            <OnlineCardBG day={time.day} />
          </>
        )}
      </div>
    </div>
  );
};

export default TimeTableCell;
