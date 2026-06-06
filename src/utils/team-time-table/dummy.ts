import type {
  TeamSchedulesResponse,
  TeamTimeTableWeekData,
  UserScheduleData,
} from '@/types/team-timetable';

const DEFAULT_DUMMY_WEEK_START_DATE = '2026-04-06';
const DEFAULT_DUMMY_CREATED_AT = '2026-04-06T11:45:24.928131+00:00';

const DUMMY_TIME_SETS = [
  ['10:00', '20:00', '21:00', '19:30', '20:00', '14:00', '17:00'],
  ['18:00', '21:00', '19:00', '20:00', '21:00', '17:00', '18:00'],
  ['20:00', '19:00', '18:00', '20:00', '20:00', '18:00', '18:00'],
  ['19:00', '20:00', '21:00', '20:00', '19:00', '19:00', '18:00'],
  ['09:00', '15:00', '12:30', '20:30', '14:30', '17:30', '18:00'],
];

const DUMMY_TITLE_SETS = [
  [
    '월간 일정 점검',
    '근황 토크',
    '콘텐츠 준비',
    '게임 방송',
    '작업 방송',
    '주말 스페셜',
    '정기 합방',
  ],
  [
    '주간 계획 공유',
    '자유 토크',
    '자료 정리',
    '녹화 준비',
    '시청자 참여',
    '커뮤니티 데이',
    '다음 주 준비',
  ],
  [
    '새 콘텐츠 탐색',
    '짧은 소통',
    '연습 방송',
    '프로젝트 진행',
    '정기 방송',
    '노래 방송',
    '릴레이 방송',
  ],
  [
    '토크 방송',
    '자유 방송',
    '특집 콘텐츠',
    '게임 진행',
    '작업 진행',
    '주말 자유 방송',
    '마감 체크',
  ],
  [
    '주간 킥오프',
    '아이디어 정리',
    '크로스 체크',
    '야간 작업',
    '기획 회의',
    '주간 회고',
    '일정 정리',
  ],
];

const DUMMY_OFFLINE_DAYS = [[0, 3], [3], [4], [0, 1], []];

interface CreateTeamDummyResponseOptions {
  teamIds: number[];
  weekStartDate?: string;
  createdAt?: string;
  unregisteredMemberIds?: number[];
  memberIdsMap?: Map<number, string>;
  memberNamesMap?: Map<number, string>;
}

const getMemberHandle = (
  userId: number,
  memberIdsMap?: Map<number, string>,
  memberNamesMap?: Map<number, string>
) =>
  memberIdsMap?.get(userId) ??
  memberNamesMap?.get(userId) ??
  `member_${userId}`;

const getMemberName = (
  userId: number,
  memberIdsMap?: Map<number, string>,
  memberNamesMap?: Map<number, string>
) =>
  memberNamesMap?.get(userId) ??
  getMemberHandle(userId, memberIdsMap, memberNamesMap);

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

export const createTeamDummyResponse = ({
  teamIds,
  weekStartDate = DEFAULT_DUMMY_WEEK_START_DATE,
  createdAt = DEFAULT_DUMMY_CREATED_AT,
  unregisteredMemberIds = [],
  memberIdsMap,
  memberNamesMap,
}: CreateTeamDummyResponseOptions): TeamSchedulesResponse => {
  const resolvedWeekStartDate = weekStartDate || DEFAULT_DUMMY_WEEK_START_DATE;
  const unregisteredMemberIdSet = new Set(unregisteredMemberIds);
  const userIds = Array.from(new Set([...teamIds, ...unregisteredMemberIds]));

  return {
    schedules: userIds.map(
      (userId, index): UserScheduleData => {
        if (unregisteredMemberIdSet.has(userId)) {
          return {
            user_id: userId,
            success: false,
            schedule: null,
          };
        }

        const memberHandle = getMemberHandle(
          userId,
          memberIdsMap,
          memberNamesMap
        );

        return {
          user_id: userId,
          success: true,
          schedule: {
            id: `dummy-schedule-${userId}`,
            user_id: userId,
            week_start_date: resolvedWeekStartDate,
            schedule_data: createDummyScheduleData(index),
            created_at: createdAt,
            updated_at: createdAt,
            user: {
              id: userId,
              name: getMemberName(userId, memberIdsMap, memberNamesMap),
              email: `${memberHandle}@example.com`,
            },
          },
        };
      }
    ),
    userIds,
    weekStartDate: resolvedWeekStartDate,
  };
};
