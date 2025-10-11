import React, { CSSProperties, PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
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
import { CellStyleProps } from "./TimeTableGrid";

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  cellStyle: CSSProperties;
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps {
  date: number;
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
  cellStyle: CellStyleProps;
}

interface OfflineCardProps {
  day: number;
  cellStyle: CSSProperties;
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

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || "first"]["tertiary"],
        top: 48,
        left: 28,
        width: 120,
        transform: "rotate(-22deg)",
      }}
      className="absolute flex justify-center items-center text-[56px] font-bold"
    >
      {date}
    </p>
  );
};

const StreamingTime = ({
  cellStyle,
  time,
  currentTheme,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 300,
        height: 80,
        lineHeight: 1,
        color: colors[currentTheme || "first"]["tertiary"],
        rotate: "-0.5deg",
        fontSize: 52,
        letterSpacing: 2,
        ...cellStyle,
      }}
      className="absolute flex justify-center items-center font-black"
    >
      {formatTime(time, "half")}
    </p>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        height: 360,
        width: 390,
        marginTop: 10,
      }}
      className="flex justify-center items-start font-black"
    >
      <AutoResizeText
        style={{
          lineHeight: 1.2,
        }}
        className="leading-none text-start w-full"
        multiline={true}
        maxFontSize={100}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    // <p
    //   style={{
    //     color: colors["first"]["primary"],
    //   }}
    //   className=" flex justify-center items-center text-[48px] mt-32"
    // >
    //   {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
    // </p>
    <div
      style={{
        height: 72,
        width: 390,
        marginTop: 36,
      }}
      className="  font-bold flex items-center"
    >
      <AutoResizeText className="leading-none text-start" maxFontSize={56}>
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
  const dayName = days[day];

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
        src={Imgs["first"][dayName].src.replace("./", "/")}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ cellStyle, day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      className=" absolute pointer-events-none"
      style={{
        paddingTop: 2,
        width: offlineCardWidth,
        height: offlineCardHeight,
        ...cellStyle,
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || "first"]["offline"].src.replace("./", "/")}
        alt="offline"
        style={{
          width: offlineCardWidth,
          height: offlineCardHeight,
        }}
      />
    </div>
  );
};

interface CellSideTabProps {
  cellStyle: CSSProperties;
  entrySideTabMainTitle: string;
  entrySideTabSubTitle: string;
}

const CellSideTab = ({
  cellStyle,
  entrySideTabMainTitle,
  entrySideTabSubTitle,
}: CellSideTabProps) => {
  const subTitleFontSizeByLength = {
    1: 63,
    2: 63,
    3: 63,
    4: 63,
    5: 63,
    6: 52,
    7: 44,
    8: 40,
  };
  return (
    <div
      className="absolute flex justify-center items-center gap-4"
      style={{
        width: 160,
        height: 364,
        rotate: "-0.5deg",
        ...cellStyle,
      }}
    >
      <div
        className="text-[63px] font-black flex flex-col"
        style={{
          fontFamily: fontOption.primary,
          lineHeight: 1,
          fontSize:
            subTitleFontSizeByLength[
              entrySideTabMainTitle.length as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
            ],
        }}
      >
        {entrySideTabMainTitle.split("").map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </div>
      <div
        className="text-[38px] font-bold flex flex-col"
        style={{
          fontFamily: fontOption.primary,
          lineHeight: 1,
        }}
      >
        {entrySideTabSubTitle.split("").map((char, i) => (
          <span key={i}>{char}</span>
        ))}
      </div>
    </div>
  );
};

interface CellContentAreaProps {
  cellStyle: CSSProperties;
}

const CellContentArea = ({
  children,
  cellStyle,
}: PropsWithChildren<CellContentAreaProps>) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 420,
        height: 400,
        rotate: "-0.6deg",
        ...cellStyle,
      }}
      className="absolute w-full h-full ml-7"
    >
      {children}
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
  cellStyle,
}) => {
  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";
  const entrySideTabMainTitle = (primaryEntry.sideTabMainTitle as string) || "";
  const entrySideTabSubTitle = (primaryEntry.sideTabSubTitle as string) || "";

  // console.log("entrySubTitle => ", entrySubTitle);
  // console.log("entrySubDescription => ", entrySubDescription);

  return (
    <div
      style={{
        width: onlineCardWidth,
        height: onlineCardHeight,
        ...cellStyle.container,
      }}
      key={time.day}
      className="absolute flex justify-center"
    >
      {time.isOffline ? (
        <OfflineCard cellStyle={cellStyle.offlineSticker} day={time.day} />
      ) : (
        <>
          <CellContentArea cellStyle={cellStyle.contentArea}>
            <CellTextTitle cellTextTitle={entrySubTitle} />
            <CellTextMainTitle mainTitle={entryMainTitle} />
            {/* <StreamingDate date={weekDate.getDate()} /> */}
          </CellContentArea>
          <StreamingTime cellStyle={cellStyle.timestamp} time={entryTime} />
          <CellSideTab
            entrySideTabMainTitle={entrySideTabMainTitle}
            entrySideTabSubTitle={entrySideTabSubTitle}
            cellStyle={cellStyle.sideTab}
          />
        </>
      )}

      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
