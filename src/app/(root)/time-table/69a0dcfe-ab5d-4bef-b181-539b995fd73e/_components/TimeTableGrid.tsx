import React, { Fragment } from "react";

import { TTheme } from "@/types/time-table/theme";
import { TDefaultCard } from "@/utils/time-table/data";
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
    <div
      style={{
        top: 100,
        left: -87,
        position: "absolute",
        zIndex: 30,
        rotate: "-3.6deg",
      }}
    >
      <div
        className="absolute flex flex-col flex-wrap z-30 "
        style={{
          top: 312,
          left: 80,
          columnGap: 64,
          height: 1940,
        }}
      >
        {data.map((time, i) => (
          <Fragment key={time.day}>
            <TimeTableCell
              time={time}
              currentTheme={currentTheme}
              weekDate={weekDates[i]}
              index={i}
              isBig={i === 2 || i === 4 ? true : false}
            />
          </Fragment>
        ))}
      </div>
      <div
        style={{ width: 2744, height: 2264 }}
        className="absolute inset-0 z-20"
      >
        <img
          className="object-cover w-full h-full pointer-events-none"
          src={Imgs["first"]["schedule"].src.replace("./", "/")}
          alt="online"
        />
      </div>
    </div>
  );
};

export default TimeTableGrid;
