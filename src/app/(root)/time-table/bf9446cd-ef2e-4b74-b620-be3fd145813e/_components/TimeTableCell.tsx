import React, { PropsWithChildren } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  BASE_COLORS,
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
  MAX_FONT_SIZES,
} from '../_settings/settings';

interface CardStreamingDayProps {
  isOffline: boolean;
  currentTheme?: TTheme;
  day: number;
}

interface MultiCardStreamingDayProps {
  currentTheme?: TTheme;
  day: number;
}

interface CardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  day: number;
  currentTheme?: TTheme;
}

interface MultiCardStreamingDateProps {
  date: number;
  currentTheme?: TTheme;
}

interface CardStreamingDateProps {
  isOffline: boolean;
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

const CardStreamingDay = ({
  isOffline,
  currentTheme,
  day,
}: CardStreamingDayProps) => {
  const days = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: isOffline
          ? BASE_COLORS.first.quaternary
          : COMP_COLORS.STREAMING_DAY,
        fontSize: 80,
        height: 100,
        width: 232,
        top: 68,
        left: 14,
      }}
      className="absolute flex justify-center items-center"
    >
      {days[day]}
    </p>
  );
};

const MultiCardStreamingDay = ({
  currentTheme,
  day,
}: MultiCardStreamingDayProps) => {
  const days = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,
        fontSize: 64,
        height: 100,
        width: 164,
        top: 300,
        left: 14,
      }}
      className="absolute flex justify-center items-center"
    >
      {days[day]}
    </p>
  );
};

const CardStreamingDate = ({
  isOffline,
  date,
  currentTheme,
}: CardStreamingDateProps) => {
  return (
    <p
      style={{
        color: isOffline
          ? BASE_COLORS.first.quaternary
          : COMP_COLORS.STREAMING_DATE,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 232,
        height: 60,
        fontSize: 40,
        top: 156,
        left: 14,
        letterSpacing: 2,
      }}
      className=" absolute flex justify-center items-center"
    >
      {padZero(date)}
    </p>
  );
};

const MultiCardStreamingDate = ({
  date,
  currentTheme,
}: MultiCardStreamingDateProps) => {
  return (
    <p
      style={{
        color: COMP_COLORS.STREAMING_DATE,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        fontSize: 30,
        height: 60,
        width: 164,
        top: 370,
        left: 14,
        letterSpacing: 2,
      }}
      className=" absolute flex justify-center items-center"
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
        width: 272,
        height: 88,
        lineHeight: 1,
        fontSize: 50,
        fontWeight: 600,
        top: 104,
        left: 344,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const MultiCardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        width: 188,
        height: 60,
        lineHeight: 1,
        fontSize: 34,

        top: 222,
        left: 454,
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
        height: 260,
        width: '72%',
        top: 354,
      }}
      className="absolute flex justify-end items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          lineHeight: 1.2,
        }}
        className="leading-none text-right"
        multiline={true}
        maxFontSize={MAX_FONT_SIZES.MAIN_TITLE}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const MultiCardMainTitle = ({
  currentTheme,
  content,
  day,
}: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 120,
        top: 108,
        width: '80%',
        left: 54,
      }}
      className="absolute flex justify-start items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          lineHeight: 1.2,
        }}
        className="leading-none text-left"
        maxFontSize={64}
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
        width: '72%',
        height: 80,
        top: 290,
      }}
      className="absolute flex justify-end items-center "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
        }}
        className="leading-none text-right w-full"
        maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

const MultiCardSubTitle = ({ content, day }: CardSubTitleProps) => {
  return (
    <div
      style={{
        height: 80,
        top: 58,
        width: '80%',
        left: 54,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
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

const MultiCardBG = ({ day }: OnlineCardBGProps) => {
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

  return (
    <>
      {time.isOffline ? (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          key={time.day}
          className="relative flex justify-center"
        >
          <CardStreamingDay isOffline={time.isOffline} day={time.day} />
          <CardStreamingDate
            isOffline={time.isOffline}
            date={weekDate.getDate()}
          />
          <OfflineCard day={time.day} />
        </div>
      ) : isMultiple ? (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          key={time.day}
          className="relative flex justify-center"
        >
          <div
            className="absolute"
            style={{ left: 20, top: 40, width: 690, height: 310 }}
          >
            <MultiCardMainTitle
              content={primaryEntry.mainTitle as string}
              day={time.day}
            />
            <MultiCardSubTitle
              content={primaryEntry.subTitle as string}
              day={time.day}
            />
            <MultiCardStreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={primaryEntry.time}
              day={time.day}
            />
          </div>
          <div
            className="absolute"
            style={{ left: 20, top: 388, width: 690, height: 310 }}
          >
            <MultiCardMainTitle
              content={secondaryEntry.mainTitle as string}
              day={time.day}
            />
            <MultiCardSubTitle
              content={secondaryEntry.subTitle as string}
              day={time.day}
            />
            <MultiCardStreamingTime
              isGuerrilla={secondaryEntry.isGuerrilla}
              time={secondaryEntry.time}
              day={time.day}
            />
          </div>
          <MultiCardStreamingDay day={time.day} />
          <MultiCardStreamingDate date={weekDate.getDate()} />
          <MultiCardBG day={time.day} />
        </div>
      ) : (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          key={time.day}
          className="relative flex justify-center"
        >
          <CardStreamingDay isOffline={time.isOffline} day={time.day} />
          <CardStreamingDate
            isOffline={time.isOffline}
            date={weekDate.getDate()}
          />
          <CardSubTitle content={entrySubTitle} day={time.day} />
          <CardMainTitle content={entryMainTitle} day={time.day} />
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
