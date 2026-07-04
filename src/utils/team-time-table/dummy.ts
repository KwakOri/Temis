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
    '[더미] 일정 01',
    '[더미] 일정 02',
    '[더미] 일정 03',
    '[더미] 일정 04',
    '[더미] 일정 05',
    '[더미] 일정 06',
    '[더미] 일정 07',
  ],
  [
    '[더미] 샘플 A',
    '[더미] 샘플 B',
    '[더미] 샘플 C',
    '[더미] 샘플 D',
    '[더미] 샘플 E',
    '[더미] 샘플 F',
    '[더미] 샘플 G',
  ],
  [
    '[더미] 테스트 01',
    '[더미] 테스트 02',
    '[더미] 테스트 03',
    '[더미] 테스트 04',
    '[더미] 테스트 05',
    '[더미] 테스트 06',
    '[더미] 테스트 07',
  ],
  [
    '[더미] 예시 01',
    '[더미] 예시 02',
    '[더미] 예시 03',
    '[더미] 예시 04',
    '[더미] 예시 05',
    '[더미] 예시 06',
    '[더미] 예시 07',
  ],
  [
    '[더미] 항목 01',
    '[더미] 항목 02',
    '[더미] 항목 03',
    '[더미] 항목 04',
    '[더미] 항목 05',
    '[더미] 항목 06',
    '[더미] 항목 07',
  ],
];

const DUMMY_SUBTITLE_SETS = [
  [
    '게임 방송',
    '잡담 타임',
    '신작 체험',
    '콜라보',
    '시청자 참여',
    '주말 특집',
    '마무리 토크',
  ],
  [
    '랭크 도전',
    '근황 토크',
    '콘텐츠 회의',
    '노래 연습',
    '합방 준비',
    '리뷰 방송',
    '자유 방송',
  ],
  [
    '스토리 진행',
    '소통 방송',
    '챌린지',
    '연습 세션',
    '공지 포함',
    '팬미팅',
    '주간 정리',
  ],
  [
    '오프닝',
    '미니게임',
    'Q&A',
    '팀 미션',
    '자료 준비',
    '특별 편성',
    '엔딩 토크',
  ],
  [
    '아침 방송',
    '점심 방송',
    '짧방',
    '정규 방송',
    '테스트 방송',
    '이벤트',
    '릴레이',
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
  const subTitles =
    DUMMY_SUBTITLE_SETS[memberIndex % DUMMY_SUBTITLE_SETS.length];
  const offlineDays =
    DUMMY_OFFLINE_DAYS[memberIndex % DUMMY_OFFLINE_DAYS.length];

  return titles.map((mainTitle, day) => ({
    day,
    entries: [
      {
        time: times[day],
        mainTitle,
        subTitle: subTitles[day],
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
