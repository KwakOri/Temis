import React, { Fragment } from "react";

import { useTimeTableData } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import V2TimeTableCell from "./V2TimeTableCell";

const TimeTableGrid: React.FC = () => {
  const { data, currentTheme } = useV2TimeTableEditorRuntimeContext();
  const { weekDates } = useTimeTableData();
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
