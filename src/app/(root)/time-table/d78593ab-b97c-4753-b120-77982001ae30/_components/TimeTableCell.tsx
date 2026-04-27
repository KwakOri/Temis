import React, { CSSProperties, PropsWithChildren } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard, TEntry } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { weekdays } from '@/utils/time-table/data';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import { COMP_COLORS, COMP_FONTS, weekdayOption } from '../_settings/settings';

type CardType = 'a' | 'b';

interface CardTypeProps {
  cardType: CardType;
}

interface CardStreamingDayProps extends CardTypeProps {
  currentTheme?: TTheme;
  isOffline: boolean;
  day: number;
}

interface CardStreamingTimeProps extends CardTypeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface CardStreamingDateProps extends CardTypeProps {
  date: number;
  currentTheme?: TTheme;
}

interface CardMainTitleProps extends CardTypeProps {
  currentTheme?: TTheme;
  content: string;
  day: number;
}

interface CardSubTitleProps extends CardTypeProps {
  content: string | null;
  day: number;
}

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps extends CardTypeProps {
  day: number;
}

interface OfflineMemoTextProps extends CardTypeProps {
  currentTheme?: TTheme;
  content: string;
}

interface CardStreamingDayAndTimeProps extends CardTypeProps {
  time: string;
  currentTheme?: TTheme;
  isGuerrilla: boolean;
  day: number;
}

interface MultiCardStreamingTimeProps extends CardTypeProps {
  isGuerrilla: boolean;
  time: string;

  currentTheme?: TTheme;
}

interface MultiCardMainTitleProps extends CardTypeProps {
  currentTheme?: TTheme;
  content: string;
}

interface MultiCardSubTitleProps extends CardTypeProps {
  content: string | null;
}

