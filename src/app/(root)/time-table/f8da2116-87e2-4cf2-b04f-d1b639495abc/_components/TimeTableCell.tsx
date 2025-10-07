import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard, TEntry } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { weekdays } from "@/utils/time-table/data";
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
  index?: number;
  isGuerrilla: boolean;
  time: string;
  currentTheme?: TTheme;
  isMultiple?: boolean;
}

interface DateTextProps {
  index?: number;
  date: number;
  currentTheme?: TTheme;
  isOffline: boolean;
}

interface CellTextMainTitleProps {
  isMultiple?: boolean;
  currentTheme?: TTheme;
  mainTitle: string;
}

interface CellTextSubTitleProps {
  text: string | null;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  offlineMemo?: string;
  day: number;
  date: number;
  currentTheme?: TTheme;
}

interface OnlineCardBGProps {
  day?: number;
  entriesLength?: number;
}

interface CellContentAreaProps {
  isMultiple: boolean;
}

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  return (
    <p
      style={{
        color: Settings.card.online.day.fontColor,
        fontSize: Settings.card.online.day.fontSize,
        width: 160,
        height: 100,
        fontWeight: 700,
      }}
      className="flex justify-start items-center pl-2"
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const StreamingDate = ({
  index,
  isOffline,
  date,
  currentTheme,
}: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["primary"],
        fontFamily: fontOption.secondary,
        fontWeight: 400,
        width: 160,
        height: 100,
        fontSize: 68,
        letterSpacing: 3,
        rotate: "-14deg",
        position: "absolute",
        top: isOffline ? 50 : index === 0 ? -10 : -16, //14
        left: isOffline ? 38 : -24, //40
      }}
      className="font-bold flex justify-center items-center z-10"
    >
      {padZero(date)}
    </p>
  );
};

const StreamingTime = ({
  isGuerrilla,
  time,
  currentTheme,
  isMultiple,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 252,
        height: 40,
        lineHeight: 1,
        color: colors["first"][isMultiple ? "secondary" : "primary"],
        fontSize: 31,
        fontWeight: 400,
        marginTop: isMultiple ? 26 : 0,
      }}
      className="flex justify-center items-center mt-1"
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
    </p>
  );
};

const CellTextMainTitle = ({
  isMultiple,
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return isMultiple ? (
    <div
      style={{
        width: "100%",
        height: 160,
      }}
      className="flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 700,
          lineHeight: 1.2,
          color: Settings.card.online.mainTitle.fontColor,
        }}
        className="leading-none text-center w-full"
        maxFontSize={64}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  ) : (
    <div
      style={{
        height: 280,
        width: "100%",
        marginTop: 64,
      }}
      className="flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 700,
          color: Settings.card.online.mainTitle.fontColor,
          lineHeight: 1.2,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={82}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextSubTitle = ({ text }: CellTextSubTitleProps) => {
  return (
    <div
      style={{
        marginTop: 28,
        height: 64,
        width: "100%",
      }}
      className=" flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          color: Settings.card.online.subTitle.fontColor,

          fontWeight: 400,
          lineHeight: 1,
        }}
        className="leading-none text-center w-full"
        maxFontSize={Settings.card.online.subTitle.fontSize}
      >
        {text ? (text as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

const OnlineCardBG = ({ day, entriesLength }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: Settings.card.online.width,
        height: Settings.card.online.height,
        left: -40,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][
          entriesLength !== 1 ? "bigOnline" : "online"
        ].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme, date }: OfflineCardProps) => {
  return (
    <div
      className=" flex justify-center items-center pointer-events-none"
      style={{
        width: 720,
        height: Settings.card.offline.height,
        position: "relative",
      }}
      key={day}
    >
      <StreamingDate isOffline={true} date={date} />
      {/* {offlineMemo && (
        <div
          style={{
            width: "80%",
            height: 240,
          }}
          className="flex justify-center items-center shrink-0 absolute"
        >
          <AutoResizeText
            style={{
              color: "#FFFFFF",
              fontFamily: fontOption.primary,
              lineHeight: 1.2,
            }}
            className="leading-none text-center w-full"
            multiline
            maxFontSize={80}
          >
            {offlineMemo ? (offlineMemo as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      )} */}
      <div
        style={{
          width: Settings.card.offline.width,
          height: Settings.card.offline.height,
          position: "absolute",
        }}
      >
        <img
          src={Imgs[currentTheme || "first"]["offline"].src.replace("./", "/")}
          alt="offline"
          className="object-cover"
        />
      </div>
    </div>
  );
};

const CellContentArea = ({
  children,
  isMultiple,
}: PropsWithChildren<CellContentAreaProps>) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 600,
        height: isMultiple ? 516 : 504,
        position: "relative",
        left: 10,
        top: isMultiple ? 60 : 68,
      }}
      className="flex flex-col justify-start items-center"
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

  console.log("time => ", time);
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entriesLength = time.entries.length;
  const isMultiple = entriesLength > 1;

  if (time.isOffline) {
    return <OfflineCard day={time.day} date={weekDate.getDate()} />;
  }

  return (
    <div
      style={{
        width: 720,
        height: Settings.card.online.height,
      }}
      key={time.day}
      className="relative flex justify-center"
    >
      <CellContentArea isMultiple={isMultiple}>
        <MultipleCards
          weekDate={weekDate}
          isMultiple={isMultiple}
          time={time}
        />
      </CellContentArea>
      <OnlineCardBG entriesLength={entriesLength} />
    </div>
  );
};

export default TimeTableCell;

interface MultipleCardsProps {
  weekDate: Date;
  time: TDefaultCard;
  isMultiple: boolean;
}

const MultipleCards = ({ time, isMultiple, weekDate }: MultipleCardsProps) => {
  const entries = time.entries;
  const entriesLength = entries.length;
  const day = time.day;
  if (!entries) return null;
  if (entriesLength === 1)
    return (
      <>
        <StreamingDate isOffline={false} date={weekDate.getDate()} />
        <CellTextMainTitle
          isMultiple={isMultiple}
          mainTitle={entries[0].mainTitle as string}
        />
        <CellTextSubTitle text={entries[0].subTitle as string} />
        <StreamingTime
          isGuerrilla={entries[0].isGuerrilla}
          time={entries[0].time as string}
        />
      </>
    );
  return (
    <div className="w-full h-full flex flex-col" style={{ gap: 19 }}>
      {entries.map((entry: TEntry, i) => {
        return (
          <div
            className={"relative flex flex-col justify-start items-center"}
            key={day + "-" + i}
            style={{ height: 248, width: "100%" }}
          >
            <StreamingDate
              index={i}
              isOffline={false}
              date={weekDate.getDate()}
            />
            <StreamingTime
              isGuerrilla={entry.isGuerrilla}
              isMultiple={isMultiple}
              time={entry.time as string}
            />
            <CellTextMainTitle
              isMultiple={isMultiple}
              mainTitle={entry.mainTitle as string}
            />

            {/* <CellTextSubTitle text={entry.subTitle as string} /> */}
          </div>
        );
      })}
    </div>
  );
};
