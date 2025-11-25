import React, { CSSProperties } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import { colors, fontOption } from "../_settings/settings";

interface DayTextProps {
  currentTheme?: TTheme;
  isOffline: boolean;
  day: number;
}

interface StreamingTimeProps {
  isOffline: boolean;
  day: number;
  isGuerrilla: boolean;
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps {
  day: number;
  date: number;
  currentTheme?: TTheme;
}

interface CellTextMainTitleProps {
  day: number;
  currentTheme?: TTheme;
  mainTitle: string;
}

interface CellTextSubTitleProps {
  day: number;
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

export type dayProps = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CellStyleProps {
  0: CSSProperties;
  1: CSSProperties;
  2: CSSProperties;
  3: CSSProperties;
  4: CSSProperties;
  5: CSSProperties;
  6: CSSProperties;
}

export interface MaxFontSizesProps {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
}

const StreamingDate = ({ day, date, currentTheme }: DateTextProps) => {
  const textStyle: CellStyleProps = {
    0: {
      fontSize: 72,
      top: -120,
      left: -70,
      width: 120,
      height: 120,
      color: "#BFBEC8",
      fontWeight: "bold",
    },
    1: {
      fontSize: 72,
      top: -144,
      left: 208,
      width: 120,
      height: 120,
      color: "#3F4CAB",
      fontWeight: "bold",
    },
    2: {
      fontSize: 72,
      top: -122,
      left: 200,
      width: 120,
      height: 120,
      color: "#BFBEC8",
      fontWeight: "bold",
    },
    3: {
      fontSize: 42,
      top: -118,
      left: 404,
      width: 100,
      height: 60,
      color: "#FAFAFA",
    },
    4: {
      fontSize: 42,
      top: -88,
      left: 172,
      width: 100,
      height: 60,
      color: "#FAFAFA",
    },
    5: {
      fontSize: 42,
      top: -88,
      left: 172,
      width: 100,
      height: 60,
      color: "#FAFAFA",
    },
    6: {
      fontSize: 72,
      top: 76,
      left: -168,
      width: 120,
      height: 120,
      color: "#3F4CAB",
      fontWeight: "bold",
    },
  };

  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        lineHeight: 1,
        ...textStyle[day as dayProps],
        zIndex: 30,
      }}
      className=" absolute flex justify-center items-center "
    >
      {date}
    </p>
  );
};

const StreamingDay = ({ currentTheme, isOffline, day }: DayTextProps) => {
  const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const divStyle: CellStyleProps = {
    0: {},
    1: {},
    2: { position: "absolute", bottom: 60 },
    3: { position: "absolute", bottom: 60 },
    4: { position: "absolute", bottom: 60 },
    5: {},
    6: {},
  };

  const label = DAYS_OF_WEEK[day];

  return (
    <div
      style={{
        fontSize: 64,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        color:
          day === 2 || day === 3 || day === 4 || !isOffline
            ? colors["first"]["primary"]
            : colors["first"]["secondary"],
        fontWeight: 700,
        ...divStyle[day as dayProps],
      }}
    >
      {label}
    </div>
  );
};

