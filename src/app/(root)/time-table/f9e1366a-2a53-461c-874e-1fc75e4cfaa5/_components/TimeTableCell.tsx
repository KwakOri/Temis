import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { padZero } from "@/utils/date-formatter";
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
  date: Date;
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
        top: 112,
        left: 86,
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["primary"],
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

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["primary"],
        width: 240,
        height: 40,
        top: 530,
        left: 56,
        fontSize: 31,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: 1,
      }}
      className=" absolute flex justify-start items-center "
    >
      {date.getFullYear()}/{padZero(date.getMonth())}/{padZero(date.getDate())}
    </p>
  );
};

const StreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  const [zone, halftime] = formatTime(time, "half").split(" ");
  return (
    <p
      style={{
        width: 184,
        height: 40,
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["primary"],
        top: 530,
        left: 308,
        fontSize: 31,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: 1,
      }}
      className=" absolute flex justify-start items-center "
    >
      {isGuerrilla ? "게릴라" : halftime + " " + zone}
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
        height: 152,
        width: "100%",
        fontWeight: 700,
        top: 104,
      }}
      className="absolute flex justify-center items-center "
    >
      <AutoResizeText
        style={{
          color: colors["first"]["primary"],
          fontFamily: fontOption.primary,
          lineHeight: 1.2,
          letterSpacing: -2,
        }}
        className="leading-none text-center"
        maxFontSize={58}
        multiline
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <div
      className="absolute flex justify-center items-center "
      style={{
        top: 56,
        width: "100%",
        height: 40,
      }}
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          color: colors["first"]["secondary"],
          fontWeight: 500,
          letterSpacing: -2,
        }}
        className="leading-none text-center"
        maxFontSize={30}
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
        width: 360,
        height: 302,
        top: 148,
      }}
      className="relative flex flex-col items-center "
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
        style={{
          width: onlineCardWidth,
          height: onlineCardHeight,
        }}
        key={time.day}
        className="relative flex justify-center "
      >
        {time.isOffline ? (
          <>
            <OfflineCard day={time.day} />
            <StreamingDate date={weekDate} />
          </>
        ) : (
          <>
            <CellContentArea>
              <CellTextMainTitle mainTitle={entryMainTitle} />
              <CellTextTitle cellTextTitle={entrySubTitle} />
            </CellContentArea>
            <StreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
            />
            <StreamingDate date={weekDate} />
            <OnlineCardBG day={time.day} />
          </>
        )}
      </div>
    </div>
  );
};

export default TimeTableCell;