const MultiCardStreamingDay = ({
  currentTheme,
  day,
  cardType,
  isOffline,
}: CardStreamingDayProps) => {
  return (
    <p
      data-card-type={cardType}
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,
        fontWeight: 700,
        fontSize: cardType === 'a' ? 64 : 48,
        height: 80,
        width: 160,
        left: cardType === 'a' ? 420 : 8,
        top: cardType === 'a' ? 72 : 124,
        letterSpacing: 2,
      }}
      className="absolute flex justify-center items-center "
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const MultiCardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
  cardType,
}: MultiCardStreamingTimeProps) => {
  const cardStyle: CSSProperties =
    cardType === 'a'
      ? {
          width: 240,
          fontSize: 40,

          top: 302,
        }
      : {
          width: 188,
          fontSize: 32,

          top: 216,
        };
  return (
    <p
      data-card-type={cardType}
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        fontWeight: 700,
        height: 60,
        lineHeight: 1,
        ...cardStyle,
      }}
      className=" absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const MultiCardMainTitle = ({
  currentTheme,
  content,
  cardType,
}: MultiCardMainTitleProps) => {
  const cardStyle: CSSProperties =
    cardType === 'a'
      ? { height: 240, width: '90%', top: 38 }
      : {
          height: 180,
          width: '90%',

          top: 38,
        };
  return (
    <div
      data-card-type={cardType}
      style={{
        ...cardStyle,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          lineHeight: 1.3,
          letterSpacing: 2,
        }}
        className="leading-none text-center"
        maxFontSize={cardType === 'a' ? 84 : 64}
        multiline
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const MultiCardSubTitle = ({ content, cardType }: MultiCardSubTitleProps) => {
  return (
    <div
      data-card-type={cardType}
      style={{
        height: 120,
        width: 500,
        top: 86,
        left: 468,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
          fontWeight: 500,
        }}
        className="leading-none text-left w-full"
        maxFontSize={48}
        multiline
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface EntryCardProps extends CardTypeProps {
  style?: CSSProperties;
  entry: TEntry;
}

const EntryCard = ({ entry, style, cardType }: EntryCardProps) => {
  return (
    <div
      data-card-type={cardType}
      className="absolute flex justify-center items-center"
      style={{ ...style }}
    >
      <MultiCardMainTitle
        content={entry.mainTitle as string}
        cardType={cardType}
      />
      {/* <MultiCardSubTitle
        content={entry.subTitle as string}
        cardType={cardType}
      /> */}
      <MultiCardStreamingTime
        isGuerrilla={entry.isGuerrilla}
        time={entry.time}
        cardType={cardType}
      />
    </div>
  );
};

const CardStreamingDay = ({
  currentTheme,
  day,
  cardType,
  isOffline,
}: CardStreamingDayProps) => {
  return (
    <p
      data-card-type={cardType}
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,
        fontWeight: 700,
        fontSize: cardType === 'a' ? 64 : 48,
        height: 80,
        width: 160,
        left: cardType === 'a' ? 420 : 8,
        top: cardType === 'a' ? 72 : 112,
        letterSpacing: 2,
      }}
      className="absolute flex justify-center items-center "
    >
      {weekdays[weekdayOption][day].toUpperCase()}
    </p>
  );
};

const CardStreamingDate = ({
  date,
  currentTheme,
  cardType,
}: CardStreamingDateProps) => {
  return (
    <p
      data-card-type={cardType}
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
  cardType,
}: CardStreamingTimeProps) => {
  return (
    <p
      data-card-type={cardType}
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        fontWeight: 700,
        width: cardType === 'a' ? 300 : 188,
        height: 60,
        lineHeight: 1,
        fontSize: cardType === 'a' ? 48 : 32,
        left: cardType === 'a' ? 354 : 0,
        top: cardType === 'a' ? 638 : 212,
      }}
      className=" absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({
  currentTheme,
  content,
  day,
  cardType,
}: CardMainTitleProps) => {
  const cardStyle: CSSProperties =
    cardType === 'a'
      ? {
          height: 300,
          width: 800,
          justifyContent: 'center',
          left: 100,
          top: 214,
        }
      : {
          height: 160,
          width: 760,
          justifyContent: 'start',
          left: 244,
          top: 56,
        };
  const textStyle: CSSProperties =
    cardType === 'a' ? { textAlign: 'center' } : { textAlign: 'left' };
  return (
    <div
      data-card-type={cardType}
      style={{
        ...cardStyle,
      }}
      className="absolute flex items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          fontWeight: 700,
          lineHeight: 1.15,
          ...textStyle,
        }}
        className="leading-none"
        multiline={cardType === 'a' ? true : false}
        maxFontSize={cardType === 'a' ? 128 : 84}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const OfflineMemoText = ({
  currentTheme,
  content,
  cardType,
}: OfflineMemoTextProps) => {
  const cardStyle: CSSProperties =
    cardType === 'a'
      ? {
          height: 300,
          width: 800,
          justifyContent: 'center',
          left: 100,
          top: 260,
        }
      : {
          height: 160,
          width: 760,
          justifyContent: 'start',
          left: 244,
          top: 80,
        };
  const textStyle: CSSProperties =
    cardType === 'a' ? { textAlign: 'center' } : { textAlign: 'left' };
  return (
    <div
      data-card-type={cardType}
      style={{
        ...cardStyle,
      }}
      className="absolute flex items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          fontWeight: 700,
          lineHeight: 1.15,
          ...textStyle,
        }}
        className="leading-none"
        multiline={cardType === 'a' ? true : false}
        maxFontSize={cardType === 'a' ? 128 : 84}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CardSubTitle = ({ content, day, cardType }: CardSubTitleProps) => {
  const cardStyle: CSSProperties =
    cardType === 'a'
      ? {
          height: 160,
          width: 800,
          top: 480,
          justifyContent: 'center',
        }
      : {
          height: 100,
          width: 760,
          left: 244,
          top: 166,
          justifyContent: 'start',
        };
  const textStyle: CSSProperties =
    cardType === 'a' ? { textAlign: 'center' } : { textAlign: 'left' };
  return (
    <div
      data-card-type={cardType}
      style={{ ...cardStyle }}
      className="absolute flex justify-center items-center "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
          fontWeight: 500,
          letterSpacing: 2,
          ...textStyle,
        }}
        className="leading-none "
        maxFontSize={cardType === 'a' ? 64 : 48}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps extends CardTypeProps {
  day: number;
}

const OnlineBG = ({ day, cardType }: OnlineCardBGProps) => {
  const cardName = cardType + '_online';
  return (
    <img
      className="absolute inset-0 -z-10"
      src={Imgs['first'][cardName].src.replace('./', '/')}
      alt="online"
    />
  );
};

