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
  Settings,
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
  const getFormattedTimeByAki = (time: string): string => {
    const tempArr = time.split(":");
    const hour = Number(tempArr[0]);
    const isAfter = hour >= 12;

    // 12시간 형식으로 변환
    let displayHour = hour;
    if (hour === 0) {
      displayHour = 12; // 자정 0시 -> AM 12시
    } else if (hour > 12) {
      displayHour = hour - 12; // 13시 이상 -> PM 1시 이상
    }
    // 12시(정오)는 그대로 PM 12시

    tempArr[0] = displayHour.toString();
    const amPm = isAfter ? "PM" : "AM";

    return amPm + " " + getFormattedTime(tempArr.join(":"));
  };

  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["quaternary"],
        bottom: 76,

        width: 220,
      }}
      className="absolute flex justify-center items-center h-10 text-[36px]"
    >
      {getFormattedTimeByAki(time)}
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
        height: "170px",
      }}
      className="flex justify-center items-center mt-5"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["secondary"],
          lineHeight: 1,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={68}
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
      className=" flex justify-center items-center h-[28px] text-[36px]"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.topic}
    </p>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayName = days[day];

  return (
    <div
      style={{
        ...Settings.offline,
      }}
      className="absolute inset-0 -z-10"
    >
      <Image
        className="object-cover"
        style={{
          transform: "rotate(2.7deg)",
        }}
        src={Imgs["first"][dayName].src.replace("./", "/")}
        alt="online"
        fill
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const dayType = day % 2 ? "even" : "odd";
  return (
    <div
      className=" pointer-events-none"
      style={{
        ...Settings.offline,
      }}
      key={day}
    >
      <Image
        src={Imgs[currentTheme || "first"][dayType].src.replace("./", "/")}
        alt="offline"
        style={{
          transform: "rotate(2.7deg)",
        }}
        width={Settings.offline.width}
        height={Settings.offline.height}
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
        height: 400,
        marginTop: 118,
        marginLeft: 12,
      }}
      className="w-full h-full flex flex-col pt-16 pr-2 items-center"
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
      className="relative flex justify-center"
    >
      <CellContentArea>
        <CellTextTitle cellTextTitle={time.topic as string} />
        <CellTextDescription description={time.description as string} />
        <StreamingTime time={time.time as string} />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
