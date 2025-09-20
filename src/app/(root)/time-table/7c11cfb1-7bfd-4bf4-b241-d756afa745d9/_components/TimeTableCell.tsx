import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { TDefaultCard, weekdays } from "@/utils/time-table/data";
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
  currentTheme?: TTheme;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface CellTextDescriptionProps {
  currentTheme?: TTheme;
  description: string;
}

interface CellTextTopicProps {
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
        color: colors[currentTheme || "first"]["primary"],
        top: 70,
        left: 28,
        width: 120,
        rotate: "-40deg",
      }}
      className="absolute flex justify-center items-center h-10 text-[50px]"
    >
      {weekdays[weekdayOption][day].toUpperCase()}
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

const StreamingTime = ({ time, currentTheme }: StreamingTimeProps) => {
  return (
    <p
      style={{
        top: 74,
        width: 420,
        height: 100,
        left: 166,
        lineHeight: 1,
        fontSize: 71,
        color: colors[currentTheme || "first"]["primary"],
      }}
      className="absolute flex flex-col justify-center items-center"
    >
      {formatTime(time, "half")}
    </p>
  );
};

const CellTextDescription = ({
  currentTheme,
  description,
}: CellTextDescriptionProps) => {
  return (
    <div
      style={{
        height: 240,
        width: "100%",
      }}
      className="flex justify-center items-center shrink-0 mt-7"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 1.2,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={96}
      >
        {description ? (description as string) : placeholders.description}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextTopicProps) => {
  return (
    <p
      style={{
        color: colors["first"]["secondary"],
      }}
      className=" flex justify-center items-center text-[36px] mt-7"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.topic}
    </p>
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
        scale: 0.96,
        left: -80,
      }}
      className="absolute inset-0 -z-10 overflow-visible"
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
        width: 500,
        height: 360,
        marginTop: 224,
      }}
      className="w-full h-full flex flex-col items-center"
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
  const entryDescription = (primaryEntry.description as string) || "";
  const entryTopic = (primaryEntry.topic as string) || "";

  return (
    <div
      style={{
        width: 660,
        height: onlineCardHeight,
        fontFamily: fontOption.primary,
      }}
      key={time.day}
      className="relative flex justify-center overflow-visible"
    >
      <StreamingDay day={time.day} />
      {time.isOffline || (
        <>
          <StreamingTime time={entryTime} />
          <CellContentArea>
            <CellTextDescription description={entryDescription} />
            <CellTextTitle cellTextTitle={entryTopic} />

            {/* <StreamingDate date={weekDate.getDate()} /> */}
          </CellContentArea>
        </>
      )}
      <CardBG day={time.day} isOffline={time.isOffline} />
    </div>
  );
};

export default TimeTableCell;