const OfflineBG = ({ day, cardType }: OfflineCardProps) => {
  const cardName = cardType + '_offline';
  return (
    <img
      className="absolute inset-0 -z-10"
      src={Imgs['first'][cardName].src.replace('./', '/')}
      alt="offline"
    />
  );
};

const OfflineMemoBG = ({ day, cardType }: OfflineCardProps) => {
  const cardName = cardType + '_offline_memo';
  return (
    <img
      className="absolute inset-0 -z-10"
      src={Imgs['first'][cardName].src.replace('./', '/')}
      alt="offline"
    />
  );
};

const MultiBG = ({ cardType }: CardTypeProps) => {
  const cardName = cardType + '_multi';
  return (
    <img
      className="absolute inset-0 -z-10"
      src={Imgs['first'][cardName].src.replace('./', '/')}
      alt="multi"
    />
  );
};

const CellContentArea = ({
  children,
  cardType,
}: PropsWithChildren<CardTypeProps>) => {
  return (
    <div
      data-card-type={cardType}
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
  // 새로운 데이터 구조에서 첫 번째 엔트리를 기본값으로 사용
  const isMultiple = time.entries.length > 1;
  const primaryEntry = time.entries[0];

  if (!weekDate) return 'Loading';

  const cardType: CardType = time.day === 2 || time.day === 3 ? 'a' : 'b';

  const pos: CSSProperties[] = [
    { left: 1492, top: 188 },
    { left: 1492, top: 586 },
    { left: 2752, top: 140 },
    { left: 1514, top: 930 },
    { left: 2594, top: 968 },
    { left: 2594, top: 1366 },
    { left: 1492, top: 1746 },
  ];

  const primaryEntryStyle: CSSProperties =
    cardType === 'a'
      ? { width: 440, height: 400, left: 42, top: 240 }
      : { width: 400, height: 300, left: 164, top: 10 };

  const secondaryEntryStyle: CSSProperties =
    cardType === 'a'
      ? { width: 440, height: 400, left: 522, top: 240 }
      : { width: 400, height: 300, left: 680, top: 10 };
  return (
    <div
      style={{
        width: cardType === 'b' ? 1160 : 1002,
        height: cardType === 'b' ? 338 : 774,
        ...pos[time.day],
      }}
      key={time.day}
      className="absolute flex justify-center"
    >
      {time.isOffline && time.offlineMemo ? (
        <>
          <CardStreamingDay
            isOffline={time.isOffline}
            cardType={cardType}
            day={time.day}
          />
          <OfflineMemoText content={time.offlineMemo} cardType={cardType} />
          <OfflineMemoBG day={time.day} cardType={cardType} />
        </>
      ) : time.isOffline ? (
        <>
          <CardStreamingDay
            isOffline={time.isOffline}
            cardType={cardType}
            day={time.day}
          />
          <OfflineBG day={time.day} cardType={cardType} />
        </>
      ) : isMultiple ? (
        <>
          <MultiCardStreamingDay
            isOffline={time.isOffline}
            cardType={cardType}
            day={time.day}
          />
          <EntryCard
            style={{ ...primaryEntryStyle }}
            entry={time.entries[0]}
            cardType={cardType}
          />
          <EntryCard
            style={{ ...secondaryEntryStyle }}
            entry={time.entries[1]}
            cardType={cardType}
          />
          <MultiBG cardType={cardType} />
        </>
      ) : (
        <>
          <CardStreamingDay
            isOffline={time.isOffline}
            cardType={cardType}
            day={time.day}
          />
          {/* <CardStreamingDate date={weekDate.getDate()} cardType={cardType} /> */}
          <CardSubTitle
            content={primaryEntry.subTitle as string}
            day={time.day}
            cardType={cardType}
          />
          <CardMainTitle
            content={primaryEntry.mainTitle as string}
            day={time.day}
            cardType={cardType}
          />
          <CardStreamingTime
            isGuerrilla={primaryEntry.isGuerrilla}
            time={primaryEntry.time as string}
            day={time.day}
            cardType={cardType}
          />

          <OnlineBG day={time.day} cardType={cardType} />
        </>
      )}
    </div>
  );
};

export default TimeTableCell;
