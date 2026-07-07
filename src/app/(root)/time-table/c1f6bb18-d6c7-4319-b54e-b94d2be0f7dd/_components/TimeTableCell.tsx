import React, { PropsWithChildren } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { weekdays } from '@/utils/time-table/data';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  BASE_FONTS,
  CARD_SIZES,
  COMP_FONTS,
  weekdayOption,
} from '../_settings/settings';

interface CardStreamingDayProps {
  currentTheme?: TTheme;
  isOffline: boolean;
  day: number;
}

interface CardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDateProps {
  day: number;
  date: Date;
  currentTheme?: TTheme;
  isOffline: boolean;
}

interface CardMainTitleProps {
  currentTheme?: TTheme;
  content: string;
  day: number;
}

interface CardSubTitleProps {
  content: string | null;
  day: number;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDayAndTimeProps {
  time: string;
  currentTheme?: TTheme;
  isGuerrilla: boolean;
  day: number;
}

const CardStreamingDay = ({
  currentTheme,
  day,
  isOffline,
}: CardStreamingDayProps) => {
  const dayName = weekdays[weekdayOption][day].toUpperCase();

  return (
    <p
      style={{
        width: 200,
        height: 100,
        top: 60,
        left: 264,
        fontFamily: BASE_FONTS.PRIMARY,
        fontSize: 42,
        color: '#ffffff',
        letterSpacing: 2,
      }}
      className="absolute flex justify-center items-center"
    >
      {dayName}
    </p>
  );
};

const CardStreamingDate = ({
  day,
  date,
  currentTheme,
  isOffline,
}: CardStreamingDateProps) => {
  return (
    <p
      style={{
        color: '#2254A6',
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 120,
        height: 120,
        lineHeight: 1,
        fontSize: 64,
        left: 96,
        top: 40,
        rotate: '-10deg',
      }}
      className=" absolute flex justify-center items-center "
    >
      {padZero(date.getDate())}
    </p>
  );
};

const CardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  day,
}: CardStreamingTimeProps) => {
  const [timezone, halftime] = formatTime(time, 'half').split(' ');

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: '#FFFFFF',
        width: 300,
        height: 72,
        lineHeight: 1,
        fontSize: 46,
        fontWeight: 400,
        left: 1752,
        top: 74,
      }}
      className=" absolute flex justify-center items-center z-40 "
    >
      {isGuerrilla ? '게릴라' : halftime + ' ' + timezone}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 120,
        width: 620,
        top: 52,
        left: 484,
      }}
      className="absolute flex justify-start items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: '#2254A6',
          lineHeight: 1.05,
          letterSpacing: 2,
        }}
        className="leading-none text-left"
        maxFontSize={80}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  return (
    <div
      style={{
        height: 120,
        width: 560,
        top: 52,
        left: 1116,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: '#7DADFF',
          letterSpacing: -1,
        }}
        className="leading-none text-left w-full"
        maxFontSize={48}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
  isOffline: boolean;
}

const OnlineCardBG = ({ isOffline, day }: OnlineCardBGProps) => {
  return (
    <div className="absolute inset-0 -z-10">
      <img
        className="object-cover w-full h-full"
        src={Imgs['first'][isOffline ? 'offline' : 'online'].src.replace(
          './',
          '/'
        )}
        alt="online"
      />
    </div>
  );
};

const CardOverlay = ({ day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      className="absolute z-50 opacity-40"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first']['online_overlay'].src.replace('./', '/')}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const dayName = weekdays[weekdayOption][day].toLowerCase();
  return (
    <div className="absolute inset-0 z-30" key={day}>
      <img
        src={Imgs[currentTheme || 'first']['offline_' + dayName].src.replace(
          './',
          '/'
        )}
        alt="offline"
        className="absolute inset-0"
      />
    </div>
  );
};

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        width: 612,
        height: 528,
        top: 30,
      }}
      className="absolute w-full h-full flex flex-col items-center ml-4"
    >
      {children}
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  if (!weekDate) return 'Loading';

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || '09:00';
  const entryMainTitle = (primaryEntry.mainTitle as string) || '';
  const entrySubTitle = (primaryEntry.subTitle as string) || '';

  return (
    <div
      style={{ width: 2110, height: 210 }}
      key={time.day}
      className="relative flex justify-center"
    >
      <CardStreamingDate
        date={weekDate}
        day={time.day}
        isOffline={time.isOffline}
      />
      <CardStreamingDay
        currentTheme={currentTheme}
        day={time.day}
        isOffline={time.isOffline}
      />

      {time.isOffline || (
        <>
          <CardStreamingTime
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
            day={time.day}
          />
          <CardMainTitle content={entryMainTitle} day={time.day} />
          <CardSubTitle content={entrySubTitle} day={time.day} />
        </>
      )}
      <OnlineCardBG isOffline={time.isOffline} day={time.day} />
    </div>
  );
};

export default TimeTableCell;
