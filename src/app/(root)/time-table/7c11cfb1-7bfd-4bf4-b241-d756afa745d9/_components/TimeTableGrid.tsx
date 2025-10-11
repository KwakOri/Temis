import React from "react";

import { TTheme } from "@/types/time-table/theme";

import { TDefaultCard } from "@/types/time-table/data";
import { Imgs } from "../_img/imgs";
import TimeTableCell from "./TimeTableCell";

interface TimeTableGridProps {
  data: TDefaultCard[];
  weekDates: Date[];
  currentTheme: TTheme;
}

const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  return (
    <>
      <div
        style={{
          width: 4000,
          height: 2250,
          position: "absolute",
          zIndex: 30,
        }}
      >
        <img
          src={Imgs["first"]["sticker"].src}
          alt={"top-object"}
          draggable={false}
        />
      </div>
      <div
        className="absolute grid grid-cols-4 z-20"
        style={{
          top: 600,
          left: 20,
          columnGap: 20,
          rowGap: 68,
          rotate: "-2.5deg",
        }}
      >
        {data.map((time, i) => (
          <TimeTableCell
            key={time.day}
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
        ))}
      </div>
    </>
  );
};

export default TimeTableGrid;
