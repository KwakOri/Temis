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
  weekdayOption,
} from '../_settings/settings';

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
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,
        fontSize: 64,
        height: 80,
        width: 300,
        top: 48,
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
        fontSize: 36,
        letterSpacing: 5,
        top: 552,
        left: 140,
      }}
      className=" absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  const textColor = day % 2 === 0 ? '#1E3C32' : '#FFFFFF';

  return (
    <div
      style={{
        height: 200,
        width: '80%',
        top: 320,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: textColor,
          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        multiline={true}
        maxFontSize={74}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

// 흰색 온라인 메인 타이틀 : 1E3C32 서브타이틀 :7CAD5C
// 초록색 온라인 메인 :FFFFFF 서브 타이틀 : D5F3BD

const CardSubTitle = ({ content, day }: CardSubTitleProps) => {
  const textColor = day % 2 === 0 ? '#7CAD5C' : '#D5F3BD';

  return (
    <div
      style={{
        width: '80%',
        height: 80,
        top: 252,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: textColor,
          fontWeight: 500,
        }}
        className="leading-none text-center w-full"
        maxFontSize={40}
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
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const cardName = days[day] + '_on';
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
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
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const cardName = days[day] + '_off';
  return (
    <div
      style={{
        ...CARD_SIZES.OFFLINE,
      }}
      className="relative -top-2"
      key={day}
    >
      <img
        src={Imgs[currentTheme || 'first'][cardName].src.replace('./', '/')}
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
