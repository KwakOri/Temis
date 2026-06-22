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
  BASE_FONTS,
  CARD_SIZES,
  COMP_FONTS,
  weekdayOption,
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

const CardStreamingDay = ({
  currentTheme,
  day,
  isOffline,
}: CardStreamingDayProps) => {
  const dayName = weekdays[weekdayOption][day].toUpperCase();

  return (
    <p
      style={{
        width: 100,
        height: 36,
        top: 18,
        left: 52,
        fontFamily: BASE_FONTS.PRIMARY,
        fontSize: 17,
        color: isOffline ? '#B9B9B9' : '#FC97D0',
      }}
      className="absolute flex justify-start items-center"
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
  const dayName = weekdays[weekdayOption][day].toUpperCase();
  return (
    <p
      style={{
        color: '#E1E4FB',
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 300,
        height: 64,
        lineHeight: 1,
        fontSize: 40,
        left: 36,
        top: 28,
      }}
      className=" absolute flex justify-start items-center"
    >
      {dayName} :/ {padZero(date.getDate())}
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
        color: '#425FF4',
        width: 200,
        height: 80,
        lineHeight: 1,
        fontSize: 48,
        top: 416,
        left: 406,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'full')}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 160,
        width: '80%',
        left: 60,
        top: 134,
      }}
      className="absolute flex justify-start items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: '#0C2DD5',
          lineHeight: 1.2,
        }}
        className="leading-none text-left"
        maxFontSize={64}
        multiline
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
        width: '80%',
        height: 80,
        left: 60,
        top: 308,
      }}
      className="absolute flex justify-start items-center "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: '#425FF4',
        }}
        className="leading-none text-left w-full"
        maxFontSize={40}
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
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first'][isOffline ? 'offline' : 'online'].src.replace(
          './',
          '/'
        )}
        alt="online"
      />
    </div>
  );
};

const MultiStreamingDate = ({
  day,
  date,
  currentTheme,
  isOffline,
}: CardStreamingDateProps) => {
  const dayName = weekdays[weekdayOption][day].toUpperCase();
  return (
    <p
      style={{
        color: '#E1E4FB',
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 300,
        height: 64,
        lineHeight: 1,
        fontSize: 40,
        left: 278,
        top: 16,
      }}
      className=" absolute flex justify-start items-center"
    >
      {dayName} :/ {padZero(date.getDate())}
    </p>
  );
};

const MultiCardBG = ({ isOffline, day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first']['multi'].src.replace('./', '/')}
        alt="multi"
      />
    </div>
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

  const isMultiple = time.entries.length > 1;
  const secondaryEntry = time.entries?.[1] || {};

  const compStyles: CSSProperties[] = [
    {
      left: 168,
      top: 630,
    },
    {
      left: 908,
      top: 510,
    },
    {
      left: 1646,
      top: 630,
    },
    {
      left: 100,
      top: 1172,
    },
    {
      left: 836,
      top: 1052,
    },
    {
      left: 1576,
      top: 1206,
    },
    {
      left: 76,
      top: 1682,
    },
  ];

  return (
    <div
      style={{ ...CARD_SIZES.ONLINE, ...compStyles[time.day] }}
      key={time.day}
      className="absolute flex justify-center"
    >
      {time.isOffline ? (
        <>
          <CardStreamingDate
            date={weekDate}
            day={time.day}
            isOffline={time.isOffline}
          />

          <OnlineCardBG isOffline={time.isOffline} day={time.day} />
        </>
      ) : isMultiple ? (
        <>
          <MultiStreamingDate
            date={weekDate}
            day={time.day}
            isOffline={time.isOffline}
          />
          <p
            style={{
              fontFamily: COMP_FONTS.STREAMING_TIME,
              color: '#425FF4',
              width: 200,
              height: 80,
              lineHeight: 1,
              fontSize: 48,
              top: 248,
              left: 444,
            }}
            className=" absolute flex justify-center items-center"
          >
            {primaryEntry.isGuerrilla
              ? '게릴라'
              : formatTime(primaryEntry.time, 'full')}
          </p>
          <p
            style={{
              fontFamily: COMP_FONTS.STREAMING_TIME,
              color: '#425FF4',
              width: 200,
              height: 80,
              lineHeight: 1,
              fontSize: 48,
              top: 198,
              left: 48,
            }}
            className=" absolute flex justify-center items-center"
          >
            {secondaryEntry.isGuerrilla
              ? '게릴라'
              : formatTime(secondaryEntry.time, 'full')}
          </p>

          <div
            style={{
              height: 160,
              width: '50%',
              left: 292,
              top: 88,
            }}
            className="absolute flex justify-start items-center shrink-0 "
          >
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.MAIN_TITLE,
                color: '#0C2DD5',
                lineHeight: 1.2,
              }}
              className="leading-none text-left"
              maxFontSize={56}
              multiline
            >
              {primaryEntry.mainTitle
                ? (primaryEntry.mainTitle as string)
                : placeholders.mainTitle}
            </AutoResizeText>
          </div>
          <div
            style={{
              height: 160,
              width: '50%',
              left: 44,
              top: 300,
            }}
            className="absolute flex justify-start items-center shrink-0"
          >
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.MAIN_TITLE,
                color: '#24BBC8',
                lineHeight: 1.2,
              }}
              className="leading-none text-left"
              maxFontSize={56}
              multiline
            >
              {secondaryEntry.mainTitle
                ? (secondaryEntry.mainTitle as string)
                : placeholders.mainTitle}
            </AutoResizeText>
          </div>
          <MultiCardBG day={time.day} isOffline={time.isOffline} />
        </>
      ) : (
        <>
          {/* <CardStreamingDay
        currentTheme={currentTheme}
        day={time.day}
        isOffline={time.isOffline}
      /> */}
          <CardStreamingDate
            date={weekDate}
            day={time.day}
            isOffline={time.isOffline}
          />

          <CardMainTitle content={entryMainTitle} day={time.day} />
          <CardSubTitle content={entrySubTitle} day={time.day} />

          <CardStreamingTime
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
            day={time.day}
          />

          <OnlineCardBG isOffline={time.isOffline} day={time.day} />
        </>
      )}
    </div>
  );
};

export default TimeTableCell;