const StreamingTime = ({
  isOffline,
  day,
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  const textStyle: CellStyleProps = {
    0: {
      color: isOffline
        ? colors["first"]["secondary"]
        : colors["first"]["primary"],
    },
    1: {
      color: isOffline ? "transparent" : colors["first"]["primary"],
    },
    2: {
      color: isOffline
        ? colors["first"]["secondary"]
        : colors["first"]["primary"],
    },
    3: {
      color: isOffline
        ? colors["first"]["secondary"]
        : colors["first"]["primary"],
    },
    4: {
      color: isOffline
        ? colors["first"]["secondary"]
        : colors["first"]["primary"],
    },
    5: {
      color: isOffline ? "transparent" : colors["first"]["primary"],
    },
    6: {
      color: isOffline
        ? colors["first"]["secondary"]
        : colors["first"]["primary"],
    },
  };
  return (
    <p
      style={{
        fontSize: 60,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        ...textStyle[day as dayProps],
      }}
    >
      {isOffline
        ? "OFFLINE"
        : isGuerrilla
        ? "게릴라"
        : formatTime(time, "half")}
    </p>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
  day,
}: CellTextMainTitleProps) => {
  const divStyle: CellStyleProps = {
    0: { marginTop: 22, justifyContent: "start" },
    1: { marginTop: 22 },
    2: { width: "75%", justifyContent: "center", marginTop: 20 },
    3: { width: "75%", justifyContent: "center", marginTop: 20 },
    4: { width: "75%", justifyContent: "center", marginTop: 20 },
    5: { marginTop: 22 },
    6: { marginTop: 22, justifyContent: "start" },
  };

  return (
    <div
      style={{
        height: 228,
        ...divStyle[day as dayProps],
      }}
      className="flex  items-center "
    >
      <AutoResizeText
        style={{
          lineHeight: 1.2,
          fontFamily: fontOption.primary,
          fontWeight: 700,
          textAlign: day === 2 || day === 3 || day === 4 ? "center" : "left",

          color: colors["first"]["primary"],
        }}
        className="leading-none"
        multiline
        maxFontSize={96}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ day, cellTextTitle }: CellTextSubTitleProps) => {
  const textStyle: CellStyleProps = {
    0: { textAlign: "left" },
    1: { textAlign: "left" },
    2: { textAlign: "center" },
    3: { textAlign: "center" },
    4: { textAlign: "center" },
    5: { textAlign: "left" },
    6: { textAlign: "left" },
  };

  const divStyle: CellStyleProps = {
    0: { justifyContent: "left", marginTop: 61 },
    1: { justifyContent: "left", marginTop: 61 },
    2: { justifyContent: "center", width: "75%", marginTop: 40 },
    3: { justifyContent: "center", width: "75%", marginTop: 40 },
    4: { justifyContent: "center", width: "75%", marginTop: 40 },
    5: { justifyContent: "left", marginTop: 61 },
    6: { justifyContent: "left", marginTop: 61 },
  };

  return (
    <div
      className="flex items-center "
      style={{
        height: 60,
        ...divStyle[day as dayProps],
      }}
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 500,
          color: colors["first"]["primary"],

          ...textStyle[day as dayProps],
        }}
        className="leading-none "
        maxFontSize={40}
      >
        {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineBgProps {
  day: number;
  isOffline: boolean;
}

const CardBG = ({ isOffline, day }: OnlineBgProps) => {
  const cardType = isOffline ? "offline" : "online";
  const cardOfDays = ["2", "3", "1", "1", "1", "3", "2"];
  const cardName = cardType + cardOfDays[day];
  return (
    <img
      className="absolute inset-0 -z-10"
      src={Imgs["first"][cardName].src}
      alt=""
    />
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  const card_info_mon_sun: CSSProperties = { width: 1262, height: 546 };

  const card_info_tue_sat: CSSProperties = { width: 931, height: 535 };

  const card_info_wed_thu_fri: CSSProperties = { width: 729, height: 842 };

  const card_infos = [
    card_info_mon_sun,
    card_info_tue_sat,
    card_info_wed_thu_fri,
    card_info_wed_thu_fri,
    card_info_wed_thu_fri,
    card_info_tue_sat,
    card_info_mon_sun,
  ];
  const cellStyle: CellStyleProps = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
  };

  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  return (
    <>
      {(time.day === 0 || time.day === 6) && (
        <div
          className="relative flex gap-16 items-center z-10"
          style={{ ...card_infos[time.day] }}
        >
          <div
            style={{
              width: 452,
              height: 452,
              marginLeft: 52,
              gap: 96,
            }}
            className="flex flex-col justify-center items-center"
          >
            <StreamingTime
              isOffline={time.isOffline}
              day={time.day}
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
            />
            <StreamingDay isOffline={time.isOffline} day={time.day} />
          </div>
          {time.isOffline ? (
            <p
              style={{
                fontSize: 128,
                fontFamily: fontOption.primary,
                fontWeight: 700,
                left: 588,
                color: colors["first"]["primary"],
                width: 600,
                top: 168,
              }}
              className="absolute"
            >
              연습중 !
            </p>
          ) : (
            <div
              style={{
                width: 512,
                height: 452,
              }}
            >
              <CellTextTitle day={time.day} cellTextTitle={entrySubTitle} />
              <CellTextMainTitle day={time.day} mainTitle={entryMainTitle} />
            </div>
          )}
          <CardBG day={time.day} isOffline={time.isOffline} />
        </div>
      )}
      {(time.day === 2 || time.day === 3 || time.day === 4) && (
        <div
          className="relative flex flex-col items-center z-10"
          style={{ ...card_infos[time.day] }}
        >
          {time.isOffline ? (
            <p
              style={{
                fontSize: 128,
                fontFamily: fontOption.primary,
                fontWeight: 700,
                color: colors["first"]["primary"],
                width: "100%",
                top: 410,
              }}
              className="absolute flex justify-center"
            >
              연습중 !
            </p>
          ) : (
            <>
              <div
                className="flex justify-center items-center mt-40"
                style={{ width: "100%", height: 134 }}
              >
                <StreamingTime
                  isOffline={time.isOffline}
                  day={time.day}
                  isGuerrilla={primaryEntry.isGuerrilla}
                  time={entryTime}
                />
              </div>

              <CellTextTitle day={time.day} cellTextTitle={entrySubTitle} />
              <CellTextMainTitle day={time.day} mainTitle={entryMainTitle} />
            </>
          )}

          <StreamingDay isOffline={time.isOffline} day={time.day} />
          <CardBG day={time.day} isOffline={time.isOffline} />
        </div>
      )}
      {(time.day === 1 || time.day === 5) && (
        <div
          className="relative flex gap-16 items-center z-10"
          style={{ ...card_infos[time.day] }}
        >
          <div
            style={{
              width: 452,
              height: 200,
              marginLeft: 52,
              rotate: "-90deg",
              left: -170,
            }}
            className="absolute flex flex-col justify-start items-center  pt-10 gap-5"
          >
            <StreamingTime
              isOffline={time.isOffline}
              day={time.day}
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
            />
            <StreamingDay isOffline={time.isOffline} day={time.day} />
          </div>
          {time.isOffline ? (
            <></>
          ) : (
            <div
              style={{
                width: 512,
                height: 452,
                left: 320,
              }}
              className="absolute"
            >
              <CellTextTitle day={time.day} cellTextTitle={entrySubTitle} />
              <CellTextMainTitle day={time.day} mainTitle={entryMainTitle} />
            </div>
          )}
          <CardBG day={time.day} isOffline={time.isOffline} />
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
