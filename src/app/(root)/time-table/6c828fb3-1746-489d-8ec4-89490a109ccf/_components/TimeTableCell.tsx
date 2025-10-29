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
        color: "#5a565c",
        fontFamily: fontOption.secondary,
        width: 120,
        height: 120,
        left: 26,
        top: 30,
        fontSize: 88,
        letterSpacing: -4,
      }}
      className=" absolute flex justify-center items-center "
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
        width: 260,
        height: 80,
        lineHeight: 1,
        fontFamily: fontOption.secondary,
        fontWeight: 700,
        fontSize: 35.5,
        color: "#73677b",
        top: 54,
        right: 54,
        letterSpacing: -1,
      }}
      className=" absolute flex justify-center items-center"
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
        left: 374,
        top: 46,
        height: 60,
        width: 600,
      }}
      className="absolute flex justify-center items-center "
    >
      <AutoResizeText
        style={{
          color: "#eae6e4",
          fontFamily: fontOption.primary,
        }}
        className="leading-none text-center"
        maxFontSize={31}
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
        width: 600,
        height: 60,
        top: 80,
        left: 374,
      }}
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.tertiary,
          color: "#eae6e4",
          opacity: 0.8,
        }}
        className="leading-none text-center w-full"
        maxFontSize={22}
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
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const cardName = "offline_" + days[day];
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
        src={Imgs["first"][cardName].src.replace("./", "/")}
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

  if (time.isOffline) {
    return (
      <div
        style={{
          width: onlineCardWidth,
          height: onlineCardHeight,
        }}
        key={time.day}
        className="relative flex justify-center"
      >
        <StreamingDate date={weekDate.getDate()} />
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
      className="relative flex justify-center"
    >
      <StreamingTime isGuerrilla={primaryEntry.isGuerrilla} time={entryTime} />
      <StreamingDate date={weekDate.getDate()} />
      <CellContentArea>
        <CellTextMainTitle mainTitle={entryMainTitle} />
        <CellTextTitle cellTextTitle={entrySubTitle} />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
