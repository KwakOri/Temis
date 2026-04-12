import React, { CSSProperties, PropsWithChildren } from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TDefaultCard, TEntry } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { formatTime } from '@/utils/time-formatter';
import { weekdays } from '@/utils/time-table/data';
import { Imgs } from '../_img/imgs';
import { placeholders } from '../_settings/general';
import {
  colors,
  fontOption,
  Settings,
  weekdayOption,
} from '../_settings/settings';

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  isGuerrilla: boolean;
  time: string;
  currentTheme?: TTheme;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface CellTextMainTitleProps {
  currentTheme?: TTheme;
  mainTitle: string;
}

interface CellTextSubTitleProps {
  cellTextTitle: string | null;
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

const StreamingDay = ({ currentTheme, day }: DayTextProps) => {
  return (
    <p
      style={{
        color: Settings.card.online.day.fontColor,
        fontSize: Settings.card.online.day.fontSize,
        top: 128,
        left: 76,
        width: 100,
        transform: 'rotate(-19deg)',
      }}
      className="absolute flex justify-center items-center h-10"
    >
      {weekdays[weekdayOption][day]}
    </p>
  );
};

const StreamingDate = ({ date, currentTheme }: DateTextProps) => {
  return (
    <p
      style={{
        color: colors[currentTheme || 'first']['tertiary'],
        top: 48,
        left: 28,
        width: 120,
        transform: 'rotate(-22deg)',
      }}
      className="absolute flex justify-center items-center text-[56px] font-bold"
    >
      {date}
    </p>
  );
};

const StreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        top: 60,
        left: 232,
        height: 90,
        width: 320,
        lineHeight: 1,
        color: Settings.card.online.time.fontColor,
        fontSize: Settings.card.online.time.fontSize,
      }}
      className="absolute flex justify-center items-center "
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const CellTextMainTitle = ({
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        height: 240,
        width: '100%',
      }}
      className="flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          color: Settings.card.online.mainTitle.fontColor,
          lineHeight: 1.2,
        }}
        className="leading-none text-center w-full"
        multiline={true}
        maxFontSize={Settings.card.online.mainTitle.fontSize}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const CellTextTitle = ({ cellTextTitle }: CellTextSubTitleProps) => {
  return (
    <p
      style={{
        color: Settings.card.online.subTitle.fontColor,
        fontSize: Settings.card.online.subTitle.fontSize,
      }}
      className=" flex justify-center items-center"
    >
      {cellTextTitle ? (cellTextTitle as string) : placeholders.subTitle}
    </p>
  );
};

interface OnlineCardBGProps {
  day: number;
}

const OnlineCardBG = ({ day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: Settings.card.online.width,
        height: Settings.card.online.height,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full"
        src={Imgs['first']['online'].src.replace('./', '/')}
        alt="online"
      />
    </div>
  );
};

const MultipleMainTitle = ({
  currentTheme,
  mainTitle,
}: CellTextMainTitleProps) => {
  return (
    <div
      style={{
        height: 100,
        width: '80%',
        top: 106,
        left: 120,
      }}
      className="absolute flex justify-center items-center shrink-0"
    >
      <AutoResizeText
        style={{
          color: Settings.card.online.mainTitle.fontColor,
          lineHeight: 1,
          fontFamily: fontOption.primary,
        }}
        className="leading-none text-center w-full"
        maxFontSize={64}
      >
        {mainTitle ? (mainTitle as string) : placeholders.mainTitle}
      </AutoResizeText>
    </div>
  );
};

const MultipleStreamingTime = ({
  time,
  currentTheme,
  isGuerrilla,
}: StreamingTimeProps) => {
  return (
    <p
      style={{
        top: 0,
        left: 188,
        height: 80,
        width: 320,
        lineHeight: 1,
        color: Settings.card.online.time.fontColor,
        fontSize: 45,
        fontFamily: fontOption.primary,
      }}
      className="absolute flex justify-center items-center"
    >
      {isGuerrilla ? '게릴라' : formatTime(time, 'half')}
    </p>
  );
};

const MultipleOnlineCardBG = ({ day }: OnlineCardBGProps) => {
  return (
    <div
      style={{
        width: 760,
        height: Settings.card.online.height,
      }}
      className="absolute inset-0 -z-10"
    >
      <img
        className="object-cover w-full h-full relative right-4"
        src={Imgs['first']['multi'].src.replace('./', '/')}
        alt="online"
      />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  return (
    <div
      className=" pointer-events-none"
      style={{
        width: Settings.card.offline.width,
        height: Settings.card.offline.height,
        position: 'relative',
        top: 27,
      }}
      key={day}
    >
      <img
        src={Imgs[currentTheme || 'first']['offline'].src.replace('./', '/')}
        alt="offline"
        className="object-cover"
      />
    </div>
  );
};

const MultipleStreamingDay = ({ currentTheme, day }: DayTextProps) => {
  return (
    <p
      style={{
        fontFamily: fontOption.primary,
        color: Settings.card.online.day.fontColor,
        fontSize: Settings.card.online.day.fontSize,
        top: 128,
        left: 38,
        width: 100,
        transform: 'rotate(-19deg)',
      }}
      className="absolute flex justify-center items-center h-10"
    >
      {weekdays[weekdayOption][day]}
    </p>
  );
};

interface TMultipleEntry {
  style: CSSProperties;
  entry: TEntry;
}

const MultipleEntry = ({ style, entry }: TMultipleEntry) => {
  return (
    <div className="absolute" style={{ width: 696, height: 240, ...style }}>
      <MultipleMainTitle mainTitle={entry.mainTitle} />
      <MultipleStreamingTime
        isGuerrilla={entry.isGuerrilla}
        time={entry.time}
      />
    </div>
  );
};

const CellContentArea = ({ children }: PropsWithChildren) => {
  return (
    <div
      style={{
        fontFamily: fontOption.primary,
        width: 540,
      }}
      className="w-full h-full flex flex-col pt-4 items-center "
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

  return (
    <>
      {time.isOffline ? (
        <OfflineCard day={time.day} />
      ) : isMultiple ? (
        <div
          style={{
            width: Settings.card.online.width,
            height: Settings.card.online.height,
          }}
          key={time.day}
          className="relative flex justify-center"
        >
          <MultipleEntry
            style={{ left: 36, top: 46 }}
            entry={time.entries[0]}
          />
          <MultipleEntry
            style={{ left: 36, top: 328 }}
            entry={time.entries[1]}
          />
          <MultipleStreamingDay day={time.day} />
          <MultipleOnlineCardBG day={time.day} />
        </div>
      ) : (
        <div
          style={{
            width: Settings.card.online.width,
            height: Settings.card.online.height,
          }}
          key={time.day}
          className="relative flex justify-center pt-47"
        >
          <CellContentArea>
            <CellTextMainTitle mainTitle={entryMainTitle} />
            <CellTextTitle cellTextTitle={entrySubTitle} />

            <StreamingDay day={time.day} />
            <StreamingTime
              isGuerrilla={primaryEntry.isGuerrilla}
              time={entryTime}
            />
          </CellContentArea>
          <OnlineCardBG day={time.day} />
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
