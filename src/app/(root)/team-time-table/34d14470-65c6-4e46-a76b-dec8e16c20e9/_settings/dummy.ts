import type {
  TeamSchedulesResponse,
  TeamTimeTableWeekData,
  UserScheduleData,
} from '@/types/team-timetable';
import { memberIdsMap, memberNamesMap, team_ids } from './settings';

const DUMMY_WEEK_START_DATE = '2026-04-06';
const DUMMY_CREATED_AT = '2026-04-06T11:45:24.928131+00:00';

const DUMMY_TIME_SETS = [
  ['10:00', '20:00', '21:00', '19:30', '20:00', '14:00', '17:00'],
  ['18:00', '21:00', '19:00', '20:00', '21:00', '17:00', '18:00'],
  ['20:00', '19:00', '18:00', '20:00', '20:00', '18:00', '18:00'],
  ['19:00', '20:00', '21:00', '20:00', '19:00', '19:00', '18:00'],
];

const DUMMY_TITLE_SETS = [
  [
    `월요 팀 미팅`,
    '저스트\n채팅',
    '협업 콘텐츠\n준비',
    '게임 진행',
    '합방 리허설',
    '주말 특별 방송',
    'CCS 팀 합방',
  ],
  [
    '주간 계획 공유',
    '노가리 방송',
    '콘텐츠 점검',
    '콜라보 준비',
    '아재즈 합방',
    '장기 합방 진행',
    'CCS 합방',
  ],
  [
    '신작 탐방',
    '리썰 합방',
    '칼바람 합방',
    '타래 엮기',
    '자유 방송',
    '노래 방송',
    'CCS 합방',
  ],
  [
    '토크 방송',
    '자유 방송',
    '특집 컨텐츠',
    '게임 방송',
    '정기 방송',
    '주말 자유 방송',
    'CCS 합방',
  ],
];

const DUMMY_OFFLINE_DAYS = [[0, 3], [3], [4], [0, 1]];

const getMemberHandle = (userId: number) =>
  memberIdsMap.get(userId) ?? memberNamesMap.get(userId) ?? `member_${userId}`;

const getMemberName = (userId: number) =>
  memberNamesMap.get(userId) ?? getMemberHandle(userId);

const createDummyScheduleData = (
  memberIndex: number
): TeamTimeTableWeekData => {
  const times = DUMMY_TIME_SETS[memberIndex % DUMMY_TIME_SETS.length];
  const titles = DUMMY_TITLE_SETS[memberIndex % DUMMY_TITLE_SETS.length];
  const offlineDays =
    DUMMY_OFFLINE_DAYS[memberIndex % DUMMY_OFFLINE_DAYS.length];

  return titles.map((mainTitle, day) => ({
    day,
    entries: [
      {
        time: times[day],
        mainTitle,
        isGuerrilla: day === 2 && memberIndex % 2 === 0,
      },
    ],
    isOffline: offlineDays.includes(day),
  }));
};

export const createDummyResponse = (
  weekStartDate = DUMMY_WEEK_START_DATE
): TeamSchedulesResponse => {
  const resolvedWeekStartDate = weekStartDate || DUMMY_WEEK_START_DATE;

  return {
    schedules: team_ids.map(
      (userId, index): UserScheduleData => ({
        user_id: userId,
        success: true,
        schedule: {
          id: `dummy-schedule-${userId}`,
          user_id: userId,
          week_start_date: resolvedWeekStartDate,
          schedule_data: createDummyScheduleData(index),
          created_at: DUMMY_CREATED_AT,
          updated_at: DUMMY_CREATED_AT,
          user: {
            id: userId,
            name: getMemberName(userId),
            email: `${getMemberHandle(userId)}@example.com`,
          },
        },
      })
    ),
    userIds: team_ids,
    weekStartDate: resolvedWeekStartDate,
  };
};

export const dummyResponse: TeamSchedulesResponse = createDummyResponse();

export const dummyData: UserScheduleData[] = dummyResponse.schedules;
