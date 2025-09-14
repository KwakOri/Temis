import React, { CSSProperties, Fragment } from "react";

import { TTheme } from "@/types/time-table/theme";
import { TDefaultCard } from "@/utils/time-table/data";
import TimeTableCell from "./TimeTableCell";

interface TimeTableGridProps {
  data: TDefaultCard[];
  weekDates: Date[];
  currentTheme: TTheme;
}

export interface CellStyleProps {
  container: CSSProperties;
  contentArea: CSSProperties;
  sideTab: CSSProperties;
  timestamp: CSSProperties;
  offlineSticker: CSSProperties;
}

const CELL_STYLE: CellStyleProps[] = [
  {
    container: { left: -56, top: 0, opacity: 1 },
    contentArea: {
      position: "absolute",
      left: 104,
      top: 212,
      color: "black",
    },
    sideTab: { top: 64, left: 578 },
    timestamp: { bottom: 95, left: 170, color: "black" },
    offlineSticker: { left: -54, top: 56 },
  },
  {
    container: { left: 504, top: 16, opacity: 1, color: "#F3EFE5" },
    contentArea: { left: 280, top: 216 },
    sideTab: { top: 454, left: 66, flexDirection: "row-reverse" },
    timestamp: { top: 72, left: 320, color: "#F3EFE5" },
    offlineSticker: { left: 100, top: -30 },
  },
  {
    container: { left: 1220, top: -20, opacity: 1 },
    contentArea: { left: 120, top: 232 },
    sideTab: {
      top: 76,
      left: 586,
    },
    timestamp: { bottom: 76, left: 182, color: "black" },
    offlineSticker: { left: -54, top: 56 },
  },
  {
    container: { left: -48, top: 976, opacity: 1, color: "#F3EFE5" },
    contentArea: { left: 108, top: 216 },
    sideTab: {
      top: 454,
      left: 584,
    },
    timestamp: { bottom: 95, left: 170, color: "#F3EFE5" },
    offlineSticker: { left: -54, top: 56 },
  },
  {
    container: { left: 516, top: 932, opacity: 1 },
    contentArea: { left: 280, top: 214 },
    sideTab: {
      left: 66,
      top: 56,
      flexDirection: "row-reverse",
    },
    timestamp: { top: 72, left: 320, color: "black" },
    offlineSticker: { left: 100, top: -30 },
  },
  {
    container: { left: 1236, top: 960, opacity: 1, color: "#F3EFE5" },
    contentArea: { left: 112, top: 216 },
    sideTab: {
      top: 454,
      left: 584,
    },
    timestamp: { bottom: 90, left: 178, color: "#F3EFE5" },
    offlineSticker: { left: -54, top: 56 },
  },
  {
    container: { left: 1808, top: 904, opacity: 1, color: "black" },
    contentArea: { left: 280, top: 236 },
    sideTab: {
      left: 64,
      top: 70,
      flexDirection: "row-reverse",
    },
    timestamp: { top: 92, left: 320, color: "black" },
    offlineSticker: { left: 100, top: -30 },
  },
];

const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  console.log("data => ", data);
  return (
    <div
      className="absolute z-20"
      style={{
        top: 340,
        left: -2,
        columnGap: 56,
        rowGap: 44,
        rotate: "-1.4deg",
      }}
    >
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <TimeTableCell
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
            cellStyle={CELL_STYLE[time.day]}
          />
          {(i === 1 || i === 3) && <div></div>}
        </Fragment>
      ))}
    </div>
  );
};

export default TimeTableGrid;
