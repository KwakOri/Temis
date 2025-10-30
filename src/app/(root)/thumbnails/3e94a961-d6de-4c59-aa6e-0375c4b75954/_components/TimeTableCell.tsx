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
        top: 78,
        left: 58,
        fontFamily: fontOption.primary,
        color: colors["first"]["quaternary"],
        fontSize: 80,
        fontWeight: 700,
        rotate: "-10deg",
        zIndex: 3,
      }}
      className="absolute flex flex-col justify-center items-center"
    >
      <p style={{ lineHeight: 1 }}>{weekdays[weekdayOption][day]}</p>
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
  const [timeZone, timeDetail] = formatTime(time, "half").split(" ");
  return (
    <p
      style={{
        width: 260,
        height: 80,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        fontWeight: 700,
        fontSize: 52,
        color: colors[currentTheme || "first"]["tertiary"],
        rotate: "-8deg",
        top: 68,
        left: 216,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : timeDetail + " " + timeZone}
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
      className="flex justify-center items-center mt-2"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          fontFamily: fontOption.primary,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        multiline={true}
        maxFontSize={95}
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
    <div className="flex justify-center items-center w-full h-16 mt-5">
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 700,
          color: colors["first"]["secondary"],
        }}
        className="leading-none text-center w-full"
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
        top: -52,
        left: -52,
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
        width: 480,
        height: 360,
        top: 200,
        left: 8,
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

  if (time.isOffline) {
    return (
      <div
        style={{
          width: 740,
          height: 700,
        }}
        key={time.day}
        className="relative flex justify-center"
      >
        <StreamingDay day={time.day} />
        <OfflineCard day={time.day} />;
      </div>
    );
  }

  return (
    <div
      style={{
        width: 740,
        height: 700,
      }}
      key={time.day}
      className="relative flex justify-center"
    >
      <StreamingTime isGuerrilla={primaryEntry.isGuerrilla} time={entryTime} />
      <StreamingDay day={time.day} />
      <CellContentArea>
        <CellTextTitle cellTextTitle={entrySubTitle} />
        <CellTextMainTitle mainTitle={entryMainTitle} />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
