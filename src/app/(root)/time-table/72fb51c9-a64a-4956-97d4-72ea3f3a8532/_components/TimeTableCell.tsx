import React, { CSSProperties } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard, TEntry } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { formatTime } from '@/utils/time-formatter';
import { weekdays } from '@/utils/time-table/data';

import { VerticalResizeText } from '@/components/AutoResizeTextCard';
import { padZero } from '@/utils/date-formatter';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
  MAX_FONT_SIZES,
  weekdayOption,
} from '../_settings/settings';

type TCARD = 'a' | 'b';

interface ICARD {
  cardType: TCARD;
}

export type DayProps = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const CARD_STYLES: CSSProperties[] = [
  { left: 118, top: 134, rotate: '-4.7deg' },
  { left: 1078, top: 140, rotate: '4deg' },
  { left: 2000, top: 120, rotate: '-3.8deg' },
  { left: 2978, top: 110, rotate: '4deg' },
  { left: 84, top: 972, rotate: '4deg' },
  { left: 990, top: 962, rotate: '-5.3deg' },
  { left: 1920, top: 952, rotate: '4deg' },
];

interface CardStreamingDayProps extends ICARD {
  currentTheme?: TTheme;
  day: number;
  isMultiple?: boolean;
}

interface CardStreamingDayAndDateProps extends ICARD {
  currentTheme?: TTheme;
  day: number;
  date: number;
  isMultiple?: boolean;
}

interface CardStreamingTimeProps extends ICARD {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
  isOffline: boolean;
  isMultiple?: boolean;
}

interface CardStreamingDateProps extends ICARD {
  date: number;
  currentTheme?: TTheme;
  isMultiple?: boolean;
}

interface CardMainTitleProps extends ICARD {
  currentTheme?: TTheme;
  content: string;
  day: number;
  isMultiple?: boolean;
}

interface CardSubTitleProps extends ICARD {
  content: string | null;
  day: number;
  isMultiple?: boolean;
}

interface OnlineCardBGProps extends ICARD {
  day: number;
  isMultiple?: boolean;
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

interface SingleCardProps {
  isOffline: boolean;
  cardType: TCARD;
  day: number;
  entry: TEntry;
  weekDate: Date;
  offlineMemo?: string;
}

interface MultipleChipProps extends ICARD {
  day: number;
  entry: TEntry;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

const CardStreamingDayAndDate = ({
  cardType,
  currentTheme,
  day,
  date,
}: CardStreamingDayAndDateProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: cardType === 'a' ? COMP_COLORS.TEXT_A : COMP_COLORS.TEXT_B,
        fontSize: 64,
        top: 570,
        left: 68,
        width: 320,
        height: 100,
      }}
      className="absolute flex justify-center items-center "
    >
      {padZero(date)} {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const CardStreamingDay = ({
  cardType,
  currentTheme,
  day,
}: CardStreamingDayProps) => {
  return (
    <VerticalResizeText
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: cardType === 'a' ? COMP_COLORS.TEXT_A : COMP_COLORS.TEXT_B,
        fontWeight: 700,
        fontSize: 64,
        top: 0,
        left: 12,
        width: 88,
        height: 256,
      }}
      className="absolute flex justify-center items-center"
      maxFontSize={64}
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </VerticalResizeText>
  );
};

const CardStreamingDate = ({
  cardType,
  date,
  currentTheme,
}: CardStreamingDateProps) => {
  return (
    <p
      style={{
        color: cardType === 'a' ? COMP_COLORS.TEXT_A : COMP_COLORS.TEXT_B,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: '100%',
        height: 80,
        lineHeight: 1,
        fontWeight: 400,
        letterSpacing: -4,
      }}
      className=" flex justify-center items-center text-[80px] font-bold "
    >
      {date}
    </p>
  );
};

const CardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  cardType,
  isOffline,
  isMultiple = false,
}: CardStreamingTimeProps) => {
  return (
    <>
      {isMultiple ? (
        <p
          style={{
            fontFamily: COMP_FONTS.STREAMING_TIME,
            color: COMP_COLORS.STREAMING_TIME,
            lineHeight: 1,
            width: 160,
            height: 64,
            fontSize: 40,
            top: 208,
            left: 580,
          }}
          className=" absolute flex justify-center items-center "
        >
          {isOffline
            ? 'OFFLINE'
            : isGuerrilla
            ? '게릴라'
            : formatTime(time, 'full')}
        </p>
      ) : (
        <p
          style={{
            fontFamily: COMP_FONTS.STREAMING_TIME,
            color: COMP_COLORS.STREAMING_TIME,
            lineHeight: 1,
            width: 200,
            height: 80,
            fontSize: isOffline ? 40 : 48,
            top: isMultiple ? 200 : 582,
            left: 532,
          }}
          className=" absolute flex justify-center items-center "
        >
          {isOffline
            ? 'OFFLINE'
            : isGuerrilla
            ? '게릴라'
            : formatTime(time, 'full')}
        </p>
      )}
    </>
  );
};

const CardMainTitle = ({
  currentTheme,
  content,
  day,
  cardType,
  isMultiple = false,
}: CardMainTitleProps) => {
  return (
    <>
      {isMultiple ? (
        <div
          style={{
            height: 100,
            width: 660,
            left: 112,
            top: 92,
          }}
          className="absolute flex justify-start items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: cardType === 'a' ? COMP_COLORS.TEXT_A : COMP_COLORS.TEXT_B,
              fontWeight: 900,
              lineHeight: 1.2,
            }}
            className="leading-none text-start"
            maxFontSize={80}
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            height: 300,
            width: '90%',
            top: 212,
          }}
          className="absolute flex justify-center items-center shrink-0"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.MAIN_TITLE,
              color: cardType === 'a' ? COMP_COLORS.TEXT_A : COMP_COLORS.TEXT_B,
              fontWeight: 900,
              lineHeight: 1.2,
            }}
            className="leading-none text-center"
            maxFontSize={MAX_FONT_SIZES.MAIN_TITLE}
            multiline
          >
            {content ? (content as string) : placeholders.mainTitle}
          </AutoResizeText>
        </div>
      )}
    </>
  );
};

