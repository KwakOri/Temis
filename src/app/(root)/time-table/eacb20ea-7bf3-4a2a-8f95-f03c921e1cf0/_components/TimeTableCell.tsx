import { CSSProperties, PropsWithChildren } from 'react';

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import { COMP_FONTS } from '../_settings/settings';

// type TCARD = "A" | "B" | "C" | "D";

// const CARD_ORDERS: TCARD[] = ["B", "C", "C", "A", "A", "D", "D"];
// const CARD_ANGLES: number[] = [-0,0,0,0,0,0,0];

// const PROPERTIES: CSSProperties[] = [{}, {}, {}, {}, {}, {}, {}];

const TEXT_COLOR = [
  '#FEE2FF',
  '#FFDDD0',
  '#FEE2FF',
  '#FFDDD0',
  '#FEE2FF',
  '#EAFFFE',
  '#FEE2FF',
];

const MULTI_CARD_SIZES: CSSProperties[] = [
  { width: 400, height: 300 },
  { width: 400, height: 300 },
  { width: 400, height: 300 },
  { width: 400, height: 300 },
  { width: 600, height: 300 },
  { width: 640, height: 340 },
  { width: 480, height: 340 },
];

const MULTI_CARD_POSITIONS: { FIRST: CSSProperties; SECOND: CSSProperties }[] =
  [
    {
      FIRST: { top: 60, left: 320 },
      SECOND: { top: 60, left: 804 },
    },
    {
      FIRST: { top: 60, left: 100 },
      SECOND: { top: 60, left: 550 },
    },
    {
      FIRST: { top: 60, left: 320 },
      SECOND: { top: 60, left: 804 },
    },
    {
      FIRST: { top: 60, left: 100 },
      SECOND: { top: 60, left: 550 },
    },
    {
      FIRST: { top: 220, left: 60 },
      SECOND: { top: 220, left: 648 },
    },
    {
      FIRST: { top: 100, left: 50 },
      SECOND: { top: 460, left: 50 },
    },
    {
      FIRST: { top: 80, left: 50 },
      SECOND: { top: 80, left: 544 },
    },
  ];

