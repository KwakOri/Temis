import React, { CSSProperties, PropsWithChildren } from "react";

import { VerticalResizeText } from "@/components/AutoResizeTextCard";
import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import { colors, fontOption } from "../_settings/settings";
import WhiteSpaceMark from "./WhiteSpaceMark";

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
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

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  const DAYS_OF_WEEK = ["월", "화", "수", "목", "금", "토", "일"];
  const textStyle: CellStyleProps = {
    0: { color: colors["first"]["primary"] },
    1: { color: colors["first"]["primary"] },
    2: { color: colors["first"]["secondary"] },
    3: { color: colors["first"]["secondary"] },
    4: { color: colors["first"]["secondary"] },
    5: { color: colors["first"]["primary"] },
    6: { color: colors["first"]["primary"] },
  };

  const label = DAYS_OF_WEEK[day] + "요일";

  return (
    <>
      {day < 5 ? (
        <div
          style={{
            fontSize: 48,
            lineHeight: 1,
            fontFamily: fontOption.primary,
            fontWeight: 700,
            ...textStyle[day as dayProps],
          }}
        >
          {label}
        </div>
      ) : (
        <div
          style={{
            marginTop: 8,
            marginBottom: 16,
            marginLeft: 16,
            width: 136,
          }}
          className="shrink-0 flex justify-center items-center"
        >
          <VerticalResizeText
            style={{
              lineHeight: 1,
              fontFamily: fontOption.primary,
              fontWeight: 700,
              color: colors["first"]["primary"],
            }}
            maxFontSize={54}
            verticalGap={8}
          >
            {label}
          </VerticalResizeText>
        </div>
      )}
    </>
  );
};

