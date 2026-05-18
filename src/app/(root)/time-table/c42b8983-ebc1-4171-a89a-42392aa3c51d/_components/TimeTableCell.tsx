import React from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { weekdays } from '@/utils/time-table/data';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  BASE_COLORS,
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
  MAX_FONT_SIZES,
  weekdayOption,
} from '../_settings/settings';

interface CardStreamingDayProps {
  currentTheme?: TTheme;
  day: number;
  isOffline: boolean;
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
  isOfflineMemo?: boolean;
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
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: isOffline
          ? BASE_COLORS.first.primary
          : BASE_COLORS.first.secondary,
        fontSize: 62,
        fontWeight: 500,
        letterSpacing: -2,
        height: 80,
        width: 300,
        top: 480,
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
  const timeData = formatTime(time, 'full');
  const [hour, minute] = timeData.split(':');
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        width: 300,
        height: 100,
        lineHeight: 1,
        fontSize: 48,
        top: 128,
      }}
      className=" absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : `${hour}시 ${minute}분`}
    </p>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 192,
        width: '60%',
        top: 240,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          lineHeight: 1.2,
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
        width: '80%',
        height: 80,
        top: 152,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
          fontWeight: 500,
          letterSpacing: -2,
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
        draggable={false}
      />
    </div>
  );
};

const OfflineCardBG = ({
  day,
  currentTheme,
  isOfflineMemo = false,
}: OfflineCardProps) => {
  const cardName = isOfflineMemo ? 'offline_memo' : 'offline';
  return (
    <div
      style={{
        ...CARD_SIZES.OFFLINE,
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || 'first'][cardName].src.replace('./', '/')}
        alt="offline"
        style={{
          ...CARD_SIZES.OFFLINE,
        }}
        draggable={false}
      />
    </div>
  );
};

interface CardOfflineMemoProps {
  content?: string;
}

const CardOfflineMemo = ({ content }: CardOfflineMemoProps) => {
  return (
    <div
      style={{
        height: 80,
        width: '70%',
        top: 312,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.OFFLINE_MEMO,
          color: COMP_COLORS.OFFLINE_MEMO,
          lineHeight: 1,
        }}
        className="leading-none text-center"
        maxFontSize={46}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
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
        <div
          style={{ ...CARD_SIZES.OFFLINE }}
          key={time.day}
          className="relative flex justify-center"
        >
          {time.offlineMemo && <CardOfflineMemo content={time.offlineMemo} />}
          <CardStreamingDay day={time.day} isOffline={time.isOffline} />

          <OfflineCardBG isOfflineMemo={!!time.offlineMemo} day={time.day} />
        </div>
      ) : (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          key={time.day}
          className="relative flex justify-center"
        >
          <CardMainTitle content={entryMainTitle} day={time.day} />
          <CardStreamingTime
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
            day={time.day}
          />
          <CardStreamingDay day={time.day} isOffline={time.isOffline} />

          <OnlineCardBG day={time.day} />
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
