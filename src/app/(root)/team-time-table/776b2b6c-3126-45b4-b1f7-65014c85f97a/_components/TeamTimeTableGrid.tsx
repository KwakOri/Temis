import React from 'react';

import { TeamTimeTableDay, UserScheduleData } from '@/types/team-timetable';
import { TTheme } from '@/types/time-table/theme';
import TeamTimeTableCell from './TeamTimeTableCell';

interface TeamTimeTableGridProps {
  data: UserScheduleData[];
  weekDates: Date[];
  currentTheme: TTheme;
}

export interface DayGroupedMemberSchedule {
  user_id: number;
  success: boolean;
  schedule: TeamTimeTableDay | null;
}

export interface DayGroupedSchedule {
  day: number;
  date: Date | null;
  members: DayGroupedMemberSchedule[];
}

const DAYS_IN_WEEK = 7;
const UNSCHEDULED_TIME = Number.POSITIVE_INFINITY;

const parseTimeToMinutes = (time: string): number => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return UNSCHEDULED_TIME;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return UNSCHEDULED_TIME;
  }

  return hours * 60 + minutes;
};

const getEarliestBroadcastMinutes = (
  schedule: TeamTimeTableDay | null
): number => {
  if (!schedule || schedule.entries.length === 0) {
    return UNSCHEDULED_TIME;
  }

  const earliest = schedule.entries.reduce((minTime, entry) => {
    const entryTime = parseTimeToMinutes(entry.time);
    return entryTime < minTime ? entryTime : minTime;
  }, UNSCHEDULED_TIME);

  return earliest;
};

const groupSchedulesByDay = (
  memberSchedules: UserScheduleData[],
  weekDates: Date[]
): DayGroupedSchedule[] => {
  const memberOrderMap = new Map(
    memberSchedules.map((member, index) => [member.user_id, index])
  );

  return Array.from({ length: DAYS_IN_WEEK }, (_, day) => ({
    day,
    date: weekDates[day] ?? null,
    members: memberSchedules
      .map((member) => ({
        user_id: member.user_id,
        success: member.success,
        schedule:
          member.schedule?.schedule_data.find(
            (daySchedule) => daySchedule.day === day
          ) ?? null,
      }))
      .sort((a, b) => {
        const aTime = getEarliestBroadcastMinutes(a.schedule);
        const bTime = getEarliestBroadcastMinutes(b.schedule);

        if (aTime !== bTime) {
          return aTime - bTime;
        }

        return (
          (memberOrderMap.get(a.user_id) ?? Number.MAX_SAFE_INTEGER) -
          (memberOrderMap.get(b.user_id) ?? Number.MAX_SAFE_INTEGER)
        );
      }),
  }));
};

const TeamTimeTableGrid: React.FC<TeamTimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  const dataByDay = React.useMemo(
    () => groupSchedulesByDay(data, weekDates),
    [data, weekDates]
  );

  return (
    <div
      className="absolute flex z-20"
      style={{
        top: 350,
        left: 214,
        gap: 18,
        rotate: '-8.5deg',
      }}
    >
      {dataByDay.map((dayGroup) => (
        <div key={`day-${dayGroup.day}`} className="flex flex-col gap-7">
          {dayGroup.members.map((member, i) => (
            <TeamTimeTableCell
              key={`day-${dayGroup.day}-member-${member.user_id}`}
              order={i + 1}
              data={member}
              weekDate={weekDates}
              currentTheme={currentTheme}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TeamTimeTableGrid;
