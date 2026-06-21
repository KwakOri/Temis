import { CSSProperties, PropsWithChildren } from 'react';

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { weekdays } from '@/utils/time-table/data';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import { COMP_FONTS, weekdayOption } from '../_settings/settings';

type CardType = 'a' | 'b' | 'c';
type CardTypeMap<T> = Record<CardType, T>;

export const getTypeWithDay = (day: number): CardType => {
  if (day === 0 || day === 1) return 'a';
  if (day === 2) return 'b';
  return 'c';
};

const TEXT_COLOR: CardTypeMap<string> = {
  a: '#FEE2FF',
  b: '#FEE2FF',
  c: '#FFDDD0',
};

const MULTI_CARD_SIZES: CardTypeMap<CSSProperties> = {
  a: { width: 740, height: 220 },
  b: { width: 1325, height: 165 },
  c: { width: 777, height: 121 },
};

const MULTI_CARD_POSITIONS: CardTypeMap<{
  FIRST: CSSProperties;
  SECOND: CSSProperties;
}> = {
  a: {
    FIRST: { top: 178, left: 80 },
    SECOND: { top: 422, left: 80 },
  },
  b: {
    FIRST: { top: 68, left: 394 },
    SECOND: { top: 265, left: 394 },
  },
  c: {
    FIRST: { top: 170, left: 60 },
    SECOND: { top: 316, left: 60 },
  },
};

const CARD_POSITIONS: CSSProperties[] = [
  { left: 50, top: 480 },
  { left: 960, top: 480 },
  { left: 54, top: 1172 },
  { left: 1870, top: 1178 },
  { left: 50, top: 1660 },
  { left: 960, top: 1660 },
  { left: 1870, top: 1660 },
];

const CARD_SIZES: CardTypeMap<CSSProperties> = {
  a: {
    width: 900,
    height: 700,
  },
  b: {
    width: 1800,
    height: 500,
  },
  c: {
    width: 900,
    height: 500,
  },
};

const CARD_STREAMING_DAY_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 180, height: 88, left: 110, top: 60 },
  b: { width: 216, height: 88, left: 96, top: 60 },
  c: { width: 180, height: 88, left: 110, top: 56 },
};

const CARD_STREAMING_DATE_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 200, height: 88, left: 272, top: 60 },
  b: { width: 216, height: 88, left: 96, top: 128 },
  c: { width: 200, height: 88, left: 272, top: 56 },
};

const CARD_STREAMING_TIME_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: {
    width: 300,
    height: 80,
    fontSize: 48,
    left: 512,
    top: 66,
    justifyContent: 'start',
  },
  b: {
    width: 300,
    height: 80,
    fontSize: 48,
    left: 424,
    top: 116,
    justifyContent: 'start',
  },
  c: {
    width: 300,
    height: 80,
    fontSize: 48,
    left: 512,
    top: 60,
    justifyContent: 'start',
  },
};

const CARD_OFFLINE_MEMO_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 400, height: 140, left: 390, top: 440 },
  b: { width: 540, height: 300, left: 1044, top: 100 },
  c: { width: 400, height: 140, left: 372, top: 300 },
};

const CARD_OFFLINE_MEMO_MAX_FONT_SIZES: CardTypeMap<number> = {
  a: 48,
  b: 64,
  c: 48,
};

const CARD_MAIN_TITLE_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 600, height: 180, left: 176, top: 224 },
  b: {
    width: 1280,
    height: 80,
    fontSize: 48,
    left: 424,
    top: 200,
  },
  c: { width: 600, height: 80, left: 176, top: 180 },
};

const CARD_MAIN_TITLE_MAX_FONT_SIZES: CardTypeMap<number> = {
  a: 64,
  b: 64,
  c: 64,
};

const CARD_MAIN_TITLE_MULTILINE: CardTypeMap<boolean> = {
  a: true,
  b: false,
  c: false,
};

const CARD_SUB_TITLE_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 650, height: 120, left: 96, top: 440 },
  b: { width: 1280, height: 110, left: 424, top: 320 },
  c: { width: 650, height: 120, left: 96, top: 312 },
};

const CARD_SUB_TITLE_MAX_FONT_SIZES: CardTypeMap<number> = {
  a: 48,
  b: 48,
  c: 48,
};

const CARD_SUB_TITLE_MULTILINE: CardTypeMap<boolean> = {
  a: true,
  b: true,
  c: true,
};

const MULTI_CARD_STREAMING_TIME_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 300, height: 80, fontSize: 48, left: 160, top: 28 },
  b: {
    width: 300,
    height: 80,
    fontSize: 48,
    left: 160,
    top: 8,
  },
  c: { width: 300, height: 60, fontSize: 36, left: 100, top: 6 },
};

const MULTI_CARD_MAIN_TITLE_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 560, height: 110, left: 158, top: 90 },
  b: { width: 1040, height: 110, left: 158, top: 56 },
  c: { width: 600, height: 60, left: 100, top: 52 },
};

const MULTI_CARD_MAIN_TITLE_MAX_FONT_SIZES: CardTypeMap<number> = {
  a: 64,
  b: 64,
  c: 48,
};

