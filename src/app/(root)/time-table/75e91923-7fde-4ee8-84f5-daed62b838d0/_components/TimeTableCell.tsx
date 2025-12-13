import React, { PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
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

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  currentTheme?: TTheme;
  isOffline: boolean;
}

interface DateTextProps {
  date: Date;
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
        width: 120,
        height: 40,
        bottom: 56,
        left: 68,
        fontFamily: fontOption.primary,
        color: colors["first"]["secondary"],
        fontSize: 26,
        fontWeight: 300,
        zIndex: 3,
        lineHeight: 1,
      }}
      className="absolute flex justify-start items-center "
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        width: 200,
        height: 40,
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
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        width: 300,
        height: 40,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        fontWeight: 500,
        fontSize: 34,
        top: 129,
        left: 0,
        color: colors["first"]["primary"],
      }}
      className=" absolute flex justify-start items-center "
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
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
        height: 224,
        left: 0,
        top: 236,
      }}
      className="absolute w-full flex justify-start items-center"
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
        maxFontSize={84}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <div
      style={{ height: 44, left: 0, top: 184 }}
      className="absolute flex justify-start items-center w-full"
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 700,
          color: colors["first"]["primary"],
        }}
        className="leading-none text-left w-full"
        maxFontSize={34}
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
        width: 520,
      }}
      className="relative w-full h-full flex flex-col items-center"
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
      {time.isOffline && (
        <div
          style={{
            width: offlineCardWidth,
            height: offlineCardHeight,
            top: 30,
          }}
          key={time.day}
          className="absolute flex justify-center z-30"
        >
          <OfflineCard day={time.day} />;
        </div>
      )}
      <StreamingDay day={time.day} />
      <StreamingDate date={weekDate} />

      <CellContentArea>
        <StreamingTime
          isOffline={time.isOffline}
          isGuerrilla={primaryEntry.isGuerrilla}
          time={entryTime}
        />
        <CellTextTitle cellTextTitle={entrySubTitle} />
        <CellTextMainTitle mainTitle={entryMainTitle} />
      </CellContentArea>
      <OnlineCardBG day={time.day} />
    </div>
  );
};

export default TimeTableCell;
