import React, { CSSProperties, PropsWithChildren } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { weekdays } from '@/utils/time-table/data';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  BASE_COLORS,
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
        width: 100,
        height: 36,
        top: 18,
        left: 52,
        fontFamily: BASE_FONTS.PRIMARY,
        fontSize: 17,
        color: isOffline ? '#B9B9B9' : '#FC97D0',
      }}
      className="absolute flex justify-start items-center"
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
        color: isOffline
          ? BASE_COLORS.first.tertiary
          : BASE_COLORS.first.primary,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 140,
        height: 64,
        lineHeight: 1,
        fontSize: 24,
        left: 356,
        top: 40,
      }}
      className=" absolute flex justify-center items-center"
    >
      {padZero(date.getMonth() + 1)}.{padZero(date.getDate())}
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

  const compStyles: CSSProperties[] = [
    { color: '#ffffff', left: 2316, top: 600, rotate: '5deg' },
    { color: '#ffffff', left: 676, top: 1346, rotate: '-16deg' },
    { color: '#ffffff', left: 1360, top: 1296, rotate: '-7deg' },
    { color: '#FFFFFF', left: 2382, top: 1308, rotate: '-7deg' },
    { color: '#76284C', left: 724, top: 2102, rotate: '-9.5deg' },
    { color: '#254079', left: 1560, top: 2044, rotate: '-1deg' },
    { color: '#FFFFFF', left: 2472, top: 1996, rotate: '-3deg' },
  ];
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: '#FFFFFF',
        width: 300,
        height: 72,
        lineHeight: 1,
        fontSize: 50,
        fontWeight: 400,
        ...compStyles[day],
      }}
      className=" absolute flex justify-center items-center z-40"
    >
      {isGuerrilla ? '게릴라' : halftime + ' ' + timezone}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  const compStyles: CSSProperties[] = [
    { color: '#603813' },
    { color: '#76284C' },
    { color: '#254079' },
    { color: '#76284C' },
    { color: '#603813' },
    { color: '#76284C' },
    { color: '#603813' },
  ];

  return (
    <div
      style={{
        height: 220,
        width: '90%',
        top: 92,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,

          lineHeight: 1.05,
          ...compStyles[day],
        }}
        className="leading-none text-center"
        maxFontSize={96}
        multiline
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const compStyles: CSSProperties[] = [
    { color: '#4a6dd1' },
    { color: '#ffffff' },
    { color: '#4a6dd1' },
    { color: '#ff97b3' },
    { color: '#cf806a' },
    { color: '#ff97b3' },
    { color: '#cf806a' },
  ];
  return (
    <div
      style={{
        width: '90%',
        height: 100,
        top: 10,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          ...compStyles[day],
        }}
        className="leading-none text-center w-full"
        maxFontSize={60}
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
  const dayName = weekdays[weekdayOption][day].toLowerCase();
  return (
    <div className="absolute inset-0 -z-10">
      <img
        className="object-cover w-full h-full"
        src={Imgs['first']['online_' + dayName].src.replace('./', '/')}
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

  const compStyles: CSSProperties[] = [
    { left: 2228, top: 276, rotate: '2deg' },
    { left: 520, top: 1008, rotate: '-16deg' },
    { left: 1228, top: 940, rotate: '-7deg' },
    { left: 2248, top: 960, rotate: '-7deg' },
    { left: 588, top: 1712, rotate: '-7deg' },
    { left: 1276, top: 1696, rotate: '1deg' },
    { left: 2366, top: 1644, rotate: '-1deg' },
  ];

  return (
    <div className="absolute inset-0">
      {time.isOffline && (
        <OfflineCard day={time.day} currentTheme={currentTheme} />
      )}
      {time.isOffline || (
        <CardStreamingTime
          isGuerrilla={primaryEntry.isGuerrilla}
          time={entryTime}
          day={time.day}
        />
      )}
      <div
        style={{ width: 500, height: 360, ...compStyles[time.day] }}
        key={time.day}
        className="absolute flex justify-center"
      >
        {/* <CardStreamingDay
          currentTheme={currentTheme}
          day={time.day}
          isOffline={time.isOffline}
        /> */}

        {time.isOffline || (
          <>
            <CardSubTitle content={entrySubTitle} day={time.day} />
            <CardMainTitle content={entryMainTitle} day={time.day} />
          </>
        )}
      </div>
      <OnlineCardBG isOffline={time.isOffline} day={time.day} />
    </div>
  );
};

export default TimeTableCell;