const MULTI_CARD_SUB_TITLE_PROPERTIES: CardTypeMap<CSSProperties> = {
  a: { width: 560, height: 60, left: 150, top: 140 },
  b: { width: 1040, height: 48, left: 150, top: 102 },
  c: { width: 600, height: 40, left: 100, top: 76 },
};

const MULTI_CARD_SUB_TITLE_MAX_FONT_SIZES: CardTypeMap<number> = {
  a: 40,
  b: 40,
  c: 32,
};
interface TDay {
  day: number;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface CardStreamingTimeProps extends TDay {
  isGuerrilla: boolean;
  time: string;
  day: number;
  isOffline: boolean;
  currentTheme?: TTheme;
}
interface CardMainOfflineMemo extends TDay {
  currentTheme?: TTheme;
  content: string;
  day: number;
}

interface CardStreamingDateProps extends TDay {
  date: Date;
  currentTheme?: TTheme;
  isOffline: boolean;
}

interface CardMainTitleProps extends TDay {
  currentTheme?: TTheme;
  content: string;
  day: number;
}

interface CardSubTitleProps extends TDay {
  content: string | null;
  day: number;
}

interface OfflineCardProps extends TDay {
  day: number;
  currentTheme?: TTheme;
}

interface OnlineCardBGProps extends TDay {
  isMultiple: boolean;
  isOffline: boolean;
  offlineMemo: string | undefined;
  day: number;
}

const CardStreamingDate = ({
  day,
  date,
  currentTheme,
  isOffline,
}: CardStreamingDateProps) => {
  const cardType = getTypeWithDay(day);
  const temp: CSSProperties =
    day === 2 && isOffline ? { left: 572, top: 60 } : {};

  return (
    <p
      style={{
        color: '#FFFFFF',
        fontFamily: COMP_FONTS.STREAMING_DATE,
        lineHeight: 1,
        fontWeight: 400,
        fontSize: 54,
        ...CARD_STREAMING_DATE_PROPERTIES[cardType],
        ...temp,
      }}
      className="absolute flex justify-center items-center "
    >
      {padZero(date.getMonth() + 1)}.{padZero(date.getDate())}
    </p>
  );
};

const CardStreamingDay = ({
  day,
  date,
  currentTheme,
  isOffline,
}: CardStreamingDateProps) => {
  const cardType = getTypeWithDay(day);
  const temp: CSSProperties =
    day === 2 && isOffline ? { left: 400, top: 60 } : {};

  return (
    <p
      style={{
        color: '#FFFFFF',
        fontFamily: COMP_FONTS.STREAMING_DATE,
        lineHeight: 1,
        fontWeight: 400,
        fontSize: 54,
        ...CARD_STREAMING_DAY_PROPERTIES[cardType],
        ...temp,
      }}
      className="absolute flex justify-center items-center "
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const CardStreamingTime = ({
  day,
  time,
  currentTheme,
  isGuerrilla,
  isOffline,
}: CardStreamingTimeProps) => {
  const cardType = getTypeWithDay(day);

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: '#5B6BA7',
        lineHeight: 1,
        ...CARD_STREAMING_TIME_PROPERTIES[cardType],
      }}
      className=" absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'full')}
    </p>
  );
};

const CardOfflineMemo = ({
  currentTheme,
  content,
  day,
}: CardMainOfflineMemo) => {
  const cardType = getTypeWithDay(day);

  return (
    <div
      style={{
        ...CARD_OFFLINE_MEMO_PROPERTIES[cardType],
      }}
      className="absolute flex justify-center items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: '#5166B2',

          lineHeight: 1.1,
          textAlign: 'center',
        }}
        className="leading-none"
        maxFontSize={CARD_OFFLINE_MEMO_MAX_FONT_SIZES[cardType]}
        multiline
      >
        {content ? (content as string) : '메인 타이틀 적는 곳'}
      </AutoResizeText>
    </div>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  const cardType = getTypeWithDay(day);

  return (
    <div
      style={{
        ...CARD_MAIN_TITLE_PROPERTIES[cardType],
      }}
      className="absolute flex justify-start items-start shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: '#1D56AD',
          lineHeight: 1.2,
        }}
        className="leading-none text-left"
        maxFontSize={CARD_MAIN_TITLE_MAX_FONT_SIZES[cardType]}
        multiline={CARD_MAIN_TITLE_MULTILINE[cardType]}
      >
        {content ? (content as string) : '메인 타이틀 적는 곳'}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const cardType = getTypeWithDay(day);

  return (
    <div
      style={{
        ...CARD_SUB_TITLE_PROPERTIES[cardType],
      }}
      className="absolute flex justify-start items-start "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: '#5B6BA7',
          fontWeight: 400,
          textAlign: 'left',
        }}
        className="leading-none w-full"
        maxFontSize={CARD_SUB_TITLE_MAX_FONT_SIZES[cardType]}
        multiline={CARD_SUB_TITLE_MULTILINE[cardType]}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

