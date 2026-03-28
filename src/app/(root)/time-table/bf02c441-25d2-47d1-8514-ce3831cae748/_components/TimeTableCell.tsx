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
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
  MAX_FONT_SIZES,
  weekdayOption,
} from '../_settings/settings';

// type TCARD = "A" | "B" | "C" | "D";

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
  return (
    <img
      style={{ width: 240, height: 120, left: 276, top: 10 }}
      className="absolute"
      src={Imgs['first']['day' + weekdays[weekdayOption][day]].src}
      alt="day"
    />
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
        width: 260,
        height: 80,
        lineHeight: 1,
        fontSize: 55,
        top: 490,
        left: 264,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 240,
        top: 180,
        width: '70%',
        left: 128,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,

          lineHeight: 0.85,
        }}
        className="leading-none text-center"
        multiline={true}
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
        height: 80,
        width: '70%',
        top: 410,
        left: 128,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
        }}
        className="leading-none text-center w-full"
        maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
        multiline
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
        ...CARD_SIZES.ONLINE,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first']['online'].src.replace('./', '/')}
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
      className="relative"
    >
      <CardStreamingDay day={day} />
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

  return (
    <>
      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
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
