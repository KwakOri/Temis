import React, { CSSProperties, PropsWithChildren } from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { Imgs } from "../_img/imgs";
import { placeholders } from "../_settings/general";
import { fontOption } from "../_settings/settings";

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

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  return (
    <div
      style={{}}
      className="absolute flex flex-col justify-center items-center text-white/80 pt-1"
    ></div>
  );
};

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

const StreamingTime = ({
  day,
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  const textStyle: CellStyleProps = {
    0: {
      width: 294,
      height: 84,

      fontWeight: 400,
      fontSize: 42,
      bottom: -48,
      left: 360,
      color: "#9393B1",
    },
    1: {
      width: 294,
      height: 84,

      fontWeight: 400,
      fontSize: 42,
      bottom: -4,
      color: "#9393B1",
    },
    2: {
      width: 294,
      height: 84,

      fontWeight: 400,
      fontSize: 42,
      bottom: -4,
      color: "#9393B1",
    },
    3: {
      width: 294,
      height: 84,

      fontWeight: 400,
      fontSize: 42,
      bottom: -28,
      color: "#FAFAFA",
    },
    4: {
      width: 294,
      height: 84,

      fontWeight: 400,
      fontSize: 42,
      bottom: -28,
      color: "#FAFAFA",
    },
    5: {
      width: 294,
      height: 84,

      fontWeight: 400,
      fontSize: 42,
      bottom: -28,
      color: "#FAFAFA",
    },
    6: {
      width: 294,
      height: 84,

      fontWeight: 400,
      fontSize: 42,
      bottom: 68,
      left: 696,
      color: "#FAFAFA",
    },
  };

  const [zone, halfTime] = formatTime(time, "half").split(" ");
  return (
    <p
      style={{
        lineHeight: 1,
        fontFamily: fontOption.primary,
        ...textStyle[day as dayProps],
      }}
      className="absolute flex justify-center items-center "
    >
      {isGuerrilla ? "게릴라" : halfTime + " " + zone}
    </p>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
  day,
}: CellTextMainTitleProps) => {
  const textStyle: CellStyleProps = {
    0: { color: "#334259" },
    1: { color: "#334259" },
    2: { color: "#334259" },
    3: { color: "#334259" },
    4: { color: "#334259" },
    5: { color: "#334259" },
    6: { color: "#FAFAFA" },
  };

  const divStyle: CellStyleProps = {
    0: { height: 190, width: "100%", top: 132 },
    1: { height: 190, width: "100%", top: 132 },
    2: { height: 190, width: "100%", top: 132 },
    3: { height: 190, width: "100%", top: 132 },
    4: { height: 190, width: "100%", top: 132 },
    5: { height: 190, width: "100%", top: 132 },
    6: { height: 190, width: "100%", top: 196 },
  };

  return (
    <div
      style={{
        ...divStyle[day as dayProps],
        justifyContent: day === 6 ? "start" : "center",
        alignItems: day === 6 ? "start" : "center",
      }}
      className="absolute flex"
    >
      <AutoResizeText
        style={{
          ...textStyle[day as dayProps],
          lineHeight: 1.2,
          textAlign: day === 6 ? "left" : "center",
        }}
        className="leading-none"
        multiline={true}
        maxFontSize={64}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ day, cellTextTitle }: CellTextSubTitleProps) => {
  const textStyle: CellStyleProps = {
    0: { color: "#9696B4" },
    1: { color: "#9696B4" },
    2: { color: "#9696B4" },
    3: { color: "#9696B4" },
    4: { color: "#9696B4" },
    5: { color: "#FAFAFA" },
    6: { color: "#DFDFDF" },
  };

  const divStyle: CellStyleProps = {
    0: { width: "100%", height: 60, top: 68 },
    1: { width: "100%", height: 60, top: 68 },
    2: { width: "100%", height: 60, top: 68 },
    3: { width: "100%", height: 60, top: 68 },
    4: { width: "100%", height: 60, top: 68 },
    5: { width: "100%", height: 60, top: 68 },
    6: { width: "100%", height: 60, top: 118 },
  };

  return (
    <div
      className="flex items-center absolute"
      style={{
        ...divStyle[day as dayProps],
        justifyContent: day === 6 ? "left" : "center",
      }}
    >
      <AutoResizeText
        style={{
          ...textStyle[day as dayProps],
        }}
        className="leading-none text-center"
        maxFontSize={39}
      >
        {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
}

// const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
//   return (
//     <div
//       style={{
//         width: onlineCardWidth,
//         height: onlineCardHeight,
//       }}
//       className="absolute inset-0 -z-10"
//     >
//       <img
//         className="object-cover w-full h-full"
//         src={Imgs["first"]["online"].src.replace("./", "/")}
//         alt="online"
//       />
//     </div>
//   );
// };

interface CellStyleProps {
  0: CSSProperties;
  1: CSSProperties;
  2: CSSProperties;
  3: CSSProperties;
  4: CSSProperties;
  5: CSSProperties;
  6: CSSProperties;
}

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const cellStyle: CellStyleProps = {
    0: {
      width: 859,
      height: 706,
      left: -174,
      top: -204,
    },
    1: {
      width: 709,
      height: 652,
      left: -92,
      top: -154,
    },
    2: {
      width: 648,
      height: 602,
      left: -64,
      top: -130,
    },
    3: {
      width: 735,
      height: 658,
      left: -100,
      top: -130,
    },
    4: {
      width: 554,
      height: 563,
      left: -16,
      top: -120,
    },
    5: {
      width: 552,
      height: 563,
      left: -12,
      top: -120,
    },
    6: {
      width: 1301,
      height: 439,
      left: -192,
      top: -4,
    },
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
    0: { width: 400, height: "100%" },
    1: { width: 400, height: "100%" },
    2: { width: 400, height: "100%" },
    3: { width: 400, height: "100%" },
    4: { width: 400, height: "100%" },
    5: { width: 400, height: "100%" },
    6: { width: 580, height: "100%" },
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

type dayProps = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  const cellStyle: CellStyleProps = {
    0: {
      left: 1346,
      top: 772,
      width: 530,
      height: 410,
    },
    1: {
      left: 1436,
      top: 1448,
      width: 530,
      height: 410,
    },
    2: {
      left: 2292,
      top: 390,
      width: 530,
      height: 410,
    },
    3: {
      left: 2968,
      top: 588,
      width: 530,
      height: 410,
    },
    4: {
      left: 2310,
      top: 1260,
      width: 530,
      height: 410,
    },
    5: {
      left: 2888,
      top: 1296,
      width: 530,
      height: 410,
    },
    6: {
      left: 2480,
      top: 1760,
      width: 700,
      height: 410,
    },
  };

  if (!weekDate) return "Loading";

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  return (
    <div
      style={{
        position: "absolute",
        rotate: "3.2deg",
        ...cellStyle[time.day as dayProps],
      }}
      key={time.day}
      className="relative flex justify-center  overflow-visible"
    >
      <StreamingDate day={time.day} date={weekDate.getDate()} />

      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : (
        <>
          <CellContentArea day={time.day}>
            <CellTextTitle day={time.day} cellTextTitle={entrySubTitle} />
            <CellTextMainTitle day={time.day} mainTitle={entryMainTitle} />
          </CellContentArea>
          <StreamingTime
            day={time.day}
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
          />
        </>
      )}
    </div>
  );
};

export default TimeTableCell;
