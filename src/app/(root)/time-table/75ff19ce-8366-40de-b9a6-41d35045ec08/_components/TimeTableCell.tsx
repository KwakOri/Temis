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
  BASE_FONTS,
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
  getCardSize,
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

const cardPoses: CSSProperties[] = [
  {
    left: 1080,
    top: 196,
  },
  {
    left: 1484,
    top: 196,
  },
  {
    left: 1080,
    top: 404,
  },
  {
    left: 1484,
    top: 404,
  },
  {
    left: 1072,
    top: 612,
  },
  {
    left: 1342,
    top: 612,
  },
  {
    left: 1612,
    top: 612,
  },
];

const CardStreamingDay = ({
  currentTheme,
  day,
  isOffline,
}: CardStreamingDayProps) => {
  const dayNames: string[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];
  const dayName: string = dayNames[day];
  const cardType = day > 3 ? 'b' : 'a';
  const carsStyle = {
    a: {
      online: {
        top: 35,
        left: 40,
      },
      offline: {
        top: 52,
        left: 40,
      },
    },
    b: {
      online: {
        top: 40,
        left: 48,
      },
      offline: {
        top: 64,
        left: 48,
      },
    },
  };

  return (
    <p
      style={{
        width: 200,
        height: 36,

        fontFamily: BASE_FONTS.PRIMARY,
        fontSize: 16,
        color: BASE_COLORS.first.secondary,
        fontWeight: 700,
        ...carsStyle[cardType][isOffline ? 'offline' : 'online'],
      }}
      className="absolute flex justify-start items-center "
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
  const cardType = day > 3 ? 'b' : 'a';
  const cardStyle = {
    a: {
      top: 142,
      left: 290,
    },
    b: {
      top: 218,
      left: 162,
    },
  };
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: '#FFFFFF',
        width: 104,
        height: 32,
        lineHeight: 1,
        fontSize: 16,
        fontWeight: 400,
        letterSpacing: 1,
        ...cardStyle[cardType],
      }}
      className=" absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  const cardType = day > 3 ? 'b' : 'a';
  const cardStyle = {
    a: {
      height: 60,
      width: '80%',
      top: 68,
      left: 38,
    },
    b: { height: 100, width: '70%', top: 71, left: 46 },
  };
  return (
    <div
      style={{
        ...cardStyle[cardType],
      }}
      className="absolute flex justify-start items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          lineHeight: 1.2,
        }}
        className="leading-none text-start"
        maxFontSize={29}
        multiline={cardType === 'b' ? true : false}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const cardType = day > 3 ? 'b' : 'a';
  const cardStyle = {
    a: {
      width: '70%',
      height: 40,
      top: 112,
      left: 38,
    },
    b: {
      width: '70%',
      height: 40,
      top: 162,
      left: 46,
    },
  };
  return (
    <div
      style={{
        ...cardStyle[cardType],
      }}
      className="absolute flex justify-start items-center "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: '#F6D0A3',
          letterSpacing: -0.2,
        }}
        className="leading-none text-start w-full"
        maxFontSize={16}
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
  const cardType = isOffline ? 'offline' : 'online';
  const cardSubfix = day > 3 ? 'b' : 'a';
  const cardName = cardType + '_' + cardSubfix + '_blend';
  return (
    <img
      style={{
        mixBlendMode: 'multiply',
        ...getCardSize(day),
        ...cardPoses[day],
      }}
      className="absolute z-30 object-cover w-full h-full"
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
  const cardType = time.isOffline ? 'offline' : 'online';
  const cardSubfix = time.day > 3 ? 'b' : 'a';
  const cardName = cardType + '_' + cardSubfix;

  return (
    <>
      <div
        style={{
          backgroundImage: `url(${Imgs['first'][cardName].src.replace(
            './',
            '/'
          )})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          ...getCardSize(time.day),
          ...cardPoses[time.day],
        }}
        key={time.day}
        className="absolute flex justify-center z-40"
      >
        <CardStreamingDay
          currentTheme={currentTheme}
          day={time.day}
          isOffline={time.isOffline}
        />

        {time.isOffline || (
          <>
            <CardMainTitle content={entryMainTitle} day={time.day} />
            <CardSubTitle content={entrySubTitle} day={time.day} />

            <CardStreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
              day={time.day}
            />
          </>
        )}
      </div>
      {time.isOffline || (
        <OnlineCardBG isOffline={time.isOffline} day={time.day} />
      )}
    </>
  );
};

export default TimeTableCell;
