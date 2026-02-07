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
import './../_styles/index.css';

interface CardStreamingDayProps {
  currentTheme?: TTheme;
  day: number;
  style?: React.CSSProperties;
}

interface CardStreamingTimeProps {
  style?: React.CSSProperties;
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
  style?: React.CSSProperties;
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
  style,
  currentTheme,
  day,
}: CardStreamingDayProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,

        ...style,
      }}
      className="absolute flex justify-center items-center"
    >
      {weekdays[weekdayOption][day].toUpperCase()}요일
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
  style,
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        lineHeight: 1,
        ...style,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({
  style,
  currentTheme,
  content,
  day,
}: CardMainTitleProps) => {
  return (
    <div
      style={{
        ...style,
      }}
      className="absolute flex justify-start items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,

          lineHeight: 1.2,
        }}
        className="leading-none text-left mix"
        maxFontSize={MAX_FONT_SIZES.MAIN_TITLE}
        data-text={content ? (content as string) : placeholders.mainTitle}
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
        width: '76%',
        height: 80,
        top: 352,
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
        maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
        multiline
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

interface OnlineCardBGProps {
  name?: string;
  day: number;
}

const OnlineCardBG = ({ day, name = 'online' }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first'][name].src.replace('./', '/')}
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
  const isMultipleEntries = time.entries?.length > 1;
  const entries = time.entries;
  const firstEntry = entries[0];
  const secondEntry = entries[1];

  return (
    <>
      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : isMultipleEntries ? (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          key={time.day}
          className="relative flex justify-center"
        >
          <CardStreamingDay
            style={{
              fontSize: 30,
              height: 80,
              width: 200,
              top: 46,
              left: 16,
              rotate: '-25.4deg',
            }}
            day={time.day}
          />
          <CardStreamingDay
            style={{
              fontSize: 30,
              height: 80,
              width: 200,
              top: 378,
              left: 16,
              rotate: '-25.4deg',
            }}
            day={time.day}
          />

          <CardMainTitle
            style={{ height: 140, width: '76%', top: 76, rotate: '-1deg' }}
            content={firstEntry.mainTitle}
            day={time.day}
          />

          <CardMainTitle
            style={{ height: 140, width: '76%', top: 410 }}
            content={firstEntry.mainTitle}
            day={time.day}
          />

          <CardStreamingTime
            style={{
              width: 312,
              height: 80,
              fontSize: 36,
              top: 194,
              left: 508,
              rotate: '-1.2deg',
            }}
            isGuerrilla={firstEntry.isGuerrilla}
            time={firstEntry.time}
            day={time.day}
          />
          <CardStreamingTime
            style={{
              width: 312,
              height: 80,
              fontSize: 36,
              top: 532,
              left: 512,
            }}
            isGuerrilla={secondEntry.isGuerrilla}
            time={secondEntry.time}
            day={time.day}
          />

          {(firstEntry.account as string) === 'normal' ? (
            <img
              className="absolute"
              style={{ top: 210, left: 280, width: 158, height: 56 }}
              src={Imgs['first']['checkGame'].src}
              alt="check-game"
            />
          ) : (
            <img
              className="absolute"
              style={{ top: 220, left: 112, width: 93, height: 42 }}
              src={Imgs['first']['checkNormal'].src}
              alt="check-normal"
            />
          )}

          {(secondEntry.account as string) === 'normal' ? (
            <img
              className="absolute"
              style={{ top: 540, left: 288, width: 158, height: 56 }}
              src={Imgs['first']['checkGame'].src}
              alt="check-game"
            />
          ) : (
            <img
              className="absolute"
              style={{ top: 550, left: 120, width: 93, height: 42 }}
              src={Imgs['first']['checkNormal'].src}
              alt="check-normal"
            />
          )}

          <OnlineCardBG name={'multi'} day={time.day} />
        </div>
      ) : (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          key={time.day}
          className="relative flex justify-center"
        >
          {(primaryEntry.account as string) === 'game' ? (
            <img
              className="absolute"
              style={{ top: 500, left: 108, width: 93, height: 42 }}
              src={Imgs['first']['checkNormal'].src}
              alt="check-normal"
            />
          ) : (
            <img
              className="absolute"
              style={{ top: 490, left: 240, width: 158, height: 56 }}
              src={Imgs['first']['checkGame'].src}
              alt="check-game"
            />
          )}

          <CardStreamingDay
            style={{
              fontSize: 42,
              height: 80,
              width: 300,
              top: 92,
              left: 12,
              rotate: '-18.4deg',
            }}
            day={time.day}
          />
          <CardMainTitle
            style={{ height: 140, width: '76%', top: 224 }}
            content={entryMainTitle}
            day={time.day}
          />
          <CardSubTitle content={entrySubTitle} day={time.day} />
          <CardStreamingTime
            style={{
              width: 312,
              height: 80,
              fontSize: 42,
              top: 480,
              left: 436,
            }}
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
