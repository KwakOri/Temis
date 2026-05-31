import { useTimeTableData, useTimeTableUI } from '@/contexts/TimeTableContext';
import React from 'react';

import TimeTableDesignGuide from '@/components/tools/TimeTableDesignGuide';
import { TDefaultCard, TPlaceholders } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { isGuideEnabled } from '@/utils/time-table/data';
import { templateSize } from '../../_settings/settings';
import TimeTableArtist from '../TimeTableArtist';
import TimeTableBoard from '../TimeTableBoard';
import TimeTableGrid from '../TimeTableGrid';
import TimeTableProfile from '../TimeTableProfile';
import TimeTableTopObject from '../TimeTableTopObject';
import TimeTableWeekFlag from '../TimeTableWeekFlag';
import TimeTableWeeklyMemo from '../TimeTableWeeklyMemo';

export interface TimeTableContentProps {
  currentTheme: TTheme;
  data: TDefaultCard[];
  placeholders: TPlaceholders;
}

const TimeTableContent: React.FC<TimeTableContentProps> = ({
  currentTheme,
  data,
  placeholders,
}) => {
  const { imageSrc, weekDates, profileText } = useTimeTableData();
  const { scale, isProfileTextVisible } = useTimeTableUI();

  if (weekDates.length === 0) return null;

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
      {isGuideEnabled && <TimeTableDesignGuide />}
      <TimeTableTopObject />
      <TimeTableArtist
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
        isProfileTextVisible={isProfileTextVisible}
      />
      <TimeTableWeeklyMemo />
      <TimeTableWeekFlag currentTheme={currentTheme} weekDates={weekDates} />

      <TimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <TimeTableProfile imageSrc={imageSrc} currentTheme={currentTheme} />
      <TimeTableBoard />
    </div>
  );
};

export default TimeTableContent;
