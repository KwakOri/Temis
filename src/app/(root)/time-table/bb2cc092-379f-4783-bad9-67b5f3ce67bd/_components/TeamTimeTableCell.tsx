import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { TTheme } from "@/types/time-table/theme";
import { formatTime } from "@/utils/time-formatter";
import { Imgs } from "../_img/imgs";

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

interface StreamingMainTitleProps {
  isMultiple?: boolean;
  currentTheme?: TTheme;
  mainTitle: string;
}

interface TeamTimeTableCellProps {
  data: {
    day: number;
    isOffline: boolean;
    entries: Array<{
      time: string;
      mainTitle: string;
      userNames: number[];
    }>;
  };
  weekDate: Date;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  currentTheme: TTheme;
}

const DayText: React.FC<DayTextProps> = ({ day }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 40,

        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      day
    </div>
  );
};

const StreamingTime: React.FC<StreamingTimeProps> = ({ time, isMultiple }) => {
  return (
    <div
      style={{
        position: "absolute",

        fontWeight: "bold",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {formatTime(time)}
    </div>
  );
};

const DateText: React.FC<DateTextProps> = ({ date }) => {
  return (
    <div
      style={{
        position: "absolute",

        zIndex: 40,

        textAlign: "center",

        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {date}
    </div>
  );
};

const StreamingMainTitle: React.FC<StreamingMainTitleProps> = ({
  isMultiple,
  mainTitle,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 40,
      }}
    >
      <AutoResizeText maxFontSize={40}>{mainTitle}</AutoResizeText>
    </div>
  );
};

const OfflineCard: React.FC<OfflineCardProps> = ({ currentTheme }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 28,
        zIndex: 50,
        width: 86,
        height: 25,
      }}
    >
      <img
        src={Imgs[currentTheme]["offline"].src}
        alt={"offline"}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

const TeamTimeTableCell: React.FC<TeamTimeTableCellProps> = ({
  data,
  weekDate,
  currentTheme,
}) => {
  const isMultiple = data.entries.length > 1;
  const hasContent =
    data.entries.length > 0 &&
    data.entries.some((entry) => entry.time && entry.mainTitle);

  // 첫 번째 엔트리 또는 빈 엔트리
  const primaryEntry = hasContent
    ? data.entries[0]
    : { time: "", mainTitle: "" };

  return (
    <></>
    // <div className="relative" style={{}}>
    //   {/* 배경 이미지 */}
    //   <div
    //     style={{
    //       position: "absolute",
    //       top: 0,
    //       left: 0,
    //       zIndex: 30,
    //       width: "100%",
    //       height: "100%",
    //     }}
    //   >
    //     {" "}
    //     {hasContent && (
    //       <img
    //         src={Imgs[currentTheme]["online"].src}
    //         alt={"card"}
    //         draggable={false}
    //         style={{
    //           width: "100%",
    //           height: "100%",
    //           objectFit: "contain",
    //         }}
    //       />
    //     )}
    //   </div>

    //   {/* 요일 */}
    //   <DayText day={data.day} />

    //   {/* 날짜 */}
    //   <DateText date={weekDate.getDate()} />

    //   {/* 오프라인 표시 */}
    //   {data.isOffline && <OfflineCard currentTheme={currentTheme} />}

    //   {/* 시간 */}
    //   {hasContent && (
    //     <StreamingTime
    //       time={primaryEntry.time}
    //       isMultiple={isMultiple}
    //       currentTheme={currentTheme}
    //     />
    //   )}

    //   {/* 메인 타이틀 */}
    //   {hasContent && (
    //     <StreamingMainTitle
    //       isMultiple={isMultiple}
    //       mainTitle={primaryEntry.mainTitle}
    //       currentTheme={currentTheme}
    //     />
    //   )}
    // </div>
  );
};

export default TeamTimeTableCell;
