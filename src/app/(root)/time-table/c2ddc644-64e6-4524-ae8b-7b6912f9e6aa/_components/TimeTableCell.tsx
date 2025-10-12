import Image from "next/image";
import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { fillZero, weekdays } from "@/utils/time-table/data";
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

const StreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  const getFormattedStreamingTime = (time: string): string => {
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

    return amPm + " " + fillZero(Number(tempArr[0])) + ":" + tempArr[1];
  };

  return (
    <div
      style={{
        width: 326,
        height: 90,
        bottom: -18,
        right: 60,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <p
        style={{
          color: colors[currentTheme || "first"]["primary"],
          lineHeight: 1.2,
          fontSize: isGuerrilla ? 48 : 40,
        }}
        className="relative z-10 flex justify-center items-center "
      >
        {isGuerrilla ? "게릴라" : getFormattedStreamingTime(time)}
      </p>
      <Image
        alt=""
        src={Imgs["first"]["onlineTime" as keyof (typeof Imgs)["first"]]}
        fill
      />
    </div>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return (
    <div className="flex justify-center items-center grow w-full">
      <div
        style={{
          height: "240px",
          width: "100%",
        }}
        className="flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            color: colors[currentTheme || "first"]["primary"],
            lineHeight: 1.2,
          }}
          className="leading-none text-center w-full"
          multiline={true}
          maxFontSize={78}
        >
          {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
        </AutoResizeText>
      </div>
    </div>
  );
};

const CellTextWith = ({ currentTheme, mainTitle }: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        height: "200px",
        width: "100%",
      }}
      className="flex justify-center items-start"
    >
      <div
        style={{
          height: "160px",
          width: "100%",
        }}
        className="flex justify-center items-center "
      >
        <AutoResizeText
          style={{
            color: colors[currentTheme || "first"]["secondary"],
            lineHeight: 1,
            fontFamily: fontOption.secondary,
          }}
          className="leading-none text-center w-full"
          multiline={true}
          maxFontSize={44}
        >
          {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
        </AutoResizeText>
      </div>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <p
      style={{
        color: colors["first"]["primary"],
      }}
      className=" flex justify-center items-center h-[28px] text-[36px]"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
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
      className=" pointer-events-none"
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
        width: 650,
        height: 550,
        marginTop: 72,
        marginLeft: 28,
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
        top: 41,
        left: 34,
        width: 100,
        height: 100,
      }}
      className="absolute text-[54px] flex justify-center items-center"
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
  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";
  const isTogether = !!primaryEntry.with;

  return (
    <div
      style={{
        width: "100%",
        height: 657,
      }}
      className="relative"
    >
      <WeekDay day={time.day} />
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
          <CellContentArea>
            <CellTextMainTitle mainTitle={entryMainTitle} />
            {isTogether && (
              <CellTextWith mainTitle={primaryEntry.with as string} />
            )}

            <StreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
            />
          </CellContentArea>
          <OnlineCardBG isTogether={isTogether} />
        </div>
      )}
    </div>
  );
};

export default TimeTableCell;
