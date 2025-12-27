import React, { CSSProperties, PropsWithChildren } from "react";

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

type dayProps = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface customStyle {
  0: CSSProperties;
  1: CSSProperties;
  2: CSSProperties;
  3: CSSProperties;
  4: CSSProperties;
  5: CSSProperties;
  6: CSSProperties;
}

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
  day: number;
  isOffline: boolean;
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
  const divStyle: customStyle = {
    0: { top: 396, left: 1172 },
    1: { top: 360, left: 1810 },
    2: { top: 396, left: 2650 },
    3: { top: 360, left: 3370 },
    4: { top: 1288, left: 1284 },
    5: { top: 1310, left: 2230 },
    6: { top: 1288, left: 2992 },
  };
  return (
    <p
      style={{
        height: 100,
        width: 400,

        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1,
        ...divStyle[day as dayProps],
      }}
      className="absolute flex items-center"
    >
      {date.getDate()} {weekdays[weekdayOption][day].toUpperCase()}
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
  day,
  time,
  currentTheme,
  isGuerrilla,
  isMultiple,
  isOffline,
}: StreamingTimeProps) => {
  const divStyle: customStyle = {
    0: { top: 1052, left: 1168 },
    1: { top: 1090, left: 1898 },
    2: { top: 1050, left: 2564 },
    3: { top: 1084, left: 3296 },
    4: { top: 1960, left: 1372 },
    5: { top: 1928, left: 2132 },
    6: { top: 1960, left: 3120 },
  };
  return (
    <div
      style={{
        width: 256,
        height: 61,
        backgroundImage: `url(${Imgs["first"].time.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        ...divStyle[day as dayProps],
      }}
      className="absolute flex justify-end items-center pr-1"
    >
      <p
        className="flex justify-center items-center mt-1"
        style={{
          width: 190,
          height: 54,
          lineHeight: 1,
          fontFamily: fontOption.primary,
          fontWeight: 600,
          fontSize: 48,
          color: colors["first"]["primary"],
          letterSpacing: 4,
        }}
      >
        {isOffline
          ? "--:--"
          : isGuerrilla
          ? "게릴라"
          : formatTime(time, "full")}
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
        height: 300,
      }}
      className="w-full flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          color: colors[currentTheme || "first"]["primary"],
          fontFamily: fontOption.primary,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
        className="leading-none text-left"
        multiline={true}
        maxFontSize={110}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <div
      style={{ height: 60 }}
      className="flex justify-start items-center w-full"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 400,
          color: colors["first"]["primary"],
        }}
        className="leading-none text-center"
        maxFontSize={110}
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

interface CellContentAreaProps {
  day: number;
}

const CellContentArea = ({
  day,
  children,
}: PropsWithChildren<CellContentAreaProps>) => {
  const divStyle: customStyle = {
    0: { top: 600, left: 1168 },
    1: { top: 600, left: 1888 },
    2: { top: 600, left: 2648 },
    3: { top: 600, left: 3350 },
    4: { top: 1490, left: 1372 },
    5: { top: 1496, left: 2232 },
    6: { top: 1488, left: 3088 },
  };
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 520,
        height: 400,
        ...divStyle[day as dayProps],
      }}
      className="absolute w-full h-full flex flex-col items-center gap-4 "
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
      </>
    );
  return (
    <div className="flex flex-col w-full h-full mt-2">
      {entries.map((entry: TEntry, i) => {
        return <></>;
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
  const offlineMemoPlaceholder = "휴방 코멘트\n적는 곳";
  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
      }}
      key={time.day}
      className="flex flex-col items-center justify-start"
    >
      <>
        <StreamingDayAndDate day={time.day} date={weekDate} />
        <StreamingTime
          isOffline={time.isOffline}
          day={time.day}
          time={primaryEntry.time}
          isGuerrilla={primaryEntry.isGuerrilla}
        />
        <CellContentArea day={time.day}>
          {time.isOffline ? (
            time.offlineMemo ? (
              <>
                <CellTextTitle cellTextTitle={"OFF-LINE"} />
                <CellTextMainTitle mainTitle={time.offlineMemo as string} />
              </>
            ) : (
              <div className="w-full mt-8">
                <p
                  style={{
                    fontFamily: fontOption.primary,
                    fontSize: 128,
                    fontWeight: 800,
                    textAlign: "left",
                    width: "100%",
                    color: colors["first"]["primary"],
                    lineHeight: 1.1,
                  }}
                >
                  OFF
                </p>
                <p
                  style={{
                    fontFamily: fontOption.primary,
                    fontSize: 128,
                    fontWeight: 800,
                    textAlign: "left",
                    width: "100%",
                    color: colors["first"]["primary"],
                    lineHeight: 1.1,
                  }}
                >
                  LINE
                </p>
              </div>
            )
          ) : (
            <>
              <CellTextTitle cellTextTitle={primaryEntry.subTitle as string} />
              <CellTextMainTitle mainTitle={primaryEntry.mainTitle} />
            </>
          )}
        </CellContentArea>
      </>
    </div>
  );
};

export default TimeTableCell;
