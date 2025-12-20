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
  offlineCardHeight,
  offlineCardWidth,
  onlineCardHeight,
  onlineCardWidth,
  weekdayOption,
} from "../_settings/settings";

interface multiStreaming {
  isMultiple?: boolean;
}

interface DayAndDateTextProps extends multiStreaming {
  date: Date;
  currentTheme?: TTheme;
  day: number;
}

interface DayTextProps extends multiStreaming {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps extends multiStreaming {
  isGuerrilla: boolean;
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps extends multiStreaming {
  date: Date;
  currentTheme?: TTheme;
}

interface CellTextMainTitleProps extends multiStreaming {
  currentTheme?: TTheme;
  mainTitle: string;
}

interface CellTextSubTitleProps extends multiStreaming {
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

const StreamingDayAndDate = ({
  currentTheme,
  day,
  date,
}: DayAndDateTextProps) => {
  return (
    <p
      style={{
        height: 136,
        bottom: 56,
        left: 68,
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 76,
        fontWeight: 300,
        zIndex: 3,
        lineHeight: 1,
      }}
      className="w-full flex justify-center items-center "
    >
      {date.getMonth() + 1}/{date.getDate()} {weekdays[weekdayOption][day]}요일
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        width: 200,
        height: 136,
        bottom: 56,
        right: 72,
        fontFamily: fontOption.primary,
        color: colors["first"]["secondary"],
        fontSize: 26,
        fontWeight: 300,
        zIndex: 3,
        lineHeight: 1,
      }}
      className="absolute flex justify-end items-center "
    >
      {date.getFullYear()}/{padZero(date.getMonth() + 1)}/
      {padZero(date.getDate())}
    </p>
  );
};

const StreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  isMultiple,
}: StreamingTimeProps) => {
  return (
    <div
      style={{
        width: 340,
        height: 88,
        top: isMultiple ? 152 : 400,
        backgroundImage: `url(${Imgs["first"].online.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      className=" absolute flex justify-center items-center "
    >
      <p
        style={{
          lineHeight: 1,
          fontFamily: fontOption.secondary,
          fontWeight: 700,
          fontSize: 48,
          color: colors["first"]["tertiary"],
        }}
      >
        {isGuerrilla ? "게릴라" : formatTime(time, "half")}
      </p>
    </div>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
  isMultiple,
}: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        height: isMultiple ? 140 : 224,
        top: isMultiple ? 10 : 138,
      }}
      className="absolute w-full flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          color:
            colors[currentTheme || "first"][
              isMultiple ? "primary" : "secondary"
            ],
          fontFamily: fontOption.primary,
          fontWeight: 300,
          lineHeight: 0.9,
        }}
        className="leading-none text-center"
        multiline={isMultiple ? false : true}
        maxFontSize={isMultiple ? 80 : 112}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <div
      style={{ height: 60, top: 64 }}
      className="absolute flex justify-center items-center w-full"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 500,
          color: colors["first"]["primary"],
          letterSpacing: -2,
        }}
        className="leading-none text-center"
        maxFontSize={64}
      >
        {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const cardName = "online_" + days[day];
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
        src={Imgs["first"][cardName].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      style={{
        width: offlineCardWidth,
        height: offlineCardHeight,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs["first"]["offline"].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        height: 540,
        width: 500,
      }}
      className="relative w-full h-full flex flex-col items-center"
    >
      {children}
    </div>
  );
};

interface MultipleCardsProps {
  time: TDefaultCard;
}

const MultipleCards = ({ time }: MultipleCardsProps) => {
  const entries = time.entries;
  const firstTime = entries[0];
  const entriesLength = entries.length;
  const isMultiple = entriesLength > 1;
  const day = time.day;
  if (!entries) return null;
  if (!isMultiple)
    return (
      <>
        <CellTextTitle cellTextTitle={firstTime.subTitle as string} />
        <CellTextMainTitle mainTitle={firstTime.mainTitle} />
        <StreamingTime
          isMultiple={isMultiple}
          time={firstTime.time}
          isGuerrilla={firstTime.isGuerrilla}
        />
      </>
    );
  return (
    <div className="flex flex-col w-full h-full mt-2">
      {entries.map((entry: TEntry, i) => {
        return (
          <div
            key={i}
            style={{ width: "100%", height: 248 }}
            className="relative flex justify-center items-center"
          >
            <CellTextMainTitle
              isMultiple={isMultiple}
              mainTitle={entry.mainTitle}
            />
            <StreamingTime
              isMultiple={isMultiple}
              time={entry.time}
              isGuerrilla={entry.isGuerrilla}
            />
          </div>
        );
      })}
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
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      key={time.day}
      className="relative flex flex-col items-center justify-start"
    >
      <>
        <StreamingDayAndDate day={time.day} date={weekDate} />

        <CellContentArea>
          {time.isOffline ? (
            <div
              style={{
                width: offlineCardWidth,
                height: offlineCardHeight,
                top: 100,
              }}
              key={time.day}
              className="absolute flex justify-center z-30"
            >
              <OfflineCard day={time.day} />;
            </div>
          ) : (
            <MultipleCards time={time} />
          )}
        </CellContentArea>
      </>

      {/* <OnlineCardBG day={time.day} /> */}
    </div>
  );
};

export default TimeTableCell;
