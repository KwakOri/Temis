import { useTimeTableData, useTimeTableUI } from '@/contexts/TimeTableContext';
import React from 'react';

import TeamTimeTableDesignGuide from '@/components/tools/TeamTimeTableDesignGuide';
import { UserScheduleData } from '@/types/team-timetable';
import { TPlaceholders } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { isGuideEnabled } from '@/utils/time-table/data';
import { templateSize } from '../../_settings/settings';
import TeamTimeTableBoard from '../TeamTimeTableBoard';
import TeamTimeTableGrid from '../TeamTimeTableGrid';
import TeamTimeTableWeekDates from '../TeamTimeTableWeekDates';

export interface TeamTimeTableContentProps {
  currentTheme: TTheme;
  data: UserScheduleData[];
  placeholders: TPlaceholders;
}

const TeamTimeTableContent: React.FC<TeamTimeTableContentProps> = ({
  currentTheme,
  data,
  placeholders,
}) => {
  const { imageSrc, weekDates, profileText, memoText, isMemoTextVisible } =
    useTimeTableData();
  const { scale, isProfileTextVisible } = useTimeTableUI();

  if (weekDates.length === 0) return null;

  console.log(memoText, isMemoTextVisible);

  return (
    <div
      id="timetable"
      className=" box-border select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,

        width: templateSize.width,
        height: templateSize.height,
      }}
    >
      {isGuideEnabled && <TeamTimeTableDesignGuide />}
      {/* <TeamTimeTableTopObject /> */}
      <TeamTimeTableWeekDates />
      {/* <TeamTimeTableMemo /> */}
      <TeamTimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <TeamTimeTableBoard />
    </div>
  );
};

export default TeamTimeTableContent;
