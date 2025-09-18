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
  // 팀 스케줄 데이터를 요일별로 병합
  const mergedData = React.useMemo(() => {
    const dayData: Array<{
      day: number;
      isOffline: boolean;
      entries: Array<{
        time: string;
        mainTitle: string;
        userNames: number[];
      }>;
    }> = [];

    // 7일간의 기본 데이터 초기화
    for (let day = 0; day < 7; day++) {
      dayData.push({
        day,
        isOffline: false,
        entries: [],
      });
    }

    // 각 팀 스케줄 데이터 병합
    data.forEach((schedule) => {
      if (schedule.schedule_data) {
        schedule.schedule_data.forEach((dayInfo) => {
          const dayIndex = dayInfo.day;
          if (dayIndex >= 0 && dayIndex < 7) {
            const targetDay = dayData[dayIndex];

            // 오프라인 상태 업데이트
            if (dayInfo.isOffline) {
              targetDay.isOffline = true;
            }

            // 각 엔트리 추가
            dayInfo.entries.forEach((entry) => {
              // 같은 시간대의 기존 엔트리 찾기
              const existingEntry = targetDay.entries.find(
                (e) => e.time === entry.time
              );

              if (existingEntry) {
                // 기존 엔트리에 사용자 추가
                if (!existingEntry.userNames.includes(schedule.user_id)) {
                  existingEntry.userNames.push(schedule.user_id);
                  existingEntry.mainTitle += ` / ${entry.mainTitle}`;
                }
              } else {
                // 새 엔트리 추가
                targetDay.entries.push({
                  time: entry.time,
                  mainTitle: entry.mainTitle,
                  userNames: [schedule.user_id],
                });
              }
            });
          }
        });
      }
    });

    // 각 날짜의 엔트리를 시간순으로 정렬
    dayData.forEach((day) => {
      day.entries.sort((a, b) => a.time.localeCompare(b.time));
    });

    return dayData;
  }, [data]);

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
      {mergedData.map((dayData, i) => (
        <Fragment key={dayData.day}>
          <TeamTimeTableCell
            data={dayData}
            weekDate={weekDates[i]}
            currentTheme={currentTheme}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default TeamTimeTableGrid;
