import Image from "next/image";
import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import {
  getFormattedTime,
  TDefaultCard,
  weekdays,
} from "@/utils/time-table/data";
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
    <p
      style={{
        color: colors[currentTheme || "first"]["tertiary"],
        top: 11,
        left: 2,
        width: 120,
      }}
      className="absolute flex justify-center items-center h-10 text-[19px]"
    >
      {getFormattedTime(time)}
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
        height: "80px",
      }}
      className="flex justify-center items-center "
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 1,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={36}
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
      }}
      className=" flex justify-center items-center h-[28px] text-[16px]"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.topic}
    </p>
  );
};

const OnlineCardBG = () => {
  return (
    <div
      style={{ width: onlineCardWidth, height: onlineCardHeight }}
      className="absolute -z-10"
    >
      <Image
        className="object-cover"
        src={Imgs["first"]["online"].src.replace("./", "/")}
        alt="online"
        fill
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
        width: offlineCardWidth + "px",
        height: offlineCardHeight + "px",
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
      }}
      className="w-full h-full flex flex-col pt-[48px] px-8"
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
    return <OfflineCard day={time.day} />;
  }

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      key={time.day}
      className="relative"
    >
      <CellContentArea>
        <StreamingDay day={time.day} />
        <StreamingTime time={time.time as string} />
        <CellTextDescription description={time.description as string} />
        <CellTextTitle cellTextTitle={time.title as string} />
      </CellContentArea>
      <OnlineCardBG />
    </div>
  );
};

export default TimeTableCell;
