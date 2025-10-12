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
  time: string;
  isGuerrilla: boolean;
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
      style={{
        color: colors[currentTheme || "first"]["secondary"],
        top: 156,
        right: 24,
        width: 100,
      }}
      className="absolute flex justify-center items-center h-10 text-[48px]"
    >
      {weekdays[weekdayOption][day]}
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["tertiary"],
        top: 48,
        left: 28,
        width: 120,
        transform: "rotate(-22deg)",
      }}
      className="absolute flex justify-center items-center text-[56px] font-bold"
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
  const [hour, minute] = formatTime(time, "full").split(":");

  return (
    <div
      style={{
        bottom: 114,
        right: 24,
        width: 100,
        height: 204,
        lineHeight: 1,
        color: colors[currentTheme || "first"]["secondary"],
      }}
      className="absolute grid grid-rows-3 justify-center items-center text-center "
    >
      {isGuerrilla ? (
        <>
          <p className="text-[44px]  font-bold">{"게"}</p>
          <p className="bg-[#AE3336] p-1 rounded-xl text-[44px]  font-bold">
            {"릴"}
          </p>
          <p className="text-[44px]  font-bold">{"라"}</p>
        </>
      ) : (
        <>
          <p className="text-[44px]  font-bold">{hour}</p>
          <div></div>
          <p className="text-[44px]  font-bold">{minute}</p>
        </>
      )}
    </div>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        height: 260,
        width: "100%",
      }}
      className="flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["tertiary"],
          lineHeight: 1.2,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={94}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <p
      style={{
        color: colors["first"]["quaternary"],
      }}
      className=" flex justify-center items-center text-[38px] "
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
    </p>
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
      className=" pointer-events-none"
      style={{
        paddingTop: 2,
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
        width: 560,
        height: 340,
      }}
      className="w-full h-full flex flex-col pt-4 items-center"
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
      className="relative flex justify-center pr-26 pt-34"
    >
      <CellContentArea>
        <CellTextMainTitle mainTitle={entryMainTitle} />
        <CellTextTitle cellTextTitle={entrySubTitle} />

        <StreamingDay day={time.day} />
        <StreamingTime
          time={entryTime}
          isGuerrilla={primaryEntry.isGuerrilla}
        />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
