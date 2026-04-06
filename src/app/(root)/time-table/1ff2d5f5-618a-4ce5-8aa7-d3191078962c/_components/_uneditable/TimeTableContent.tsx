import { useTimeTableData, useTimeTableUI } from '@/contexts/TimeTableContext';
import React from 'react';

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import TimeTableDesignGuide from '@/components/tools/TimeTableDesignGuide';
import { TDefaultCard, TPlaceholders } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { isGuideEnabled } from '@/utils/time-table/data';
import { Imgs } from '../../_img/imgs';
import {
  COMP_COLORS,
  COMP_FONTS,
  templateSize,
} from '../../_settings/settings';
import ProfileImageSection from '../ProfileImageContainer';
import TimeTableFrameTop from '../TimeTableFrameTop';
import TimeTableGrid from '../TimeTableGrid';
import TimeTableTopObject from '../TimeTableTopObject';
import TimeTableWeekFlag from '../TimeTableWeekFlag';

interface ProfileTextProps {
  profileText: string;
  profileTextPlaceholder: string;
  isProfileTextVisible: boolean;
}

const ProfileText = ({
  profileText,
  profileTextPlaceholder,
  isProfileTextVisible,
}: ProfileTextProps) => {
  if (!isProfileTextVisible) return null;
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
      }}
      className="absolute z-50 flex justify-end items-center "
    >
      <div
        style={{
          position: 'absolute',
          height: 160,
          width: 800,
          zIndex: 20,
          top: 2060,
          left: 2752,
          rotate: '8.1deg',
        }}
        className="flex justify-start items-center "
      >
        <AutoResizeText
          style={{
            lineHeight: 1,
            color: COMP_COLORS.ARTIST,
            fontFamily: COMP_FONTS.ARTIST,
            fontWeight: 700,
          }}
          className="text-left"
          maxFontSize={96}
        >
          {profileText ? profileText : profileTextPlaceholder}
        </AutoResizeText>
      </div>
      <img
        src={Imgs['first']['artist'].src}
        className="object-cover"
        alt="artist"
      />
    </div>
  );
};

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
        backgroundImage: `url(${Imgs[currentTheme].bg.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: templateSize.width,
        height: templateSize.height,
      }}
    >
      {isGuideEnabled && <TimeTableDesignGuide />}
      <ProfileText
        isProfileTextVisible={isProfileTextVisible}
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
      />
      <TimeTableTopObject />
      <TimeTableFrameTop />
      <TimeTableWeekFlag currentTheme={currentTheme} weekDates={weekDates} />
      <TimeTableGrid
        data={data}
        weekDates={weekDates}
        currentTheme={currentTheme}
      />
      <ProfileImageSection
        imageSrc={imageSrc}
        profileText={profileText}
        profileTextPlaceholder={placeholders.profileText}
        currentTheme={currentTheme}
        isProfileTextVisible={isProfileTextVisible}
      />
    </div>
  );
};

export default TimeTableContent;
