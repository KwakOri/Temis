import React, { Fragment } from "react";

import { AutoResizeText } from "@/components/AutoResizeTextCard";
import { useTimeTableData } from "@/contexts/TimeTableContext";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import { Imgs } from "../_img/imgs";
import {
  colors,
  fontOption,
  onlineCardHeight,
  onlineCardWidth,
} from "../_settings/settings";
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
  const { isMemoTextVisible, memoText } = useTimeTableData();
  const memoPlaceholder =
    "메모 적는 곳\n이렇게 보통\n4줄까지\n적을 수 있습니다";
  return (
    <div
      className="absolute grid grid-cols-4 z-20"
      style={{
        columnGap: 4,
        rowGap: 84,
        top: 410,
        left: 120,
      }}
    >
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <TimeTableCell
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
        </Fragment>
      ))}
      {isMemoTextVisible && (
        <div
          className="relative flex justify-center items-center"
          style={{ width: onlineCardWidth, height: onlineCardHeight }}
        >
          <div className="relative top-4 z-10 mt-10 w-120 h-120 flex justify-center items-center">
            <AutoResizeText
              maxFontSize={80}
              multiline
              style={{
                lineHeight: 1.2,
                fontFamily: fontOption.primary,
                color: colors["first"]["primary"],
                textAlign: "center",
                fontWeight: 300,
              }}
            >
              {memoText || memoPlaceholder}
            </AutoResizeText>
          </div>
          <img
            className="absolute inset-0"
            src={Imgs["first"]["memo"].src}
            alt="memo"
          />
        </div>
      )}
    </div>
  );
};

export default TimeTableGrid;
