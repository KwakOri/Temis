import React from "react";

import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { Imgs } from "../_img/imgs";
import { offlineCardHeight, offlineCardWidth } from "../_settings/settings";
import TimeTableCell from "./TimeTableCell";

interface OfflineCardProps {
  day: number;
  currentTheme?: TTheme;
}

// const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
//   return (

//   );
// };

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
      className="absolute grid grid-cols-4 z-20"
      style={{
        columnGap: 60,
        rowGap: 0,
        top: 104,
        left: 24,
        rotate: "-2.1deg",
      }}
    >
      {data.slice(0, 4).map((time, i) => {
        const isLastIndex = i === 3;
        const isVisibleTopBg = !data[i].isOffline;
        const isVisibleBottomBg = isLastIndex ? false : !data[i + 4]?.isOffline;

        return (
          <div
            style={{
              width: offlineCardWidth,
              height: offlineCardHeight,
            }}
            key={time.day}
            className="relative -z-10 flex items-center justify-center"
          >
            <div
              style={{ width: "70%" }}
              className="h-full relative z-40 flex flex-col justify-evenly"
            >
              <div className="w-full h-[520px] ">
                {isVisibleTopBg && (
                  <TimeTableCell
                    time={data[i]}
                    currentTheme={currentTheme}
                    weekDate={weekDates[i]}
                    index={i}
                  />
                )}
              </div>

              <div className="w-full h-[520px]">
                {isVisibleBottomBg && !isLastIndex && (
                  <TimeTableCell
                    time={data[i + 4]}
                    currentTheme={currentTheme}
                    weekDate={weekDates[i + 4]}
                    index={i + 4}
                  />
                )}
              </div>
            </div>
            {isVisibleTopBg && (
              <img
                className="object-cover w-full h-full absolute inset-0 z-10"
                src={Imgs["first"]["onlineTop"].src.replace("./", "/")}
                alt="online"
              />
            )}
            {isVisibleBottomBg && (
              <img
                className="object-cover w-full h-full absolute inset-0 z-10"
                src={Imgs["first"]["onlineBottom"].src.replace("./", "/")}
                alt="online"
              />
            )}
            {isVisibleBottomBg && isVisibleTopBg && (
              <img
                className="object-cover w-full h-full absolute inset-0 z-20"
                src={Imgs["first"]["onlineMid"].src.replace("./", "/")}
                alt="online"
              />
            )}
            <img
              className="object-cover w-full h-full absolute inset-0"
              src={Imgs["first"]["offline"].src.replace("./", "/")}
              alt="online"
            />
          </div>
        );
      })}
    </div>
  );
};

export default TimeTableGrid;
