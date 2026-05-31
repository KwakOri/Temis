import React, { CSSProperties, PropsWithChildren } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  BASE_COLORS,
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
} from '../_settings/settings';

const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

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
  const compStyle: CSSProperties[] = [
    { fontSize: 64, left: 294, top: 32 },
    { fontSize: 64, left: 256, top: 40 },
    { fontSize: 64, left: 278, top: 46 },
    { fontSize: 64, left: 294, top: 32 },
    { fontSize: 64, left: 278, top: 46 },
    { fontSize: 64, left: 278, top: 46 },
    { fontSize: 64, left: 278, top: 46 },
  ];
  const WEEKDAY_NAMES = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ] as const;
  return (
    <p
      style={{
        width: 500,
        height: 100,
        fontFamily: COMP_FONTS.STREAMING_DAY,
        ...compStyle[day],
        color: isOffline
          ? BASE_COLORS.first.tertiary
          : BASE_COLORS.first.primary,
      }}
      className="absolute flex justify-start items-center "
    >
      {WEEKDAY_NAMES[day]}
    </p>
  );
};

const CardStreamingDate = ({
  day,
  date,
  currentTheme,
  isOffline,
}: CardStreamingDateProps) => {
  const compStyle: CSSProperties[] = [
    { fontSize: 80, left: 88, top: 28 },
    { fontSize: 64, left: 50, top: 44 },
    { fontSize: 70, left: 68, top: 32 },
    { fontSize: 80, left: 88, top: 28 },
    { fontSize: 70, left: 68, top: 32 },
    { fontSize: 70, left: 68, top: 32 },
    { fontSize: 70, left: 68, top: 32 },
  ];

  return (
    <p
      style={{
        color: BASE_COLORS.first.quaternary,

        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 160,
        height: 160,
        lineHeight: 1,
        letterSpacing: -2,
        ...compStyle[day],
      }}
      className=" absolute flex justify-center items-center "
    >
      {padZero(date.getDate())}
    </p>
  );
};

const CardStreamingTime = ({
  day,
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  const compStyle: CSSProperties[] = [
    { width: 400, height: 80, fontSize: 48, left: 432, top: 152 },
    { width: 400, height: 80, fontSize: 40, left: 340, top: 178 },
    { width: 400, height: 80, fontSize: 46, left: 376, top: 166 },
    { width: 400, height: 80, fontSize: 48, left: 432, top: 152 },
    { width: 400, height: 80, fontSize: 46, left: 376, top: 166 },
    { width: 400, height: 80, fontSize: 46, left: 376, top: 166 },
    { width: 400, height: 80, fontSize: 46, left: 376, top: 166 },
  ];
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,

        lineHeight: 1,
        ...compStyle[day],
      }}
      className=" absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  const compStyle: CSSProperties[] = [
    { width: '70%', height: 80, top: 292, fontSize: 64 },
    { width: '70%', height: 80, top: 344, left: 158, fontSize: 64 },
    { width: '70%', height: 80, top: 324, fontSize: 64 },
    { width: '70%', height: 80, top: 292, fontSize: 64 },
    { width: '70%', height: 80, top: 324, fontSize: 64 },
    { width: '70%', height: 80, top: 324, fontSize: 64 },
    { width: '70%', height: 80, top: 324, fontSize: 64 },
  ];
  return (
    <div
      style={{
        ...compStyle[day],
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          lineHeight: 1,
        }}
        className="leading-none text-center"
        maxFontSize={Number(compStyle[day]?.fontSize) || 0}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const compStyle: CSSProperties[] = [
    { width: '70%', height: 80, top: 226, fontSize: 40 },
    { width: '70%', height: 80, top: 266, fontSize: 40, left: 158 },
    { width: '70%', height: 80, top: 250, fontSize: 40 },
    { width: '70%', height: 80, top: 226, fontSize: 40 },
    { width: '70%', height: 80, top: 250, fontSize: 40 },
    { width: '70%', height: 80, top: 250, fontSize: 40 },
    { width: '70%', height: 80, top: 250, fontSize: 40 },
  ];
  return (
    <div
      style={{
        ...compStyle[day],
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
        }}
        className="leading-none text-center w-full"
        maxFontSize={Number(compStyle[day]?.fontSize) || 0}
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
  const dayName = dayNames[day];
  const cardName = (isOffline ? 'offline_' : 'online_') + dayName;
  return (
    <img
      className="absolute inset-0"
      src={Imgs['first'][cardName].src.replace('./', '/')}
      alt="online"
    />
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
  return (
    <div
      style={{
        ...CARD_SIZES.OFFLINE,
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || 'first']['offline'].src.replace('./', '/')}
        alt="offline"
        style={{
          ...CARD_SIZES.OFFLINE,
        }}
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

  const cardStyles: CSSProperties[] = [
    { rotate: '-3deg', width: 1260, height: 440, top: 625, left: 1425 },
    { rotate: '5.9deg', width: 1090, height: 500, top: 610, left: 2780 },
    { rotate: '-3.6deg', width: 1140, height: 480, top: 1120, left: 1470 },
    { rotate: '3.65deg', width: 1260, height: 440, top: 1160, left: 2670 },
    { width: 1140, height: 480, top: 1672, left: 336 },
    { width: 1140, height: 480, top: 1672, left: 1522 },
    { width: 1140, height: 480, top: 1672, left: 2708 },
  ];

  return (
    <div className="absolute inset-0">
      <div
        key={time.day}
        className="absolute flex justify-center
        z-30"
        style={cardStyles[time.day]}
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
