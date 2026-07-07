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
    '아침 라디오',
    '스팀 신작\n첫 플레이',
    '마인크래프트 건축',
    '오늘의 잡담',
    '시청자 참여\n랭크전',
    '주말 합방\n미니게임',
    '한 주 마무리',
  ],
  [
    '발로란트 랭크',
    '근황 토크\n커피챗',
    '콘텐츠 회의',
    '어쿠스틱 노래방',
    '합방 리허설',
    '신작 애니 리뷰',
    '자유 방송',
  ],
  [
    '스토리 게임\n이어하기',
    '소통 방송',
    '도전 과제 클리어',
    '그림 연습\n작업방송',
    '중요 공지',
    '팬미팅 토크',
    '다음 주 계획',
  ],
  [
    '오프닝 토크',
    '팀 미션\n합동 방송',
    '질문 받아요',
    '자료 정리 방송',
    '밤샘 게임회',
    '특별 편성\n커버곡',
    '엔딩 토크',
  ],
  [
    '모닝 체크인\n짧방',
    '점심 잡담',
    '신규 맵 탐험',
    '정규 방송',
    '테스트 서버\n체험',
    '이벤트 안내',
    '릴레이 방송\n후반전',
  ],
];

const DUMMY_SUBTITLE_SETS = [
  [
    '가볍게 시작해요',
    '첫인상 플레이',
    '건축 아이디어 모으기',
    '근황과 질문',
    '같이 달리는 날',
    '팀원들과 한 판',
    '이번 주 회고',
  ],
  [
    '목표 티어까지',
    '커피 들고 만나요',
    '다음 기획 정리',
    '신청곡 연습',
    '동선 맞추기',
    '스포일러 없음',
    '편하게 놀아요',
  ],
  [
    '지난 회차부터',
    '채팅 읽는 시간',
    '오늘 안에 끝내기',
    '러프부터 채색까지',
    '일정 변경 안내',
    '사연 읽기',
    '휴방일도 체크',
  ],
  [
    '한 주의 시작',
    '협동 챌린지',
    '무엇이든 물어봐요',
    '클립과 자료 정리',
    '클리어할 때까지',
    '깜짝 공개',
    '다음 방송 예고',
  ],
  [
    '출근길 짧게',
    '밥 먹으며 잡담',
    '새 시즌 둘러보기',
    '평소 시간에 만나요',
    '패치 확인',
    '참여 방법 안내',
    '마지막 주자',
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
