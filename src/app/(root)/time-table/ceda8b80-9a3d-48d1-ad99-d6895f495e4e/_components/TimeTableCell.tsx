import React, { CSSProperties, PropsWithChildren } from "react";

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
  isOffline: boolean;
}

interface StreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  currentTheme?: TTheme;
  isOffline: boolean;
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
  cellStyle: CSSProperties;
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  day: number;
  currentTheme?: TTheme;
}

const StreamingDay = ({ currentTheme, day, isOffline }: DayTextProps) => {
  return (
    <div
      style={{
        width: 200,
        height: 120,
        top: 32,
        fontFamily: fontOption.primary,
        color: colors["first"][isOffline ? "secondary" : "primary"],
        fontSize: 58,
        fontWeight: 500,
        zIndex: 3,
      }}
      className="absolute flex flex-col justify-center items-center "
    >
      <p style={{ lineHeight: 1 }}>
        {weekdays[weekdayOption][day].toUpperCase()}
      </p>
    </div>
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

const StreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  isOffline,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 300,
        height: 72,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        fontWeight: 500,
        fontSize: 44,
        top: 160,
        color: colors[currentTheme || "first"]["quaternary"],
      }}
      className=" absolute flex justify-center items-center "
    >
      {isOffline
        ? "OFF-LINE"
        : isGuerrilla
        ? "게릴라"
        : formatTime(time, "half")}
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
        height: 280,
        width: "100%",
      }}
      className="flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["quaternary"],
          fontFamily: fontOption.primary,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        multiline={true}
        maxFontSize={100}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <div
      style={{ width: "80%" }}
      className="flex justify-center items-center h-16 mt-4"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 500,
          color: colors["first"]["quaternary"],
        }}
        className="leading-none text-center w-full"
        maxFontSize={44}
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

const OnlineCardBG = ({ isOffline, day }: OnlineCardBGProps) => {
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
        width: 580,
        height: 400,
        top: 248,
      }}
      className="absolute w-full h-full flex flex-col items-center"
    >
      {children}
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  cellStyle,
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

  const days = ["月", "火", "水", "木", "金", "土", "日"];

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
        rotate: "-4deg",
        ...cellStyle,
      }}
      key={time.day}
      className="absolute flex flex-col items-center justify-start "
    >
      <div
        className="absolute flex justify-center items-center gap-11 pt-2"
        style={
          time.day === 3
            ? { width: 333, height: 153, left: 0, bottom: -172 }
            : { width: 333, height: 153, right: 0, top: -172 }
        }
      >
        <p
          className="relative z-10"
          style={{
            color: "white",
            fontSize: 90,
            fontFamily: fontOption.secondary,
          }}
        >
          {days[time.day]}
        </p>

        <p
          className="relative z-10"
          style={{
            color: "white",
            fontSize: 90,
            fontFamily: fontOption.secondary,
          }}
        >
          {weekDate.getDate()}
        </p>

        <img
          className="absolute inset-0"
          src={Imgs["first"][time.day % 2 === 0 ? "dayBlack" : "dayBlue"].src}
          alt=""
        />
      </div>
      {time.isOffline || (
        <>
          <StreamingTime
            isOffline={time.isOffline}
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
          />

          <CellContentArea>
            <CellTextMainTitle mainTitle={entryMainTitle} />
            <CellTextTitle cellTextTitle={entrySubTitle} />
          </CellContentArea>
        </>
      )}
      <OnlineCardBG isOffline={time.isOffline} day={time.day} />
    </div>
  );
};

export default TimeTableCell;
