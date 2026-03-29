import React, { Fragment } from "react";

import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import V2TimeTableCell from "./V2TimeTableCell";

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
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const gridLayout = renderConfig.layout.grid;

  return (
    <div
      style={{
        right: gridLayout.right,
        top: gridLayout.top,
        rowGap: gridLayout.rowGap,
        columnGap: gridLayout.columnGap,
        gridTemplateColumns: `repeat(${Math.max(gridLayout.columns, 1)}, minmax(0, 1fr))`,
      }}
      className="absolute grid z-20"
    >
      <div></div>
      <div></div>
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <V2TimeTableCell
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default TimeTableGrid;
