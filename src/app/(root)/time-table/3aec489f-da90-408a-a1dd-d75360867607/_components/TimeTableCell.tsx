import React, { PropsWithChildren } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import { CARD_SIZES, COMP_FONTS, MAX_FONT_SIZES } from '../_settings/settings';

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

interface CardOfflineMemoProps {
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
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return (
    <p
      style={{
        width: 160,
        height: 100,
        top: 104,
        left: 110,
        fontSize: 40,
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: '#F7F6F5',
      }}
      className="absolute flex justify-center items-center "
    >
      {days[day].toUpperCase()}
    </p>
  );
};

const CardStreamingDate = ({
  day,
  date,
  currentTheme,
  isOffline,
}: CardStreamingDateProps) => {
  return (
    <p
      style={{
        width: 160,
        height: 100,
        top: 104,
        left: 242,
        fontSize: 40,
        fontFamily: COMP_FONTS.STREAMING_DAY,
        fontWeight: 500,
        color: '#F7F6F5',
      }}
      className=" absolute flex justify-center items-center "
    >
      {padZero(date.getMonth() + 1)}.{padZero(date.getDate())}
    </p>
  );
};

const CardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: CardStreamingTimeProps) => {
  const arr = formatTime(time, 'half').split(' ');

  return (
    <>
      <p
        style={{
          fontFamily: COMP_FONTS.STREAMING_TIME,
          color: '#6E3F46',
          width: 200,
          height: 100,
          lineHeight: 1,
          fontSize: 52,
          top: 254,
          left: 106,
        }}
        className=" absolute flex justify-center items-center "
      >
        {isGuerrilla ? '게릴라' : arr[1]}
      </p>
      <p
        style={{
          fontFamily: COMP_FONTS.STREAMING_TIME,
          color: '#F7F6F5',
          width: 100,
          height: 40,
          lineHeight: 1,
          fontSize: 25,
          top: 288,
          left: 302,
          letterSpacing: 0,
        }}
        className=" absolute flex justify-center items-center"
      >
        {isGuerrilla ? '--' : arr[0]}
      </p>
    </>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 200,
        width: 400,
        top: 514,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: '#6E3F46',
          lineHeight: 1.3,
        }}
        className="leading-none text-center"
        maxFontSize={60}
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
        width: 400,
        height: 80,
        top: 378,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: '#992B3B',
        }}
        className="leading-none text-center w-full"
        maxFontSize={36}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

const CardOfflineMemo = ({ content, day }: CardOfflineMemoProps) => {
  return (
    <div
      style={{
        width: 900,
        height: 80,
        top: 88,
        left: 1152,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: '#B0C2AB',
          fontWeight: 700,
        }}
        className="leading-none text-left w-full"
        maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
      >
        {content ? (content as string) : '오프라인 메모 적는 곳'}
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
        draggable={false}
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
      <div
        style={{ ...CARD_SIZES.ONLINE }}
        key={time.day}
        className="relative flex justify-center"
      >
        {time.isOffline ? (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            <CardStreamingDate
              date={weekDate}
              day={time.day}
              isOffline={time.isOffline}
            />
            <OfflineCard day={time.day} />
          </>
        ) : (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            <CardStreamingDate
              date={weekDate}
              day={time.day}
              isOffline={time.isOffline}
            />
            <CardSubTitle content={entrySubTitle} day={time.day} />
            <CardMainTitle content={entryMainTitle} day={time.day} />

            <CardStreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
              day={time.day}
            />

            <OnlineCardBG day={time.day} />
          </>
        )}
      </div>
    </>
  );
};

export default TimeTableCell;
