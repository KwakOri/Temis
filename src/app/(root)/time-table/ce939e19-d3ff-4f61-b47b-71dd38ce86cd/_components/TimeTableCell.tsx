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
  isOffline: boolean;
  isGuerrilla: boolean;
  time: string;
  day: number;
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
    <p
      style={{
        fontFamily: fontOption.primary,
        color: colors[currentTheme || "first"]["primary"],
        width: 300,
        height: 120,
        top: 584,
        left: 168,
      }}
      className="absolute flex justify-center items-center text-[96px]"
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <>
      <p
        style={{
          color: colors[currentTheme || "first"]["primary"],
          width: 240,
          height: 32,
          lineHeight: 1,
          fontFamily: fontOption.primary,
          fontSize: 26,
          rotate: "90deg",
          top: 672,
          right: -24,
        }}
        className=" absolute flex justify-center items-center "
      >
        {date.getFullYear()}.{padZero(date.getMonth() + 1)}.
        {padZero(date.getDate())}
      </p>
      <p
        style={{
          color: colors[currentTheme || "first"]["primary"],
          width: 240,
          height: 32,
          lineHeight: 1,
          fontFamily: fontOption.primary,
          fontSize: 26,
          rotate: "-90deg",
          top: 672,
          left: -22,
        }}
        className=" absolute flex justify-center items-center "
      >
        {date.getFullYear()}.{padZero(date.getMonth() + 1)}.
        {padZero(date.getDate())}
      </p>
    </>
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
        color: colors[currentTheme || "first"]["secondary"],
        fontWeight: 500,
        fontSize: 48,
        top: 702,
      }}
      className=" absolute flex justify-center items-center "
    >
      {isOffline ? "--:--" : isGuerrilla ? "게릴라" : formatTime(time, "half")}
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
        height: 320,
        width: "100%",
        top: 36,
      }}
      className="absolute flex justify-center items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        multiline={true}
        maxFontSize={88}
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
        width: "100%",
        height: 60,
        top: 400,
      }}
      className="absolute flex justify-center items-center "
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.secondary,
          color: colors["first"]["primary"],
        }}
        className="leading-none text-center w-full"
        maxFontSize={45}
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
        width: 490,
        height: 506,
        top: 72,
      }}
      className="absolute flex flex-col justify-center items-center "
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
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      key={time.day}
      className="relative flex justify-center "
    >
      <StreamingDate date={weekDate} />
      <StreamingDay day={time.day} />
      <StreamingTime
        isOffline={time.isOffline}
        isGuerrilla={primaryEntry.isGuerrilla}
        time={entryTime}
        day={time.day}
      />
      <CellContentArea>
        {time.isOffline ? (
          <>
            <p
              style={{
                fontFamily: fontOption.primary,
                color: colors[currentTheme || "first"]["primary"],
                fontSize: 88,
              }}
            >
              OFFLINE
            </p>
          </>
        ) : (
          <>
            <CellTextTitle cellTextTitle={entrySubTitle} />
            <CellTextMainTitle mainTitle={entryMainTitle} />
          </>
        )}
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
