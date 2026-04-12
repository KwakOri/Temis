import React from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TeamTimeTableDay } from '@/types/team-timetable';
import { TTheme } from '@/types/time-table/theme';
import { formatTime } from '@/utils/time-formatter';
import { Imgs } from '../_img/imgs';
import {
  fontOption,
  memberIdsMap,
  memberNamesMap,
} from '../_settings/settings';
import type { DayGroupedMemberSchedule } from './TeamTimeTableGrid';

interface DayTextProps {
  currentTheme?: TTheme;
  day: number;
}

interface StreamingTimeProps {
  time: string;
  currentTheme?: TTheme;
  isMultiple?: boolean;
}

interface DateTextProps {
  date: number;
  currentTheme?: TTheme;
}

interface StreamingMainTitleProps {
  isMultiple?: boolean;
  currentTheme?: TTheme;
  mainTitle: string;
}

interface TeamTimeTableCellProps {
  data: DayGroupedMemberSchedule;
  weekDate: Date[];
  currentTheme: TTheme;
  order: number;
}

interface OfflineCardProps {
  currentTheme: TTheme;
}

const DayText: React.FC<DayTextProps> = ({ day }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 40,

        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      day
    </div>
  );
};

const StreamingTime: React.FC<StreamingTimeProps> = ({ time, isMultiple }) => {
  return (
    <div
      style={{
        position: 'absolute',

        fontWeight: 'bold',

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {formatTime(time)}
    </div>
  );
};

const DateText: React.FC<DateTextProps> = ({ date }) => {
  return (
    <div
      style={{
        position: 'absolute',

        zIndex: 40,

        textAlign: 'center',

        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {date}
    </div>
  );
};

const StreamingMainTitle: React.FC<StreamingMainTitleProps> = ({
  isMultiple,
  mainTitle,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 40,
      }}
    >
      <AutoResizeText maxFontSize={40}>{mainTitle}</AutoResizeText>
    </div>
  );
};

const OfflineCard: React.FC<OfflineCardProps> = ({ currentTheme }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 56,
        left: 28,
        zIndex: 50,
        width: 86,
        height: 25,
      }}
    >
      <img
        src={Imgs[currentTheme]['offline'].src}
        alt={'offline'}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export interface MemberScheduleProps {
  memberSchedule: TeamTimeTableDay;
}

const CardBG = ({ userId }: { userId: number }) => {
  const cardName = 'members_' + memberIdsMap.get(userId);
  console.log(Imgs['first'][cardName]?.src);
  return (
    <img
      className="absolute inset-0 z-10"
      src={Imgs['first'][cardName].src}
      alt=""
    />
  );
};

const TeamTimeTableCell: React.FC<TeamTimeTableCellProps> = ({
  data,
  weekDate,
  currentTheme,
  order,
}) => {
  const daySchedule = data.schedule;
  const isSuccess = data.success && daySchedule !== null;
  const isOnline = !data.schedule?.isOffline;
  const userId = data.user_id;
  const primaryEntry = data.schedule?.entries[0];

  return (
    <>
      {isSuccess && isOnline && (
        <div
          style={{ width: 440, height: 340 }}
          className=" relative flex items-center"
        >
          <p
            style={{
              fontFamily: fontOption.primary,
              fontSize: 64,
              fontWeight: 700,
              width: 240,
              left: 8,
              top: 12,
            }}
            className="absolute z-20 flex justify-center items-center "
          >
            {primaryEntry?.time}
          </p>
          <p
            style={{
              fontFamily: fontOption.primary,
              fontSize: 60,
              fontWeight: 700,
              width: 240,
              height: 100,
              left: 36,
              top: 154,
              lineHeight: 1,
            }}
            className="absolute z-20 flex justify-start items-center"
          >
            {memberNamesMap.get(data.user_id)}
          </p>
          <div
            style={{
              fontFamily: fontOption.primary,
              fontSize: 60,
              width: 360,
              height: 100,
              left: 36,
              top: 228,
              lineHeight: 1,
            }}
            className="absolute z-20 flex justify-start items-center"
          >
            <AutoResizeText maxFontSize={60}>
              {primaryEntry?.mainTitle as string}
            </AutoResizeText>
          </div>

          <CardBG userId={userId} />
        </div>
      )}
    </>
  );
};

export default TeamTimeTableCell;