const StreamingTime = ({
  day,
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  const textStyle: CellStyleProps = {
    0: { color: colors["first"]["primary"] },
    1: { color: colors["first"]["primary"] },
    2: { color: colors["first"]["secondary"] },
    3: { color: colors["first"]["secondary"] },
    4: { color: colors["first"]["secondary"] },
    5: { color: colors["first"]["secondary"] },
    6: { color: colors["first"]["secondary"] },
  };

  return (
    <p
      style={{
        fontSize: 48,
        lineHeight: 1,
        fontFamily: fontOption.primary,
        fontWeight: 700,
        ...textStyle[day as dayProps],
      }}
    >
      {isGuerrilla ? "게릴라" : formatTime(time, "half")}
    </p>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
  day,
}: CellTextMainTitleProps) => {
  const textStyle: CellStyleProps = {
    0: { color: colors["first"]["primary"] },
    1: { color: colors["first"]["primary"] },
    2: { color: colors["first"]["secondary"] },
    3: { color: colors["first"]["secondary"] },
    4: { color: colors["first"]["secondary"] },
    5: { color: colors["first"]["secondary"] },
    6: { color: colors["first"]["secondary"] },
  };

  const MaxFontSizes: MaxFontSizesProps = {
    0: 100,
    1: 100,
    2: 100,
    3: 88,
    4: 88,
    5: 100,
    6: 100,
  };

  const divStyle: CellStyleProps = {
    0: { height: 190, width: "85%", marginTop: 32 },
    1: { height: 190, width: "85%", marginTop: 32 },
    2: { height: 190, width: "85%", marginTop: 32 },
    3: { height: 240, width: "85%", marginTop: 24 },
    4: { height: 240, width: "85%", marginTop: 24 },
    5: { height: 120, width: "94%", marginTop: 50 },
    6: { height: 120, width: "94%", marginTop: 50 },
  };

  return (
    <div
      style={{
        ...divStyle[day as dayProps],
      }}
      className="flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          lineHeight: 1.1,
          fontFamily: fontOption.primary,
          fontWeight: 700,
          ...textStyle[day as dayProps],
        }}
        className="leading-none text-center"
        multiline={day < 5 ? true : false}
        maxFontSize={MaxFontSizes[day as dayProps]}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ day, cellTextTitle }: CellTextSubTitleProps) => {
  const textStyle: CellStyleProps = {
    0: { color: colors["first"]["primary"] },
    1: { color: colors["first"]["primary"] },
    2: { color: colors["first"]["secondary"] },
    3: { color: colors["first"]["secondary"] },
    4: { color: colors["first"]["secondary"] },
    5: { color: colors["first"]["secondary"] },
    6: { color: colors["first"]["secondary"] },
  };

  const divStyle: CellStyleProps = {
    0: { width: "85%", height: 80, marginTop: 16 },
    1: { width: "85%", height: 80, marginTop: 16 },
    2: { width: "85%", height: 80, marginTop: 16 },
    3: { width: "100%", height: 60, marginTop: 32 },
    4: { width: "100%", height: 60, marginTop: 32 },
    5: { width: "50%", height: 64 },
    6: { width: "50%", height: 64 },
  };

  const MaxFontSizes: MaxFontSizesProps = {
    0: 51,
    1: 51,
    2: 51,
    3: 64,
    4: 64,
    5: 48,
    6: 48,
  };

  return (
    <div
      className="flex items-center"
      style={{
        justifyContent: day < 5 ? "center" : "left",
        ...divStyle[day as dayProps],
      }}
    >
      <AutoResizeText
        style={{
          fontFamily: fontOption.primary,
          fontWeight: 700,

          ...textStyle[day as dayProps],
        }}
        className="leading-none text-center"
        maxFontSize={MaxFontSizes[day as dayProps]}
      >
        {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const cellStyle: CellStyleProps = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
  };

  return (
    <div
      className="absolute pointer-events-none "
      style={{
        ...cellStyle[day as dayProps],
        rotate: "-3.2deg",
      }}
      key={day}
    >
      <StreamingDay day={day} />
      <img
        style={{
          width: cellStyle[day as dayProps].width,
          height: cellStyle[day as dayProps].height,
        }}
        src={Imgs[currentTheme || "first"][days[day]].src.replace("./", "/")}
        alt="offline"
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
  const cellStyle: CellStyleProps = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
  };

  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        ...cellStyle[day as dayProps],
      }}
      className="relative w-full h-full flex flex-col items-center "
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
  const cellStyle: CellStyleProps = {
    0: {
      left: 192,
      top: 134,
      width: 1000,
      height: 540,
    },
    1: {
      left: 320,
      top: 832,
      width: 1000,
      height: 540,
      rotate: "8.3deg",
    },
    2: {
      left: 169,
      top: 1570,
      width: 1000,
      height: 540,
    },
    3: {
      left: 1490,
      top: 148,
      width: 812,
      height: 540,
    },
    4: {
      left: 1490,
      top: 707,
      width: 812,
      height: 540,
    },
    5: {
      left: 1381,
      top: 1418,
      width: 1060,
      height: 300,
    },
    6: {
      left: 1381,
      top: 1790,
      width: 1060,
      height: 300,
    },
  };

  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";
  const dayAndTimeEntries: CellStyleProps = {
    0: { marginTop: 100 },
    1: { marginTop: 100 },
    2: { marginTop: 100 },
    3: { marginTop: 68 },
    4: { marginTop: 68 },
    5: {},
    6: {},
  };
  const textStyle: CellStyleProps = {
    0: { color: colors["first"]["primary"] },
    1: { color: colors["first"]["primary"] },
    2: { color: colors["first"]["secondary"] },
    3: { color: colors["first"]["secondary"] },
    4: { color: colors["first"]["secondary"] },
    5: { color: colors["first"]["secondary"] },
    6: { color: colors["first"]["secondary"] },
  };
  return (
    <>
      {time.day < 5 ? (
        <div
          style={{
            position: "absolute",
            ...cellStyle[time.day as dayProps],
          }}
          key={time.day}
          className="relative  flex flex-col items-center"
        >
          {time.isOffline ? (
            <>
              <div
                style={{
                  ...dayAndTimeEntries[time.day as dayProps],
                }}
                className="w-full flex justify-center items-center"
              >
                <StreamingDay day={time.day} />
              </div>
              {time.day < 3 ? (
                <div className="flex flex-col justify-center items-center gap-4 mt-20">
                  <p
                    style={{
                      lineHeight: 1,
                      fontSize: 136,
                      fontFamily: fontOption.primary,
                      fontWeight: 700,
                      ...textStyle[time.day as dayProps],
                    }}
                  >
                    공룡 휴식중
                  </p>
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center gap-4 mt-10">
                  <p
                    style={{
                      lineHeight: 1,
                      fontSize: 136,
                      fontFamily: fontOption.primary,
                      fontWeight: 700,
                      ...textStyle[time.day as dayProps],
                    }}
                  >
                    공룡
                  </p>
                  <p
                    style={{
                      lineHeight: 1,
                      fontSize: 136,
                      fontFamily: fontOption.primary,
                      fontWeight: 700,
                      ...textStyle[time.day as dayProps],
                    }}
                  >
                    휴식중
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                style={{
                  ...dayAndTimeEntries[time.day as dayProps],
                }}
                className="w-full flex justify-center items-center"
              >
                <StreamingDay day={time.day} />
                <WhiteSpaceMark day={time.day} />
                <StreamingTime
                  day={time.day}
                  isGuerrilla={primaryEntry.isGuerrilla}
                  time={entryTime}
                />
              </div>

              <CellTextMainTitle day={time.day} mainTitle={entryMainTitle} />
              <CellTextTitle day={time.day} cellTextTitle={entrySubTitle} />
            </>
          )}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            ...cellStyle[time.day as dayProps],
          }}
          key={time.day}
          className="relative flex "
        >
          <StreamingDay day={time.day} />

          {time.isOffline ? (
            <div className="w-full h-full flex items-center justify-center">
              <p
                style={{
                  lineHeight: 1,
                  fontSize: 136,
                  fontFamily: fontOption.primary,
                  fontWeight: 700,
                  ...textStyle[time.day as dayProps],
                }}
              >
                공룡 휴식중
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center">
              <CellTextMainTitle day={time.day} mainTitle={entryMainTitle} />
              <div
                style={{ marginTop: 8 }}
                className="w-full flex justify-center items-center"
              >
                <StreamingTime
                  day={time.day}
                  isGuerrilla={primaryEntry.isGuerrilla}
                  time={entryTime}
                />
                <WhiteSpaceMark day={time.day} />
                <CellTextTitle day={time.day} cellTextTitle={entrySubTitle} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
