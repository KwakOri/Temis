import React from 'react';

import AutoResizeText from '@/components/AutoResizeTextCard/AutoResizeText';
import { TeamTimeTableDay } from '@/types/team-timetable';
import { TTheme } from '@/types/time-table/theme';
import { formatTime } from '@/utils/time-formatter';
import { Imgs } from '../_img/imgs';
import {
  colors,
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

const CardBG = ({
  userId,
  isOffline = false,
}: {
  isOffline: boolean | undefined;
  userId: number;
}) => {
  const status = isOffline ? 'offline' : 'online';
  const memberName = memberIdsMap.get(userId) as string;
  const cardName = status + '_' + memberName;

  return (
    <img
      className="absolute inset-0 z-10"
      src={Imgs['first'][memberName].src}
      alt="card"
      draggable={false}
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
  const mainTitle =
    typeof primaryEntry?.mainTitle === 'string' ? primaryEntry.mainTitle : '';
  const subTitle =
    typeof primaryEntry?.subTitle === 'string' ? primaryEntry.subTitle : '';
  const hasSubTitle = subTitle.trim().length > 0;
  const memberName = memberNamesMap.get(userId) as string;

  return (
    <>
      {isSuccess && isOnline && (
        <div
          style={{ width: 380, height: 244 }}
          className=" relative flex justify-center items-center"
        >
          <>
            <p
              style={{
                fontFamily: fontOption.primary,
                color: colors.first.secondary,
                fontSize: 36,
                fontWeight: 700,
                width: 160,
                height: 80,
                top: 21,
                left: 196,
                textShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
              }}
              className="absolute z-20 flex justify-start items-center "
            >
              {memberName}
            </p>
            <p
              style={{
                fontFamily: fontOption.primary,
                color: colors.first.secondary,
                fontSize: 54,
                fontWeight: 700,
                width: 170,
                height: 80,
                top: 80,
                left: 196,
                textShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
              }}
              className="absolute z-20 flex justify-start items-center "
            >
              {primaryEntry?.isGuerrilla
                ? '게릴라'
                : formatTime(primaryEntry?.time as string, 'full')}
            </p>

            <div
              style={{
                width: 160,
                height: hasSubTitle ? 36 : 60,
                top: hasSubTitle ? 142 : 152,
                left: 196,
                lineHeight: 1,
                fontWeight: 700,
              }}
              className="absolute z-20 flex justify-start items-start "
            >
              <AutoResizeText
                maxFontSize={hasSubTitle ? 20 : 24}
                multiline
                style={{
                  fontFamily: fontOption.primary,
                  color: colors.first.secondary,
                  textAlign: 'left',
                  lineHeight: 1.2,
                  textShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                {mainTitle}
              </AutoResizeText>
            </div>

            {hasSubTitle && (
              <div
                style={{
                  width: 160,
                  height: 28,
                  top: 178,
                  left: 196,
                  lineHeight: 1,
                  fontWeight: 700,
                }}
                className="absolute z-20 flex justify-start items-start "
              >
                <AutoResizeText
                  maxFontSize={14}
                  multiline
                  style={{
                    fontFamily: fontOption.primary,
                    color: colors.first.secondary,
                    textAlign: 'left',
                    lineHeight: 1.2,
                    textShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {subTitle}
                </AutoResizeText>
              </div>
            )}

            <CardBG isOffline={data.schedule?.isOffline} userId={userId} />
          </>
        </div>
      )}
    </>
  );
};

export default TeamTimeTableCell;
