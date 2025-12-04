import React, { Fragment } from "react";

import { UserScheduleData } from "@/types/team-timetable";
import { TTheme } from "@/types/time-table/theme";
import TeamTimeTableCell from "./TeamTimeTableCell";

interface TeamTimeTableGridProps {
  data: UserScheduleData[];
  weekDates: Date[];
  currentTheme: TTheme;
}

const TeamTimeTableGrid: React.FC<TeamTimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  console.log("team_data => ", data);
  console.log("weekDates => ", weekDates);
  return (
    <div
      className="absolute flex flex-col z-20"
      style={{
        top: 310,
        left: 230,
        gap: 64,

        rotate: "-3.5deg",
      }}
    >
      {data.map((member, i) => (
        <Fragment key={member.user_id}>
          <TeamTimeTableCell
            order={i + 1}
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
