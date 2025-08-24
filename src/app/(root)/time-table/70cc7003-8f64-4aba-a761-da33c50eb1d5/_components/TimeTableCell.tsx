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

interface DayAndTimeProps {
  isPink: boolean;
  currentTheme?: TTheme;
  day: number;
  time: string;
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
  isPink: boolean;
  cellTextTitle: string | null;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  isPink: boolean;
  day: number;
  currentTheme?: TTheme;
}

const isPink = (day: number) => {
  switch (day) {
    case 0:
    case 3:
    case 5:
      return true;
    default:
      return false;
  }
};

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

const StreamingTime = ({ time, currentTheme }: StreamingTimeProps) => {
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
      <p className="text-[44px]  font-bold">{hour}</p>
      <div></div>
      <p className="text-[44px]  font-bold">{minute}</p>
    </div>
  );
};

const StreamingDayAndTime = ({
  isPink,
  currentTheme,
  day,
  time,
}: DayAndTimeProps) => {
  return (
    <p
      style={{
        top: 68,
        left: isPink ? 160 : 174,
        width: 280,
        lineHeight: 1,
        fontFamily: fontOption["primary"],
      }}
      className="absolute flex justify-center items-center text-[56px]"
    >
      {weekdays[weekdayOption][day].toUpperCase()} {formatTime(time, "full")}
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
        height: 220,
        width: "100%",
      }}
      className="flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={104}
        maxHeight={220}
        parentRotation={-8}
      >
        {description ? (description as string) : placeholders.description}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ isPink, cellTextTitle }: CellTextTopicProps) => {
  return (
    <p
      style={{
        color: isPink ? "#DB9DB3" : "#A1BAD1",
      }}
      className=" flex justify-center items-center text-[48px] mt-1"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.topic}
    </p>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  const dayType = day % 2 === 0 ? "onlineEven" : "onlineOdd";
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
        src={Imgs["first"][
          isPink(day) ? "onlinePink" : "onlineSky"
        ].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ isPink, day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      className=" relative pointer-events-none"
      style={{
        paddingTop: 2,
        width: offlineCardWidth,
        height: offlineCardHeight,
        left: isPink ? -20 : 0,
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || "first"][
          isPink ? "offlinePink" : "offlineSky"
        ].src.replace("./", "/")}
        alt="offline"
        style={{
          width: offlineCardWidth,
          height: offlineCardHeight,
        }}
      />
    </div>
  );
};

interface CellContentAreaProps {
  day: number;
}

const CellContentArea = ({
  children,
  day,
}: PropsWithChildren<CellContentAreaProps>) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 500,
        height: 340,
        left: isPink(day) ? 10 : -10,
      }}
      className="flex flex-col pt-4 items-center relative px-4"
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

  if (time.isOffline) {
    return <OfflineCard isPink={isPink(time.day)} day={time.day} />;
  }

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
        left: isPink(time.day) ? -20 : 0,
        color: colors["first"][isPink(time.day) ? "secondary" : "tertiary"],
      }}
      key={time.day}
      className="relative flex justify-center pt-42"
    >
      <StreamingDayAndTime
        day={time.day}
        time={time.time as string}
        isPink={isPink(time.day)}
      />
      <CellContentArea day={time.day}>
        <CellTextDescription description={time.description as string} />
        <CellTextTitle
          isPink={isPink(time.day)}
          cellTextTitle={time.topic as string}
        />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