const CardSubTitle = ({
  cardType,
  content,
  day,
  isMultiple = false,
}: CardSubTitleProps) => {
  return (
    <>
      {isMultiple ? (
        <div
          style={{
            width: 610,
            height: 60,
            top: 36,
            left: 112,
          }}
          className="absolute flex justify-start items-center"
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: cardType === 'a' ? COMP_COLORS.TEXT_A : COMP_COLORS.TEXT_B,
            }}
            className="leading-none text-start w-full"
            maxFontSize={36}
            multiline
          >
            {content ? (content as string) : placeholders.subTitle}
          </AutoResizeText>
        </div>
      ) : (
        <div
          style={{
            width: 700,
            height: 100,
            top: 108,
          }}
          className="absolute flex justify-center items-center "
        >
          <AutoResizeText
            style={{
              fontFamily: COMP_FONTS.SUB_TITLE,
              color: cardType === 'a' ? COMP_COLORS.TEXT_A : COMP_COLORS.TEXT_B,
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

const OnlineCardBG = ({
  cardType,
  day,
  isMultiple = false,
}: OnlineCardBGProps) => {
  const prefix = isMultiple ? 'multi_' : 'online_';
  return (
    <div className="absolute -z-10">
      <img
        className="object-cover w-full h-full"
        src={Imgs['first'][prefix + cardType].src.replace('./', '/')}
        alt="online"
      />
    </div>
  );
};

const SingleCard = ({
  isOffline,
  weekDate,
  cardType,
  day,
  entry,
  offlineMemo,
}: SingleCardProps) => {
  const time = (entry.time as string) || '09:00';
  const mainTitle = (entry.mainTitle as string) || '';
  const subTitle = (entry.subTitle as string) || '';
  const isGuerrilla = entry.isGuerrilla as boolean as boolean;
  return (
    <div className="relative flex justify-center ">
      {isOffline && !offlineMemo && <OfflineCard day={day} />}
      <CardStreamingDayAndDate
        date={weekDate.getDate()}
        cardType={cardType}
        day={day}
      />
      <CardStreamingTime
        isOffline={isOffline}
        cardType={cardType}
        day={day}
        isGuerrilla={isGuerrilla}
        time={time}
      />
      {isOffline ? (
        <>
          {offlineMemo && (
            <CardMainTitle
              cardType={cardType}
              content={offlineMemo}
              day={day}
            />
          )}
        </>
      ) : (
        <>
          <CardMainTitle cardType={cardType} content={mainTitle} day={day} />
          <CardSubTitle cardType={cardType} content={subTitle} day={day} />
        </>
      )}
      <OnlineCardBG cardType={cardType} day={day} />
    </div>
  );
};

const MultipleChip = ({ cardType, day, entry }: MultipleChipProps) => {
  const time = (entry.time as string) || '09:00';
  const mainTitle = (entry.mainTitle as string) || '';
  const subTitle = (entry.subTitle as string) || '';
  const isGuerrilla = entry.isGuerrilla as boolean as boolean;
  return (
    <div
      style={{ width: 838, height: 284 }}
      className="relative flex justify-center items-center"
    >
      <CardStreamingDay cardType={cardType} day={day} />
      <CardStreamingTime
        isMultiple
        isOffline={false}
        cardType={cardType}
        day={day}
        isGuerrilla={isGuerrilla}
        time={time}
      />

      <CardSubTitle
        isMultiple
        cardType={cardType}
        content={subTitle}
        day={day}
      />
      <CardMainTitle
        isMultiple
        cardType={cardType}
        content={mainTitle}
        day={day}
      />

      <OnlineCardBG isMultiple cardType={cardType} day={day} />
    </div>
  );
};

interface MultipleCardProps {
  entries: TEntry[];
  day: number;
}

const MultipleCard = ({ entries, day }: MultipleCardProps) => {
  const primaryEntry = entries?.[0] || {};
  const secondaryEntry = entries?.[1] || {};
  return (
    <div
      style={{ ...CARD_SIZES.ONLINE }}
      className="flex flex-col items-center pt-13 gap-2"
    >
      <MultipleChip cardType={'a'} day={day as DayProps} entry={primaryEntry} />
      <MultipleChip
        cardType={'b'}
        day={day as DayProps}
        entry={secondaryEntry}
      />
    </div>
  );
};

interface ScheduleCardProps {
  weekDate: Date;
  time: TDefaultCard;
  isOffline: boolean;
}

const singleTypeCards: TCARD[] = ['a', 'b', 'a', 'b', 'b', 'a', 'b'];

const ScheduleCard = ({ weekDate, time }: ScheduleCardProps) => {
  const primaryEntry = time.entries?.[0] || {};

  const isMultiple = time.entries.length > 1;

  const singleType = singleTypeCards[time.day];

  return (
    <>
      {isMultiple ? (
        <MultipleCard entries={time.entries} day={time.day} />
      ) : (
        <>
          <SingleCard
            offlineMemo={time.offlineMemo}
            isOffline={time.isOffline}
            weekDate={weekDate}
            cardType={singleType}
            day={time.day}
            entry={primaryEntry}
          />
        </>
      )}
    </>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div style={{}} key={day} className="absolute">
      <img
        src={Imgs[currentTheme || 'first']['offline'].src.replace('./', '/')}
        alt="offline"
        style={{}}
      />
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

  return (
    <div
      style={{
        position: 'absolute',
        ...CARD_STYLES[time.day],
        ...CARD_SIZES.ONLINE,
      }}
    >
      <ScheduleCard
        isOffline={time.isOffline}
        weekDate={weekDate}
        time={time}
      />
    </div>
  );
};

export default TimeTableCell;
