import Image from "next/image";
import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { TDefaultCard, weekdays } from "@/utils/time-table/data";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import {
  cardContainerHeight,
  cardContainerWidth,
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
        color: colors[currentTheme || "first"]["tertiary"],
        top: 11,
        left: 2,
        width: 120,
      }}
      className="absolute flex justify-center items-center h-10 text-[19px]"
    >
      {weekdays[weekdayOption][day]}
    </p>
  );
};

const StreamingTime = ({ time, currentTheme }: StreamingTimeProps) => {
  return (
    <div
      style={{
        width: 80,
        height: 332,
        bottom: 42,
        right: 54,
        color: colors[currentTheme || "first"]["secondary"],
        lineHeight: 1,
        transform: "rotate(22deg)",
      }}
      className="absolute flex flex-col justify-center items-center shrink-0 text-[44px] "
    >
      {formatTime(time, "full", false)
        .split("")
        .map((t, i) => (t === ":" ? <p key={i}>{"*"}</p> : <p key={i}>{t}</p>))}
    </div>
  );
};

const CellTextDescription = ({
  currentTheme,
  description,
}: CellTextDescriptionProps) => {
  return (
    <div
      style={{
        width: 440,
        height: 260,
      }}
      className="relative flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 1.2,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={92}
        minFontSize={20}
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
        color: colors["first"]["primary"],
        lineHeight: 1.2,
      }}
      className=" flex justify-center items-center h-[28px] text-[36px] mt-5"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.topic}
    </p>
  );
};

interface OnlineCardBGProps {
  isTogether?: boolean;
}

const OnlineCardBG = ({ isTogether }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      className="absolute inset-0 -z-10"
    >
      <Image
        className="object-cover"
        src={Imgs["first"][
          isTogether ? "onlineTogether" : "online"
        ].src.replace("./", "/")}
        alt="online"
        fill
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      className="relative pointer-events-none"
      style={{
        width: offlineCardWidth,
        height: offlineCardHeight,
      }}
      key={day}
    >
      <Image
        src={Imgs[currentTheme || "first"]["offline"].src.replace("./", "/")}
        alt="offline"
        width={offlineCardWidth}
        height={offlineCardHeight}
      />
    </div>
  );
};

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 440,
        height: 340,
        marginTop: 84,
        marginLeft: 52,
      }}
      className="w-full h-full flex flex-col items-center"
    >
      {children}
    </div>
  );
};

interface WeekDayProps {
  day: number;
}

const WeekDay = ({ day }: WeekDayProps) => {
  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        top: 66,
        left: 74,
        width: 100,
        height: 100,
        transform: "rotate(-4deg)",
      }}
      className="absolute text-[80px] flex justify-center items-center"
    >
      {weekdays[weekdayOption][day]}
    </p>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  const isTogether = !!time.with;
  if (!weekDate) return "Loading";

  return (
    <div
      style={{
        width: cardContainerWidth,
        height: cardContainerHeight,
      }}
      className="relative flex justify-center items-center"
    >
      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : (
        <div
          style={{
            width: onlineCardWidth,
            height: onlineCardHeight,
          }}
          key={time.day}
          className="relative flex justify-center"
        >
          <WeekDay day={time.day} />
          <CellContentArea>
            <CellTextDescription description={time.description as string} />
            <CellTextTitle cellTextTitle={time.topic as string} />
            <StreamingTime time={time.time as string} />
          </CellContentArea>
          <OnlineCardBG isTogether={isTogether} />
        </div>
      )}
    </div>
  );
};

export default TimeTableCell;
