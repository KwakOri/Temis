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
        width: 140,
        height: 266,
        top: 6,
        right: 10,
        fontFamily: fontOption.primary,
        fontSize: 60,
      }}
      className="absolute flex flex-col justify-center items-center text-white/80 pt-1"
    >
      <p style={{ lineHeight: 1 }}>{weekdays[weekdayOption][day]}</p>
      <p style={{ lineHeight: 1 }}>요</p>
      <p style={{ lineHeight: 1 }}>일</p>
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
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 420,
        height: 80,
        lineHeight: 1,
        fontFamily: fontOption.secondary,
        fontWeight: 700,
        fontSize: 52,
        color: colors[currentTheme || "first"]["primary"],
      }}
      className="flex justify-center items-center"
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
        height: 224,
        width: 560,
      }}
      className="flex justify-center items-center shrink-0 my-2"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["secondary"],
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
    <div className="flex justify-center items-center w-120 h-20">
      <AutoResizeText
        style={{
          fontFamily: fontOption.secondary,
          color: colors["first"]["primary"],
        }}
        className="leading-none text-center w-full"
        maxFontSize={52}
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
      className=" relative pointer-events-none"
      style={{
        paddingTop: 2,
        width: offlineCardWidth,
        height: offlineCardHeight,
      }}
      key={day}
    >
      <StreamingDay day={day} />
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
        width: 560,
        height: 360,
        top: 168,
        left: 20,
      }}
      className="relative w-full h-full flex flex-col items-center "
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
    return <OfflineCard day={time.day} />;
  }

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
      <CellContentArea>
        <StreamingTime
          isGuerrilla={primaryEntry.isGuerrilla}
          time={entryTime}
        />
        <CellTextMainTitle mainTitle={entryMainTitle} />
        <CellTextTitle cellTextTitle={entrySubTitle} />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
