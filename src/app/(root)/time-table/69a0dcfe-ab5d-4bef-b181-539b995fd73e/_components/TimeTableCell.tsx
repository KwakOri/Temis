import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import { padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { TDefaultCard, weekdays } from "@/utils/time-table/data";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import {
  colors,
  fontOption,
  Settings,
  weekdayOption,
} from "../_settings/settings";

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  isBig: boolean;
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface CellTextTitleProps {
  currentTheme?: TTheme;
  title: string;
}

interface CellTextDescriptionProps {
  description: string | null;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  isBig: boolean;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  day: number;
  isBig: boolean;
  currentTheme?: TTheme;
}

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  return (
    <p
      style={{
        color: Settings.card.online.day.fontColor,
        fontSize: Settings.card.online.day.fontSize,
        lineHeight: 1,
      }}
      className=" flex justify-center items-center "
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        fontSize: 92,
        color: colors[currentTheme || "first"]["tertiary"],
        lineHeight: 1,
      }}
      className=" font-bold"
    >
      {padZero(date)}
    </p>
  );
};

const StreamingTime = ({ isBig, time, currentTheme }: StreamingTimeProps) => {
  return (
    <p
      style={{
        top: 226,
        left: isBig ? 2 : 16,
        height: 90,
        width: 220,
        lineHeight: 1,
        color: "#fff3a5",
        rotate: "-5deg",
        fontSize: Settings.card.online.time.fontSize,
      }}
      className="absolute flex justify-center items-center"
    >
      {formatTime(time, "full")}
    </p>
  );
};

const CellTextTitle = ({ currentTheme, title }: CellTextTitleProps) => {
  return (
    <div
      style={{
        height: 120,
        width: "100%",
      }}
      className="flex justify-start items-center shrink-0 mt-5"
    >
      <AutoResizeText
        style={{
          color: Settings.card.online.title.fontColor,
          lineHeight: 1.2,
        }}
        className="leading-none text-left w-full"
        maxFontSize={Settings.card.online.title.fontSize}
      >
        {title ? (title as string) : placeholders.topic}
      </AutoResizeText>
    </div>
  );
};

const CellTextDescription = ({ description }: CellTextDescriptionProps) => {
  return (
    <div
      style={{
        height: 100,
        width: "100%",
      }}
      className="flex justify-start items-center shrink-0 mt-1"
    >
      <AutoResizeText
        style={{
          color: Settings.card.online.description.fontColor,
          lineHeight: 1.2,
        }}
        className="leading-none text-left w-full"
        maxFontSize={Settings.card.online.description.fontSize}
        multiline
      >
        {description ? (description as string) : placeholders.description}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
  isBig: boolean;
}

const OnlineCardBG = ({ day, isBig }: OnlineCardBGProps) => {
  const cards = [
    "onlineYellow",
    "online",
    "bigOnlineYellow",
    "online",
    "bigOnline",
    "onlineYellow",
    "online",
  ];
  return (
    <div
      style={{
        width: isBig ? 1266 : 1220,
        height: isBig ? 830 : 382,
        top: isBig ? -47 : -5,
        left: isBig ? -41 : 10,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][cards[day]].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme, isBig }: OfflineCardProps) => {
  const cards = [
    "offlineYellow",
    "offline",
    "bigOfflineYellow",
    "offline",
    "bigOffline",
    "offlineYellow",
    "offline",
  ];
  return (
    <div
      style={{
        width: isBig ? 1266 : 1220,
        height: isBig ? 830 : 382,
        top: isBig ? -47 : -5,
        left: isBig ? -41 : 10,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][cards[day]].src.replace("./", "/")}
        alt="offline"
      />
    </div>
  );
};

interface CellContentAreaProps {
  isBig: boolean;
}

const CellContentArea = ({
  isBig,
  children,
}: PropsWithChildren<CellContentAreaProps>) => {
  return (
    <div
      style={{
        width: 700,
        height: 280,
        top: isBig ? 72 : 64,
        left: 280,
      }}
      className="w-full h-full flex flex-col items-center absolute"
    >
      {children}
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  isBig,
  currentTheme,
}) => {
  if (!weekDate) return "Loading";

  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: Settings.card.online.width,
        height: isBig ? 750 : Settings.card.online.height,
      }}
      key={time.day}
      className="relative flex justify-center"
    >
      <div
        className="flex flex-col items-center justify-center absolute"
        style={{
          top: -4,
          left: isBig ? 0 : 10,
          width: 216,
          height: 216,
          rotate: "-8deg",
        }}
      >
        <StreamingDay day={time.day} />
        <StreamingDate date={weekDate.getDate()} />
      </div>
      {time.isOffline ? (
        <>
          <OfflineCard day={time.day} isBig={isBig} />
          <CellContentArea isBig={isBig}>
            <div
              className={`w-full h-full flex flex-col justify-start ${
                isBig ? "pt-10" : "pt-2"
              }`}
            >
              <p className="text-white text-[100px]">오늘은 쉬는날!!</p>
              <p className="text-white text-[54px]">다음 방송에서 봐~</p>
            </div>
          </CellContentArea>
        </>
      ) : (
        <>
          {" "}
          <StreamingTime isBig={isBig} time={time.time as string} />
          <CellContentArea isBig={isBig}>
            <CellTextTitle title={time.topic as string} />
            <CellTextDescription description={time.description as string} />
          </CellContentArea>
          <OnlineCardBG day={time.day} isBig={isBig} />
        </>
      )}
    </div>
  );
};

export default TimeTableCell;
