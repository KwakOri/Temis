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

const getIsLong = (day: number) => day === 2 || day === 3;

const cardSizes: {
  long: CSSProperties;
  big: CSSProperties;
} = {
  long: { width: 1088, height: 445 },
  big: { width: 800, height: 840 },
};

// const CARD_ORDERS: TCARD[] = ["B", "C", "C", "A", "A", "D", "D"];
// const CARD_ANGLES: number[] = [-0,0,0,0,0,0,0];
// const CARD_POSITIONS: CSSProperties[] = [
//   { top: 0, left: -0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
//   { top: 0, left: 0 },
// ];

// const cardSizes: {
//   A: CSSProperties;
//   B: CSSProperties;
//   C: CSSProperties;
//   D: CSSProperties;
// } = {
//   A: {
//     width: 800,
//     height: 1080,
//   },
//   B: {
//     width: 1320,
//     height: 900,
//   },
//   C: {
//     width: 1320,
//     height: 900,
//   },
//   D: {
//     width: 1080,
//     height: 600,
//   },
// };

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
}

interface CardStreamingDayAndTimeProps {
  time: string;
  currentTheme?: TTheme;
  isGuerrilla: boolean;
  day: number;
}

const CardStreamingDay = ({ currentTheme, day }: CardStreamingDayProps) => {
  const cardStyle = getIsLong(day)
    ? {
        fontSize: 54,
        top: 60,
        left: 4,
        rotate: '-11.2deg',
        color: BASE_COLORS.first.quaternary,
      }
    : {
        fontSize: 76,
        top: 68,
        color: COMP_COLORS.STREAMING_DAY,
      };

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,

        fontWeight: 700,
        height: 80,
        width: 300,
        ...cardStyle,
      }}
      className="absolute flex justify-center items-center"
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
  day,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  return (
    <>
      {getIsLong(day) ? (
        <p
          style={{
            fontFamily: COMP_FONTS.STREAMING_TIME,
            color: BASE_COLORS.first.primary,
            fontWeight: 700,
            width: '80%',
            height: 100,
            lineHeight: 1,
            fontSize: 56,
            top: 292,
            left: 100,
          }}
          className=" absolute flex justify-center items-center"
        >
          {'+ '}
          {+isGuerrilla ? '게릴라' : formatTime(time, 'half')}
        </p>
      ) : (
        <p
          style={{
            fontFamily: COMP_FONTS.STREAMING_TIME,
            color: COMP_COLORS.STREAMING_TIME,
            fontWeight: 700,
            width: '80%',
            height: 100,
            lineHeight: 1,
            fontSize: 70,
            top: 596,
          }}
          className=" absolute flex justify-center items-center"
        >
          {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
        </p>
      )}
    </>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <>
      {getIsLong(day) ? (
        <div
          style={{
            height: 232,
            width: '60%',
            top: 48,
            left: 272,
          }}
          className="absolute flex justify-start items-center shrink-0 "
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: COMP_COLORS.MAIN_TITLE,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
            className="leading-none text-left"
            maxFontSize={MAX_FONT_SIZES.MAIN_TITLE}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            height: 232,
            width: '80%',
            top: 258,
          }}
          className="absolute flex justify-center items-center shrink-0 "
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: COMP_COLORS.MAIN_TITLE,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
            className="leading-none text-center"
            multiline={true}
            maxFontSize={MAX_FONT_SIZES.MAIN_TITLE}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  return (
    <>
      {getIsLong(day) ? (
        <div
          style={{
            width: '60%',
            height: 80,
            top: 220,
            left: 272,
          }}
          className="absolute flex justify-start items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: COMP_COLORS.SUB_TITLE,
              fontWeight: 500,
            }}
            className="leading-none text-left"
            maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
          >
            {content ? (content as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            width: '80%',
            height: 80,
            top: 484,
          }}
          className="absolute flex justify-center items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: COMP_COLORS.SUB_TITLE,
              fontWeight: 500,
            }}
            className="leading-none text-center w-full"
            maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
            multiline
          >
            {content ? (content as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  const cardStyle: CSSProperties =
    day === 2 || day === 3 ? cardSizes.long : cardSizes.big;

  const cardName = day === 2 || day === 3 ? 'onlineLong' : 'onlineBig';
  return (
    <div
      style={{
        ...cardStyle,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first'][cardName].src.replace('./', '/')}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const containerStyle: CSSProperties =
    day === 2 || day === 3
      ? { width: 1200, height: 445, top: 34 }
      : cardSizes.big;

  const cardStyle: CSSProperties =
    day === 2 || day === 3
      ? { width: 1088, height: 445, top: 34 }
      : cardSizes.big;

  const cardName = day === 2 || day === 3 ? 'offlineLong' : 'offlineBig';
  return (
    <div
      className="relative flex justify-center"
      style={{
        rotate: day === 0 ? '-3deg' : day === 1 ? '3deg' : '0deg',
        ...containerStyle,
      }}
      key={day}
    >
      <CardStreamingDay day={day} />
      <img
        src={Imgs[currentTheme || 'first'][cardName].src.replace('./', '/')}
        alt="offline"
        style={{
          ...cardStyle,
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

  const cardStyle: CSSProperties =
    time.day === 2 || time.day === 3
      ? { width: 1200, height: 445, top: 18 }
      : cardSizes.big;

  return (
    <>
      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : (
        <div
          style={{
            rotate: time.day === 0 ? '-3deg' : time.day === 1 ? '3deg' : '0deg',
            ...cardStyle,
          }}
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
