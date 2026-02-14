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
  COMP_COLORS,
  COMP_FONTS,
  MAX_FONT_SIZES,
  weekdayOption,
} from '../_settings/settings';

type SelectProps = 'option_01' | 'option_02';

export type dayProps = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const ONLINE_CARD_KEYS = [
  'onlineGreen',
  'onlineGreen',
  'onlineBrown',
  'onlineLong',
  'onlineGreen',
  'onlineGreen',
  'onlineLong',
];

const OFFLINE_CARD_KEYS = [
  'offlineShort',
  'offlineShort',
  'offlineShort',
  'offlineLong',
  'offlineShort',
  'offlineShort',
  'offlineLong',
];

const LOCAL_CARD_SIZES: CSSProperties[] = [
  {
    width: 1160,
    height: 480,
  },
  {
    width: 1160,
    height: 480,
  },
  {
    width: 1160,
    height: 480,
  },
  {
    width: 1460,
    height: 480,
    left: 12,
  },
  {
    width: 1160,
    height: 480,
  },
  {
    width: 1160,
    height: 480,
  },
  {
    width: 1460,
    height: 480,
    left: 12,
  },
];

const LOCAL_BG_SIZES: CSSProperties[] = [
  {
    width: 1200,
    height: 520,
  },
  {
    width: 1200,
    height: 520,
  },
  {
    width: 1200,
    height: 520,
  },
  {
    width: 1500,
    height: 520,
  },
  {
    width: 1200,
    height: 520,
  },
  {
    width: 1200,
    height: 520,
  },
  {
    width: 1500,
    height: 520,
  },
];

interface CardStreamingDayProps {
  currentTheme?: TTheme;
  day: number;
}

interface CardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDateProps {
  date: number;
  currentTheme?: TTheme;
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
  offlineMemo: string | undefined;
  offlineType: SelectProps;
}

interface CardStreamingDayAndTimeProps {
  time: string;
  currentTheme?: TTheme;
  isGuerrilla: boolean;
  day: number;
}

const CardStreamingDay = ({ currentTheme, day }: CardStreamingDayProps) => {
  const FONT_COLOR =
    day === 0 || day === 1 || day === 4 || day === 5
      ? BASE_COLORS.first.tertiary
      : BASE_COLORS.first.quaternary;
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: FONT_COLOR,
        fontSize: 96,
        height: 120,
        width: 300,
        top: 28,
        right: 124,
        letterSpacing: -10,
        filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.8))',
      }}
      className="absolute flex justify-center items-center z-20"
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const CardStreamingDate = ({ date, currentTheme }: CardStreamingDateProps) => {
  return (
    <p
      style={{
        color: COMP_COLORS.STREAMING_DATE,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 120,
        height: 120,
        lineHeight: 1,
        fontSize: 62,
        fontWeight: 600,
        letterSpacing: -1,
        marginTop: 4,
      }}
      className=" flex justify-center items-center"
    >
      {padZero(date)}
    </p>
  );
};

const CardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        width: 312,
        height: 80,
        lineHeight: 1,
        fontSize: 50,
        top: 392,
        right: 172,
        rotate: '-3.3deg',
        letterSpacing: -4,
      }}
      className=" absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 192,
        width: 720,
        top: 140,
        left: 300,
      }}
      className="absolute flex justify-start items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,

          lineHeight: 1.2,
        }}
        className="leading-none text-left"
        maxFontSize={MAX_FONT_SIZES.MAIN_TITLE}
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
        width: 720,
        height: 80,
        top: 280,
        left: 300,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
          fontWeight: 500,
          letterSpacing: -2,
        }}
        className="leading-none text-left w-full"
        maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        ...LOCAL_BG_SIZES[day],
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first'][ONLINE_CARD_KEYS[day as dayProps]].src.replace(
          './',
          '/'
        )}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({
  offlineMemo,
  offlineType,
  day,
  currentTheme,
}: OfflineCardProps) => {
  return (
    <div
      style={{
        ...LOCAL_CARD_SIZES[day],
      }}
      className="relative"
      key={day}
    >
      <CardStreamingDay day={day} />
      <div
        style={{
          left: 560,
          top: 160,
          width: day === 3 || day === 6 ? 840 : 540,
          height: 200,
        }}
        className="absolute flex flex-col justify-center z-20"
      >
        <p
          style={{
            fontFamily: COMP_FONTS.SUB_TITLE,
            color: COMP_COLORS.SUB_TITLE,
            fontWeight: 500,
            letterSpacing: -2,
            fontSize: 80,
          }}
        >
          {offlineType === 'option_01' ? '호랑이 쉬는 날' : '직관 가는 날'}
        </p>
        {offlineMemo && (
          <div style={{ width: '90%', height: 80 }} className="pl-2">
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.SUB_TITLE,
                color: COMP_COLORS.SUB_TITLE,
                fontWeight: 500,
                letterSpacing: -2,
              }}
              maxFontSize={48}
            >
              {offlineMemo as string}
            </AutoResizeText>
          </div>
        )}
      </div>
      <div
        className="absolute"
        style={{
          ...LOCAL_BG_SIZES[day],
          left: -20,
        }}
      >
        <img
          className="object-cover w-full h-full"
          src={Imgs[currentTheme || 'first'][
            OFFLINE_CARD_KEYS[day]
          ].src.replace('./', '/')}
          alt="offline"
        />
      </div>
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
  const offlineMemo = time.offlineMemo;

  console.log('time', time);

  return (
    <>
      {time.isOffline ? (
        <OfflineCard
          offlineType={time.offlineType as string as SelectProps}
          offlineMemo={offlineMemo}
          day={time.day}
        />
      ) : (
        <div
          style={{ ...LOCAL_CARD_SIZES[time.day as dayProps] }}
          key={time.day}
          className="relative flex justify-center"
        >
          <CardStreamingDay day={time.day} />
          <CardMainTitle content={entryMainTitle} day={time.day} />
          <CardSubTitle content={entrySubTitle} day={time.day} />
          <CardStreamingTime
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
            day={time.day}
          />

          <OnlineCardBG day={time.day} />
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