const CARD_POSITIONS: CSSProperties[] = [
  { left: 106, top: 288 },
  { left: 108, top: 780 },
  { left: 106, top: 1274 },
  { left: 108, top: 1766 },
  { left: 1530, top: 192 },
  { left: 1542, top: 810 },
  { left: 1538, top: 1726 },
];

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const CARD_SIZES: CSSProperties[] = [
  {
    width: 1284,
    height: 495,
  },
  {
    width: 1284,
    height: 495,
  },
  {
    width: 1284,
    height: 495,
  },
  {
    width: 1284,
    height: 495,
  },
  {
    width: 1335,
    height: 592,
  },
  {
    width: 741,
    height: 870,
  },
  {
    width: 1314,
    height: 502,
  },
];
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
  const CONTENT_PROPERTIES: CSSProperties[] = [
    { width: 400, height: 100, fontSize: 48, left: 376, top: 276 },
    { width: 400, height: 100, fontSize: 48, left: 60, top: 276 },
    { width: 400, height: 100, fontSize: 48, left: 376, top: 276 },
    { width: 400, height: 100, fontSize: 48, left: 60, top: 276 },
    {
      width: 400,
      height: 100,
      fontSize: 48,
      left: isOffline ? 310 : 264,
      top: isOffline ? 408 : 426,
    },
    {
      width: 440,
      height: 100,
      fontSize: 64,
      left: 94,
      top: isOffline ? 472 : 512,
      justifyContent: 'flex-start',
    },
    {
      width: 400,
      height: 100,
      fontSize: 48,
      left: isOffline ? 36 : 40,
      top: isOffline ? 280 : 300,
    },
  ];

  return (
    <p
      style={{
        color: TEXT_COLOR[day],
        fontFamily: COMP_FONTS.STREAMING_DATE,
        lineHeight: 1,
        fontWeight: 400,
        ...CONTENT_PROPERTIES[day],
      }}
      className="absolute flex justify-center items-center "
    >
      {date.getFullYear()}-{padZero(date.getMonth() + 1)}-
      {padZero(date.getDate())}
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
  const CONTENT_PROPERTIES: CSSProperties[] = [
    { width: 400, height: 100, fontSize: 48, left: 830, top: 276 },
    { width: 400, height: 100, fontSize: 48, left: 520, top: 276 },
    { width: 400, height: 100, fontSize: 48, left: 830, top: 276 },
    { width: 400, height: 100, fontSize: 48, left: 520, top: 276 },
    {
      width: 400,
      height: 100,
      fontSize: 48,
      left: 716,
      top: 426,
    },
    {
      width: 440,
      height: 100,
      fontSize: 64,
      top: 660,
      left: 94,
      justifyContent: 'flex-start',
    },
    {
      width: 400,
      height: 100,
      fontSize: 48,
      left: 492,
      top: 300,
    },
  ];

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: TEXT_COLOR[day],
        lineHeight: 1,
        ...CONTENT_PROPERTIES[day],
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardOfflineMemo = ({
  currentTheme,
  content,
  day,
}: CardMainOfflineMemo) => {
  const CONTAINER_PROPERTIES: CSSProperties[] = [
    { width: 864, height: 160, left: 280, top: 76 },
    { width: 864, height: 160, left: 108, top: 76 },
    { width: 864, height: 160, left: 280, top: 76 },
    { width: 864, height: 160, left: 108, top: 76 },
    { width: 1000, height: 160, left: 170, top: 240 },
    {
      width: 620,
      height: 300,
      left: 62,
      top: 108,
      justifyContent: 'flex-start',
    },
    { width: 900, height: 160, left: 68, top: 114 },
  ];

  const MAX_FONT_SIZES = [110, 110, 110, 110, 110, 124, 110];

  const TEXT_PROPERTIES: CSSProperties[] = [];
  return (
    <div
      style={{
        ...CONTAINER_PROPERTIES[day],
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: TEXT_COLOR[day],
          fontWeight: 100,
          lineHeight: 1.2,
          letterSpacing: 4,
          textAlign: day === 5 ? 'left' : 'center',
        }}
        className="leading-none"
        multiline={day === 5}
        maxFontSize={MAX_FONT_SIZES[day]}
      >
        {content
          ? (content as string)
          : day === 5
          ? '메인 타이틀\n적는 곳'
          : '메인 타이틀 적는 곳'}
      </AutoResizeText>
    </div>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  const CONTAINER_PROPERTIES: CSSProperties[] = [
    { width: 900, height: 160, left: 260, top: 32 },
    { width: 900, height: 160, left: 92, top: 32 },
    { width: 900, height: 160, left: 260, top: 32 },
    { width: 900, height: 160, left: 92, top: 32 },
    { width: 900, height: 160, left: 220, top: 200 },
    { width: 620, height: 300, left: 62, top: 64 },
    { width: 900, height: 160, left: 68, top: 74 },
  ];

  const MAX_FONT_SIZES = [80, 80, 80, 80, 80, 87, 80];

  const TEXT_PROPERTIES: CSSProperties[] = [];
  return (
    <div
      style={{
        ...CONTAINER_PROPERTIES[day],
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: TEXT_COLOR[day],

          fontWeight: 100,
          lineHeight: 1.2,
          letterSpacing: 4,
        }}
        className="leading-none text-center"
        multiline={day === 5}
        maxFontSize={MAX_FONT_SIZES[day]}
      >
        {content
          ? (content as string)
          : day === 5
          ? '메인 타이틀\n적는 곳'
          : '메인 타이틀 적는 곳'}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const CONTAINER_PROPERTIES: CSSProperties[] = [
    { width: 800, height: 160, left: 310, top: 132 },
    { width: 800, height: 160, left: 142, top: 132 },
    { width: 800, height: 160, left: 310, top: 132 },
    { width: 800, height: 160, left: 142, top: 132 },
    { width: 800, height: 160, left: 270, top: 296 },
    { width: 620, height: 160, left: 62, top: 328 },
    {
      width: 800,
      height: 160,
      left: 84,
      top: 172,
      justifyContent: 'flex-start',
    },
  ];

  const MAX_FONT_SIZES = [48, 48, 48, 48, 48, 83, 48];
  return (
    <div
      style={{
        ...CONTAINER_PROPERTIES[day],
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: TEXT_COLOR[day],
          fontWeight: 400,
          textAlign: day === 6 ? 'left' : 'center',
        }}
        className="leading-none w-full"
        maxFontSize={MAX_FONT_SIZES[day]}
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
  const CONTENT_PROPERTIES: CSSProperties[] = [
    { width: '100%', height: 60, fontSize: 48, bottom: 0 },
    { width: '100%', height: 60, fontSize: 48, bottom: 0 },
    { width: '100%', height: 60, fontSize: 48, bottom: 0 },
    { width: '100%', height: 60, fontSize: 48, bottom: 0 },
    {
      width: '40%',
      height: 92,
      fontSize: 40,
      right: 16,
      bottom: 0,
    },
    {
      width: '80%',
      height: 100,
      fontSize: 48,
      top: 234,
      left: 42,
      justifyContent: 'flex-start',
    },
    {
      width: '80%',
      height: 100,
      fontSize: 40,
      top: 240,
      left: 20,
      justifyContent: 'flex-start',
    },
  ];

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: TEXT_COLOR[day],
        lineHeight: 1,
        ...CONTENT_PROPERTIES[day],
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const MultipleCardMainTitle = ({
  currentTheme,
  content,
  day,
}: CardMainTitleProps) => {
  const CONTAINER_PROPERTIES: CSSProperties[] = [
    { width: '90%', height: 132, left: 12, top: 0 },
    { width: '90%', height: 132, left: 12, top: 0 },
    { width: '90%', height: 132, left: 12, top: 0 },
    { width: '90%', height: 132, left: 12, top: 0 },
    { width: '90%', height: 200, left: 40, top: 20 },
    { width: '90%', height: 160, left: 42, top: 6 },
    { width: '90%', height: 160, left: 16, top: 20 },
  ];

  const MAX_FONT_SIZES = [50, 50, 50, 50, 80, 64, 64];

  const TEXT_PROPERTIES: CSSProperties[] = [];
  return (
    <div
      style={{
        ...CONTAINER_PROPERTIES[day],
      }}
      className="absolute flex justify-start items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: TEXT_COLOR[day],

          fontWeight: 100,
          lineHeight: 1.2,
          letterSpacing: 4,
        }}
        className="leading-none text-left"
        multiline={true}
        maxFontSize={MAX_FONT_SIZES[day]}
      >
        {content ? (content as string) : '메인 타이틀\n적는 곳'}
      </AutoResizeText>
    </div>
  );
};

const MultipleCardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const CONTAINER_PROPERTIES: CSSProperties[] = [
    { width: '90%', height: 60, left: 12, top: 134 },
    { width: '90%', height: 60, left: 12, top: 134 },
    { width: '90%', height: 60, left: 12, top: 134 },
    { width: '90%', height: 60, left: 12, top: 134 },
    { width: '50%', height: 92, left: 40, bottom: 0 },
    { width: '90%', height: 160, left: 42, top: 128 },
    { width: '90%', height: 160, left: 16, top: 136 },
  ];

  const MAX_FONT_SIZES = [40, 40, 40, 40, 40, 48, 40];
  return (
    <div
      style={{
        ...CONTAINER_PROPERTIES[day],
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: TEXT_COLOR[day],
          fontWeight: 400,
        }}
        className="leading-none w-full text-left"
        maxFontSize={MAX_FONT_SIZES[day]}
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

  return (
    <div
      className="absolute"
      style={{
        ...MULTI_CARD_SIZES[time.day],
        ...MULTI_CARD_POSITIONS[time.day][order],
      }}
    >
      <MultipleCardStreamingTime
        isOffline={time.isOffline}
        day={time.day}
        time={streamingTime}
        isGuerrilla={isGuerrilla}
      />
      <MultipleCardMainTitle content={mainTitle} day={time.day} />
      <MultipleCardSubTitle content={subTitle} day={time.day} />
    </div>
  );
};

const OnlineCardBG = ({
  isMultiple,
  isOffline,
  offlineMemo,
  day,
}: OnlineCardBGProps) => {
  const cardSubfix =
    offlineMemo && isOffline
      ? '_memo'
      : !offlineMemo && isOffline
      ? '_offline'
      : isMultiple
      ? '_multi'
      : '_online';

  return (
    <div
      style={{
        ...CARD_SIZES[day],
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first'][days[day] + cardSubfix].src.replace('./', '/')}
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

  return (
    <>
      <div
        style={{
          ...CARD_SIZES[time.day],
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
            <CardOfflineMemo content={time.offlineMemo} day={time.day} />
          </>
        ) : time.isOffline ? (
          <CardStreamingDate
            isOffline={time.isOffline}
            day={time.day}
            date={weekDate}
          />
        ) : isMultiple ? (
          <>
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
