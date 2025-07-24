import React from "react";
import type { Data } from "../TimeTableEditor";
import { weekdays } from "./types";

interface TimeTableCellProps {
  time: Data;
  weekDate: Date;
  index: number;
}

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  index,
}) => {
  const descriptionFontSize = 20;
  if (!weekDate) return "Loading";
  if (time.isHoliday) {
    return (
      <div
        key={time.day}
        className=" w-full h-full flex flex-col justify-center items-center"
        style={{
          fontSize: `${descriptionFontSize}px`,
          backgroundImage: "url(/img/memo-03.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <p className=" text-center">
          <p className=" text-center">
            {weekdays[time.day]} {`(${weekDate.getDate()})`}
          </p>
        </p>
        <p className=" text-center">휴방</p>
      </div>
    );
  }

  return (
    <div
      key={time.day}
      className="w-full h-full flex flex-col justify-center items-center"
      style={{
        fontSize: `${descriptionFontSize}px`,
        backgroundImage: "url(/img/memo-01.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <p className=" text-center">
        {weekdays[time.day]} {`(${weekDate.getDate()})`}
      </p>
      <p className=" text-center">{time.time}</p>
      <p className=" text-center py-2">{time.description}</p>
    </div>
  );
};

export default TimeTableCell;
