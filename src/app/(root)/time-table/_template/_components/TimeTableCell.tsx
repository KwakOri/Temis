import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TEntry } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
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
  time: string;
  currentTheme?: TTheme;
  isMultiple?: boolean;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
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
  currentTheme?: TTheme;
}

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  return (
    <p
      style={{
        color: Settings.card.online.day.fontColor,
        fontSize: Settings.card.online.day.fontSize,
      }}
      className="absolute flex justify-center items-center"
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
      }}
      className="absolute flex justify-center items-center"
    >
      {date}
    </p>
  );
};

const StreamingTime = ({
  time,
  currentTheme,
  isMultiple,
}: StreamingTimeProps) => {
  return isMultiple ? (
    <p
      style={{
        color: Settings.card.online.time.fontColor,
      }}
      className="absolute flex justify-center items-center"
    >
      {formatTime(time, "full")}
    </p>
  ) : (
    <p
      style={{
        color: Settings.card.online.time.fontColor,
      }}
      className="absolute flex justify-center items-center"
    >
      {formatTime(time, "full")}
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
      style={{}}
      className="flex justify-center items-center shrink-0 absolute"
    >
      <AutoResizeText
        style={{
          color: Settings.card.online.mainTitle.fontColor,
        }}
        className="leading-none text-center w-full"
        maxFontSize={56}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  ) : (
    <div style={{}} className="flex justify-center items-center shrink-0">
      <AutoResizeText
        style={{
          color: Settings.card.online.mainTitle.fontColor,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={Settings.card.online.mainTitle.fontSize}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ text }: CellTextSubTitleProps) => {
  return (
    <p
      style={{
        color: Settings.card.online.subTitle.fontColor,
        fontSize: Settings.card.online.subTitle.fontSize,
      }}
      className=" flex justify-center items-center"
    >
      {text ? (text as string) : placeholders.subTitle}
    </p>
  );
};

interface OnlineCardBGProps {
  day?: number;
  entriesLength?: number;
}

const OnlineCardBG = ({ day, entriesLength }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: Settings.card.online.width,
        height: Settings.card.online.height,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"][
          entriesLength === 1 ? "bigOnline" : "online"
        ].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme, offlineMemo }: OfflineCardProps) => {
  return (
    <div
      className="relative flex justify-center items-center pointer-events-none"
      style={{
        width: Settings.card.offline.width,
        height: Settings.card.offline.height,
      }}
      key={day}
    >
      {offlineMemo && (
        <div
          style={{}}
          className="flex justify-center items-center shrink-0 absolute"
        >
          <AutoResizeText
            style={{
              color: "#FFFFFF",
              fontFamily: fontOption.primary,
            }}
            className="leading-none text-center w-full"
            multiline
            maxFontSize={80}
          >
            {offlineMemo ? (offlineMemo as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      )}
      <img
        src={Imgs[currentTheme || "first"][
          offlineMemo ? "offlineMemo" : "offline"
        ].src.replace("./", "/")}
        alt="offline"
        className="object-cover"
      />
    </div>
  );
};

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 540,
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
  const entriesLength = time.entries.length;
  const isMultiple = entriesLength > 1;

  if (time.isOffline) {
    return <OfflineCard offlineMemo={time.offlineMemo} day={time.day} />;
  }

  return (
    <div
      style={{
        width: Settings.card.online.width,
        height: Settings.card.online.height,
      }}
      key={time.day}
      className="relative flex justify-center py-8"
    >
      <CellContentArea>
        <MultipleCards isMultiple={isMultiple} time={time} />
      </CellContentArea>
      <OnlineCardBG entriesLength={entriesLength} />
    </div>
  );
};

export default TimeTableCell;

interface MultipleCardsProps {
  time: TDefaultCard;
  isMultiple: boolean;
}

const MultipleCards = ({ time, isMultiple }: MultipleCardsProps) => {
  const entries = time.entries;
  const entriesLength = entries.length;
  const day = time.day;
  if (!entries) return null;
  if (entriesLength === 1)
    return (
      <>
        <div className="w-full h-full pt-34">
          <CellTextMainTitle
            isMultiple={isMultiple}
            mainTitle={entries[0].mainTitle as string}
          />
        </div>
        <StreamingTime time={entries[0].time as string} />
      </>
    );
  return (
    <div className="w-full h-full flex flex-col gap-8 pt-1">
      {entries.map((entry: TEntry, i) => {
        return (
          <div className={"w-full h-full relative"} key={day + "-" + i}>
            <CellTextMainTitle
              isMultiple={isMultiple}
              mainTitle={entry.mainTitle as string}
            />
            <StreamingTime
              isMultiple={isMultiple}
              time={entry.time as string}
            />
            {/* <CellTextTitle text={entry.subTitle as string} /> */}
          </div>
        );
      })}
    </div>
  );
};
