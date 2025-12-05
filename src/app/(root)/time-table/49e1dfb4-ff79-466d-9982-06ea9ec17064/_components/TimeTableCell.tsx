import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard, TEntry } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
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
  isGuerrilla: boolean;
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

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["tertiary"],

        height: 100,
        fontSize: 56,
      }}
      className="font-bold flex justify-center items-center px-3"
    >
      {date}
    </p>
  );
};

const StreamingTime = ({
  time,
  currentTheme,
  isMultiple,
  isGuerrilla,
}: StreamingTimeProps) => {
  const [zone, formattedTime] = formatTime(time, "half").split(" ");

  return isMultiple ? (
    <p
      style={{
        bottom: isGuerrilla ? 17 : 14,
        right: -26,
        width: 252,
        height: 76,
        lineHeight: 1,
        color: Settings.card.online.time.fontColor,
        fontSize: isGuerrilla ? 56 : 48,
        fontWeight: 700,
      }}
      className="absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : `${formattedTime} ${zone}`}
    </p>
  ) : (
    <p
      style={{
        bottom: 46,
        right: 0,
        width: 252,
        height: 76,
        lineHeight: 1,
        color: Settings.card.online.time.fontColor,
        fontSize: 48,
        fontWeight: 700,
      }}
      className="absolute flex justify-center items-center"
    >
      {isGuerrilla ? "게릴라" : `${formattedTime} ${zone}`}
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
        width: 300,
        height: 160,
      }}
      className="flex justify-center items-center ml-18"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.secondary,
          color: Settings.card.online.mainTitle.fontColor,
          lineHeight: 0.9,
        }}
        className="leading-none text-left w-full"
        multiline={true}
        maxFontSize={64}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  ) : (
    <div
      style={{
        height: 160,
        width: "100%",
      }}
      className="flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.secondary,
          color: Settings.card.online.mainTitle.fontColor,
          lineHeight: 0.9,
        }}
        className="leading-none text-left w-full"
        multiline={true}
        maxFontSize={76}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextSubTitle = ({ text }: CellTextSubTitleProps) => {
  return (
    <p
      style={{
        color: Settings.card.online.subTitle.fontColor,
        fontSize: Settings.card.online.subTitle.fontSize,
        lineHeight: 1.1,
        fontWeight: 700,
      }}
      className=" flex justify-start items-center pt-1"
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
          entriesLength !== 1 ? "bigOnline" : "online"
        ].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme, offlineMemo }: OfflineCardProps) => {
  return (
    <div
      className=" flex justify-center items-center pointer-events-none"
      style={{
        width: Settings.card.offline.width,
        height: Settings.card.offline.height,
        position: "relative",
      }}
      key={day}
    >
      {offlineMemo && (
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
        width: 620,
        marginRight: 20,
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
      className="relative flex justify-center"
    >
      <div
        className=" absolute flex justify-center items-center gap-2"
        style={{ fontFamily: fontOption.primary, left: 48, top: 18 }}
      >
        <StreamingDate date={weekDate.getDate()} />
        <img
          src={Imgs["first"].star.src.replace("./", "/")}
          alt="star"
          style={{ width: 42, height: 42, marginTop: 8 }}
          className="relative bottom-1.5"
        />
        <StreamingDay day={time.day} />
      </div>
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
        <div
          className="w-full h-full mt-44 px-14 pt-4"
          style={{ width: 568, height: 240 }}
        >
          <CellTextSubTitle text={entries[0].subTitle as string} />
          <CellTextMainTitle
            isMultiple={isMultiple}
            mainTitle={entries[0].mainTitle as string}
          />
        </div>
        <StreamingTime
          isGuerrilla={entries[0].isGuerrilla}
          time={entries[0].time as string}
        />
      </>
    );
  return (
    <div
      className="w-full h-full flex flex-col gap-5"
      style={{ paddingTop: 111 }}
    >
      {entries.map((entry: TEntry, i) => {
        return (
          <div
            className={"relative flex justify-start items-center"}
            key={day + "-" + i}
            style={{ height: 188, width: "100%" }}
          >
            <CellTextMainTitle
              isMultiple={isMultiple}
              mainTitle={entry.mainTitle as string}
            />
            <StreamingTime
              isGuerrilla={entry.isGuerrilla}
              isMultiple={isMultiple}
              time={entry.time as string}
            />
            {/* <CellTextSubTitle text={entry.subTitle as string} /> */}
          </div>
        );
      })}
    </div>
  );
};
