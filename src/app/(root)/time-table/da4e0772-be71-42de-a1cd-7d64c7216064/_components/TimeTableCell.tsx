import React, { CSSProperties } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard, TEntry } from '@/types/time-table/data';
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

interface MultiCardStreamingTimeProps {
  isGuerrilla: boolean;
  time: string;

  currentTheme?: TTheme;
}

interface MultiCardMainTitleProps {
  currentTheme?: TTheme;
  content: string;
}

interface MultiCardSubTitleProps {
  content: string | null;
}

const MultiCardStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: MultiCardStreamingTimeProps) => {
  return (
    <div
      style={{
        width: 150,
        height: 60,
        lineHeight: 1,
        left: 103,
        top: 73,
      }}
      className=" absolute flex justify-center items-center"
    >
      <p
        className="relative z-10"
        style={{
          fontSize: 34,
          fontFamily: COMP_FONTS.STREAMING_TIME,
          color: BASE_COLORS.first.secondary,
        }}
      >
        {isGuerrilla ? '게릴라' : formatTime(time, 'full')}
      </p>
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
        height: 112,
        width: 332,
        top: 20,
        left: 310,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,
          letterSpacing: 1,
        }}
        className="leading-none text-center"
        maxFontSize={34}
      >
        {content ? (content as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const MultiCardSubTitle = ({ content }: MultiCardSubTitleProps) => {
  return (
    <div
      style={{
        height: 40,
        width: 492,
        top: 147,
        left: 28,
      }}
      className="absolute flex justify-start items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
        }}
        className="leading-none text-left w-full"
        maxFontSize={20}
        multiline
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
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
          ...CARD_SIZES.ONLINE,
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
    <div
      className="absolute"
      style={{ width: 700, left: 44, height: 210, ...style }}
    >
      <MultiCardMainTitle content={entry.mainTitle as string} />
      <MultiCardSubTitle content={entry.subTitle as string} />
      <MultiCardStreamingTime
        isGuerrilla={entry.isGuerrilla}
        time={entry.time}
      />
    </div>
  );
};

const CardStreamingDay = ({
  currentTheme,
  day,
  isOffline,
}: CardStreamingDayProps) => {
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  return (
    <p
      style={{
        width: 300,
        height: 80,
        top: 40,
        left: 186,
        fontSize: 48,
        fontFamily: COMP_FONTS.STREAMING_DAY,
        color: COMP_COLORS.STREAMING_DAY,
      }}
      className="absolute flex justify-start items-center"
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
        width: 414,
        height: 60,
        top: 144,
        left: 10,
        fontSize: 32,
        fontFamily: COMP_FONTS.STREAMING_DATE,
        fontWeight: 500,
        color: '#292F2F',
      }}
      className=" absolute flex justify-center items-center"
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
  return (
    <p
      style={{
        fontFamily: COMP_FONTS.STREAMING_TIME,
        color: COMP_COLORS.STREAMING_TIME,
        width: 200,
        height: 80,
        lineHeight: 1,
        fontSize: 36,
        top: 146,
        left: 332,
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
        height: 200,
        width: 480,
        top: 326,
        left: 154,
      }}
      className="absolute flex justify-center items-center shrink-0 "
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.MAIN_TITLE,
          color: COMP_COLORS.MAIN_TITLE,

          lineHeight: 1.2,
        }}
        className="leading-none text-center"
        maxFontSize={70}
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
        width: 500,
        height: 80,
        top: 208,
        left: 148,
      }}
      className="absolute flex justify-center items-center"
    >
      <AutoResizeText
        style={{
          fontFamily: COMP_FONTS.SUB_TITLE,
          color: COMP_COLORS.SUB_TITLE,
        }}
        className="leading-none text-center w-full"
        maxFontSize={30}
      >
        {content ? (content as string) : placeholders.subTitle}
      </AutoResizeText>
    </div>
  );
};

// const CardOfflineMemo = ({ content, day }: CardOfflineMemoProps) => {
//   return (
//     <div
//       style={{
//         width: 900,
//         height: 80,
//         top: 88,
//         left: 1152,
//       }}
//       className="absolute flex justify-start items-center"
//     >
//       <AutoResizeText
//         style={{
//           fontFamily: COMP_FONTS.SUB_TITLE,
//           color: '#B0C2AB',
//           fontWeight: 700,
//         }}
//         className="leading-none text-left w-full"
//         maxFontSize={MAX_FONT_SIZES.SUB_TITLE}
//       >
//         {content ? (content as string) : '오프라인 메모 적는 곳'}
//       </AutoResizeText>
//     </div>
//   );
// };

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

// const CardOverlay = ({ day }: OnlineCardBGProps) => {
//   return (
//     <div
//       style={{
//         ...CARD_SIZES.ONLINE,
//       }}
//       className="absolute z-50 opacity-40"
//     >
//       <img
//         className="object-cover w-full h-full"
//         src={Imgs['first']['online_overlay'].src.replace('./', '/')}
//         alt="online"
//       />
//     </div>
//   );
// };

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
    <>
      <div
        style={{ ...CARD_SIZES.ONLINE }}
        key={time.day}
        className="relative flex justify-center"
      >
        {time.isOffline ? (
          <>
            <OfflineCard day={time.day} />
          </>
        ) : isMultiple ? (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            <EntryCard style={{ top: 144 }} entry={time.entries[0]} />
            <EntryCard style={{ top: 358 }} entry={time.entries[1]} />
            <MultiCard />
          </>
        ) : (
          <>
            <CardStreamingDay
              currentTheme={currentTheme}
              day={time.day}
              isOffline={time.isOffline}
            />
            {/* <CardStreamingDate
              date={weekDate}
              day={time.day}
              isOffline={time.isOffline}
            /> */}
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
