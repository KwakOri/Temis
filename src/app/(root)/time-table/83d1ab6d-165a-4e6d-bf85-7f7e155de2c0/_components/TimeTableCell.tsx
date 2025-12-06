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
    <p
      className=""
      style={{
        color: colors[currentTheme || "first"]["primary"],

        fontSize: 40,
      }}
    >
      {weekdays[weekdayOption][day]}요일
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p style={{}} className=" ">
      {date}일
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
        lineHeight: 1,
        fontFamily: fontOption.primary,
        fontSize: 40,
        color: colors["first"]["primary"],
      }}
      className=" flex justify-center items-center w-full mt-2"
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
        height: 236,
        width: "100%",
      }}
      className="flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          color: colors["first"]["primary"],
          fontFamily: fontOption.primary,
          fontWeight: 600,
          lineHeight: 1.1,
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
    <div className="flex justify-center items-center w-full h-16">
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 400,
          color: colors["first"]["primary"],
        }}
        className="leading-none text-center w-full"
        maxFontSize={50}
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
      style={{
        width: offlineCardWidth,
        height: offlineCardHeight,
        top: -52,
        left: -52,
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
        width: 500,
        height: 660,
        left: -46,
      }}
      className="relative flex flex-col items-center"
    >
      {children}
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
  index,
}) => {
  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  const pos: CSSProperties[] = [
    { position: "absolute", top: 156, left: 1900, rotate: "-6.7deg" },
    { position: "absolute", top: 938, left: 179, rotate: "2.8deg" },
    { position: "absolute", top: 900, left: 1000, rotate: "-8.5deg" },
    { position: "absolute", top: 850, left: 1838, rotate: "0.8deg" },
    { position: "absolute", top: 1630, left: 320, rotate: "-8.8deg" },
    { position: "absolute", top: 1589, left: 1153, rotate: "3deg" },
    { position: "absolute", top: 1544, left: 1978, rotate: "-8.3deg" },
  ];

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
        ...pos[index],
      }}
      key={time.day}
      className="flex flex-col items-center justify-center"
    >
      <CellContentArea>
        <div
          style={{
            color: colors[currentTheme || "first"]["primary"],
            fontSize: 40,
          }}
          className="flex gap-2 items-center justify-center w-full mt-34"
        >
          <StreamingDate date={weekDate.getDate()} />
          <StreamingDay day={time.day} />
        </div>

        <CellTextTitle cellTextTitle={entrySubTitle} />
        <CellTextMainTitle mainTitle={entryMainTitle} />

        <StreamingTime
          isGuerrilla={primaryEntry.isGuerrilla}
          time={entryTime}
        />
      </CellContentArea>
      <CardBG isOffline={time.isOffline} day={time.day} />
    </div>
  );
};

export default TimeTableCell;
