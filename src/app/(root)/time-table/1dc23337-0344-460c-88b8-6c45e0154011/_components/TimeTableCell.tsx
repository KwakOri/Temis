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
        fontFamily: fontOption.secondary,
        fontWeight: 300,
        fontSize: 44,
        bottom: 92,
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
        height: 224,
        width: "100%",
      }}
      className="flex justify-center items-center "
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["quaternary"],
          fontFamily: fontOption.primary,
          fontWeight: 700,
          lineHeight: 1.05,
        }}
        className="leading-none text-center"
        multiline={true}
        maxFontSize={80}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <div className="flex justify-center items-center w-full h-16 mt-7">
      <AutoResizeText
        style={{
          fontFamily: fontOption.secondary,
          fontWeight: 300,
          color: colors["first"]["tertiary"],
        }}
        className="leading-none text-center w-full"
        maxFontSize={40}
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
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const cardName = "online_" + days[day];
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
        src={Imgs["first"][cardName].src.replace("./", "/")}
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
        width: 480,
        height: 360,
        top: 188,
      }}
      className="relative w-full h-full flex flex-col items-center px-10"
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

  if (time.isOffline) {
    return (
      <div
        style={{
          width: onlineCardWidth,
          height: offlineCardHeight,
        }}
        key={time.day}
        className="relative flex justify-center"
      >
        <OfflineCard day={time.day} />;
      </div>
    );
  }

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      key={time.day}
      className="relative flex flex-col items-center justify-start "
    >
      <StreamingTime
        isOffline={time.isOffline}
        isGuerrilla={primaryEntry.isGuerrilla}
        time={entryTime}
      />

      <CellContentArea>
        <CellTextTitle cellTextTitle={entrySubTitle} />
        <CellTextMainTitle mainTitle={entryMainTitle} />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
