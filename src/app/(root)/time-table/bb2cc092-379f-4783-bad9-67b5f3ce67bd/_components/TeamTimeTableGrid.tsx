import React, { Fragment } from "react";

import { TeamSchedule } from "@/types/team-timetable";
import { TTheme } from "@/types/time-table/theme";
import TeamTimeTableCell from "./TeamTimeTableCell";

interface TeamTimeTableGridProps {
  data: TeamSchedule[];
  weekDates: Date[];
  currentTheme: TTheme;
}

const TeamTimeTableGrid: React.FC<TeamTimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  return (
    <div
      className="absolute grid grid-cols-3 z-20"
      style={{
        top: 136,
        left: 100,
        columnGap: 32,
        rowGap: 60,
      }}
    >
      {data.map((member, i) => (
        <Fragment key={member.id}>
          <TeamTimeTableCell
            data={member}
            weekDate={weekDates}
            currentTheme={currentTheme}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default TeamTimeTableGrid;
