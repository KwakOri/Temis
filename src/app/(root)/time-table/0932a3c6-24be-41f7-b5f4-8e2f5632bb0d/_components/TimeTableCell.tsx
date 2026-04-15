import React, { CSSProperties } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard, TEntry } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { padZero } from '@/utils/date-formatter';
import { formatTime } from '@/utils/time-formatter';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  CARD_SIZES,
  COMP_COLORS,
  COMP_FONTS,
  MAX_FONT_SIZES,
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

interface MultiCardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;

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

interface MultiCardMainTitleProps {
  currentTheme?: TTheme;
  content: string;
}

interface CardSubTitleProps {
  content: string | null;
  day: number;
}

interface MultiCardSubTitleProps {
  content: string | null;
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

const CardStreamingDay = ({ currentTheme, day }: CardStreamingDayProps) => {
  const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const cardName = 'days_' + dayNames[day];
  return (
    <div
      style={{
        height: 400,
        width: 400,
        top: 20,
        left: -4,
      }}
      className="absolute flex justify-center items-center"
    >
      <img
        className="absolute inset-0"
        src={Imgs['first'][cardName].src}
        alt="day"
      />
    </div>
  );
};

const CardStreamingDate = ({ date, currentTheme }: CardStreamingDateProps) => {
  return (
    <p
      style={{
        color: COMP_COLORS.STREAMING_DATE,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        width: 120,
        height: 60,
        left: 36,
        top: 104,
        lineHeight: 1,
        fontSize: 36,
        fontWeight: 900,
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
    <div
      style={{
        width: 300,
        height: 120,
        lineHeight: 1,
        left: 1022,
        top: 350,
      }}
      className=" absolute flex justify-center items-center"
    >
      <p
        className="relative z-10"
        style={{
          fontSize: 40,
          fontFamily: COMP_FONTS.STREAMING_TIME,
          color: COMP_COLORS.STREAMING_TIME,
          fontWeight: 400,
        }}
      >
        {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
      </p>
      <img
        className="absolute inset-0"
        src={Imgs['first']['time'].src}
        alt=""
      />
    </div>
  );
};

const MultiCardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: MultiCardStreamingTimeProps) => {
  return (
    <div
      style={{
        width: 300,
        height: 120,
        lineHeight: 1,
        left: 1022,
        top: 112,
      }}
      className=" absolute flex justify-center items-center"
    >
      <p
        className="relative z-10"
        style={{
          fontSize: 40,
          fontFamily: COMP_FONTS.STREAMING_TIME,
          color: COMP_COLORS.STREAMING_TIME,
          fontWeight: 400,
        }}
      >
        {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
      </p>
      <img
        className="absolute inset-0"
        src={Imgs['first']['time'].src}
        alt=""
      />
    </div>
  );
};

const CardMainTitle = ({ currentTheme, content, day }: CardMainTitleProps) => {
  return (
    <div
      style={{
        height: 120,
        width: 840,
        top: 124,
        left: 468,
      }}
      className="absolute flex justify-start items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
        }}
        className="leading-none text-left"
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
}: MultiCardMainTitleProps) => {
  return (
    <div
      style={{
        height: 120,
        width: 840,
        top: 8,
        left: 468,
      }}
      className="absolute flex justify-start items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
        }}
        className="leading-none text-left"
        maxFontSize={76}
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
        height: 120,
        width: 840,
        top: 232,
        left: 468,
      }}
      className="absolute flex justify-start items-center "
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

const MultiCardSubTitle = ({ content }: MultiCardSubTitleProps) => {
  return (
    <div
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

const MultiCard = () => {
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
        style={{
          ...CARD_SIZES.OFFLINE,
        }}
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      style={{
        ...CARD_SIZES.ONLINE,
      }}
      key={day}
      className="absolute -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs[currentTheme || 'first']['offline'].src.replace('./', '/')}
        alt="offline"
        style={{
          ...CARD_SIZES.OFFLINE,
        }}
      />
    </div>
  );
};

interface EntryCardProps {
  style?: CSSProperties;
  entry: TEntry;
}

const EntryCard = ({ entry, style }: EntryCardProps) => {
  return (
    <div className="absolute" style={{ width: '100%', height: 220, ...style }}>
      <MultiCardMainTitle content={entry.mainTitle as string} />
      <MultiCardSubTitle content={entry.subTitle as string} />
      <MultiCardStreamingTime
        isGuerrilla={entry.isGuerrilla}
        time={entry.time}
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
  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || '09:00';
  const entryMainTitle = (primaryEntry.mainTitle as string) || '';
  const entrySubTitle = (primaryEntry.subTitle as string) || '';

  const isMultiple = time.entries.length > 1;

  return (
    <div
      style={{ ...CARD_SIZES.ONLINE }}
      key={time.day}
      className="relative flex justify-center"
    >
      {time.isOffline ? (
        <>
          <CardStreamingDay day={time.day} />
          <CardStreamingDate date={weekDate.getDate()} />
          <OfflineCard day={time.day} />
        </>
      ) : isMultiple ? (
        <>
          <CardStreamingDay day={time.day} />
          <CardStreamingDate date={weekDate.getDate()} />
          <EntryCard style={{ top: 20 }} entry={time.entries[0]} />
          <EntryCard style={{ top: 236 }} entry={time.entries[1]} />
          <MultiCard />
        </>
      ) : (
        <>
          <CardStreamingDay day={time.day} />
          <CardStreamingDate date={weekDate.getDate()} />
          <CardMainTitle content={entryMainTitle} day={time.day} />
          <CardSubTitle content={entrySubTitle} day={time.day} />
          <CardStreamingTime
            isGuerrilla={primaryEntry.isGuerrilla}
            time={entryTime}
            day={time.day}
          />
          <OnlineCardBG day={time.day} />
        </>
      )}
    </div>
  );
};

export default TimeTableCell;