const MultipleCardStreamingTime = ({
  day,
  time,
  currentTheme,
  isGuerrilla,
  isOffline,
}: CardStreamingTimeProps) => {
  const cardType = getTypeWithDay(day);

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: '#5B6BA7',
        lineHeight: 1,
        ...MULTI_CARD_STREAMING_TIME_PROPERTIES[cardType],
      }}
      className=" absolute flex justify-start items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'full')}
    </p>
  );
};

const MultipleCardMainTitle = ({
  currentTheme,
  content,
  day,
}: CardMainTitleProps) => {
  const cardType = getTypeWithDay(day);

  return (
    <div
      style={{
        ...MULTI_CARD_MAIN_TITLE_PROPERTIES[cardType],
      }}
      className="absolute flex justify-start items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: '#1D56AD',

          lineHeight: 1,
        }}
        className="leading-none text-left"
        maxFontSize={MULTI_CARD_MAIN_TITLE_MAX_FONT_SIZES[cardType]}
      >
        {content ? (content as string) : '메인 타이틀\n적는 곳'}
      </AutoResizeText>
    </div>
  );
};

const MultipleCardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const cardType = getTypeWithDay(day);

  return (
    <div
      style={{
        ...MULTI_CARD_SUB_TITLE_PROPERTIES[cardType],
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: TEXT_COLOR[cardType],
          fontWeight: 400,
        }}
        className="leading-none w-full text-left"
        maxFontSize={MULTI_CARD_SUB_TITLE_MAX_FONT_SIZES[cardType]}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface MultipleCardProps {
  time: TDefaultCard;
  weekDate: Date;
  order: 'FIRST' | 'SECOND';
}

const MultipleCard = ({ time, weekDate, order }: MultipleCardProps) => {
  const entry = order === 'FIRST' ? time.entries[0] : time.entries[1];

  const isGuerrilla = entry.isGuerrilla;
  const streamingTime = entry.time;
  const mainTitle = entry.mainTitle;
  const subTitle = entry.subTitle as string;
  const cardType = getTypeWithDay(time.day);

  return (
    <div
      className="absolute "
      style={{
        ...MULTI_CARD_SIZES[cardType],
        ...MULTI_CARD_POSITIONS[cardType][order],
      }}
    >
      <MultipleCardStreamingTime
        isOffline={time.isOffline}
        day={time.day}
        time={streamingTime}
        isGuerrilla={isGuerrilla}
      />
      <MultipleCardMainTitle content={mainTitle} day={time.day} />
      {/* <MultipleCardSubTitle content={subTitle} day={time.day} /> */}
    </div>
  );
};

const OnlineCardBG = ({
  isMultiple,
  isOffline,
  offlineMemo,
  day,
}: OnlineCardBGProps) => {
  const cardType = getTypeWithDay(day);
  const cardSuffix =
    offlineMemo && isOffline
      ? '_offline_memo'
      : !offlineMemo && isOffline
      ? '_offline'
      : isMultiple
      ? '_multi'
      : '_online';
  const cardName = `${cardType}${cardSuffix}`;

  return (
    <div
      style={{
        ...CARD_SIZES[cardType],
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

const TimeTableCell = ({
  time,
  weekDate,
  currentTheme,
}: PropsWithChildren<TimeTableCellProps>) => {
  if (!weekDate) return 'Loading';

  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || '09:00';
  const entryMainTitle = (primaryEntry.mainTitle as string) || '';
  const entrySubTitle = (primaryEntry.subTitle as string) || '';

  const isMultiple = time.entries.length > 1;
  const cardType = getTypeWithDay(time.day);

  return (
    <>
      <div
        style={{
          ...CARD_SIZES[cardType],
          ...CARD_POSITIONS[time.day],
        }}
        key={time.day}
        className="absolute flex justify-center"
      >
        {time.isOffline && time.offlineMemo ? (
          <>
            <CardStreamingDate
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
            <CardStreamingDay
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
            <CardOfflineMemo content={time.offlineMemo} day={time.day} />
          </>
        ) : time.isOffline ? (
          <>
            <CardStreamingDate
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
            <CardStreamingDay
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
          </>
        ) : isMultiple ? (
          <>
            <CardStreamingDate
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
            <CardStreamingDay
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
            <MultipleCard time={time} weekDate={weekDate} order="FIRST" />
            <MultipleCard time={time} weekDate={weekDate} order="SECOND" />
          </>
        ) : (
          <>
            <CardStreamingDate
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
            <CardStreamingDay
              isOffline={time.isOffline}
              day={time.day}
              date={weekDate}
            />
            <CardStreamingTime
              isOffline={time.isOffline}
              day={time.day}
              time={entryTime}
              isGuerrilla={primaryEntry.isGuerrilla}
            />
            <CardMainTitle content={entryMainTitle} day={time.day} />
            <CardSubTitle content={entrySubTitle} day={time.day} />
          </>
        )}

        <OnlineCardBG
          isMultiple={isMultiple}
          isOffline={time.isOffline}
          offlineMemo={time.offlineMemo}
          day={time.day}
        />
      </div>
    </>
  );
};

export default TimeTableCell;
