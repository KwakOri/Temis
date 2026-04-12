import { TeamSchedulesResponse, UserScheduleData } from '@/types/team-timetable';

const DUMMY_WEEK_START_DATE = '2026-04-06';
const DUMMY_CREATED_AT = '2026-04-06T11:45:24.928131+00:00';

export const dummyResponse: TeamSchedulesResponse = {
  schedules: [
    {
      user_id: 22,
      success: true,
      schedule: {
        id: '0fe57d4a-d0f5-4a9b-aa8b-fef24a0d3022',
        user_id: 22,
        week_start_date: DUMMY_WEEK_START_DATE,
        schedule_data: [
          {
            day: 0,
            entries: [{ time: '10:00', mainTitle: '월요 팀 미팅', isGuerrilla: false }],
            isOffline: true,
          },
          {
            day: 1,
            entries: [{ time: '20:00', mainTitle: '저스트 채팅', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 2,
            entries: [{ time: '21:00', mainTitle: '협업 콘텐츠 준비', isGuerrilla: true }],
            isOffline: false,
          },
          {
            day: 3,
            entries: [{ time: '19:30', mainTitle: '게임 진행', isGuerrilla: false }],
            isOffline: true,
          },
          {
            day: 4,
            entries: [{ time: '20:00', mainTitle: '합방 리허설', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 5,
            entries: [{ time: '14:00', mainTitle: '주말 특별 방송', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 6,
            entries: [{ time: '17:00', mainTitle: 'CCS 팀 합방', isGuerrilla: false }],
            isOffline: false,
          },
        ],
        created_at: DUMMY_CREATED_AT,
        updated_at: DUMMY_CREATED_AT,
        user: {
          id: 22,
          name: 'rubit',
          email: 'rubit@example.com',
        },
      },
    },
    {
      user_id: 248,
      success: true,
      schedule: {
        id: 'b78f8707-770a-48d8-9e26-e7f2ac5f9db8',
        user_id: 248,
        week_start_date: DUMMY_WEEK_START_DATE,
        schedule_data: [
          {
            day: 0,
            entries: [{ time: '18:00', mainTitle: '주간 계획 공유', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 1,
            entries: [{ time: '21:00', mainTitle: '노가리 방송', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 2,
            entries: [{ time: '19:00', mainTitle: '콘텐츠 점검', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 3,
            entries: [{ time: '20:00', mainTitle: '콜라보 준비', isGuerrilla: false }],
            isOffline: true,
          },
          {
            day: 4,
            entries: [{ time: '21:00', mainTitle: '아재즈 합방', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 5,
            entries: [{ time: '17:00', mainTitle: '장기 합방 진행', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 6,
            entries: [{ time: '18:00', mainTitle: 'CCS 합방', isGuerrilla: false }],
            isOffline: false,
          },
        ],
        created_at: DUMMY_CREATED_AT,
        updated_at: DUMMY_CREATED_AT,
        user: {
          id: 248,
          name: 'seon',
          email: 'seon@example.com',
        },
      },
    },
    {
      user_id: 275,
      success: true,
      schedule: {
        id: '06eaf243-f8fd-4e31-aed7-a41f49a2be6b',
        user_id: 275,
        week_start_date: DUMMY_WEEK_START_DATE,
        schedule_data: [
          {
            day: 0,
            entries: [{ time: '20:00', mainTitle: '신작 탐방', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 1,
            entries: [{ time: '19:00', mainTitle: '리썰 합방', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 2,
            entries: [{ time: '18:00', mainTitle: '칼바람 합방', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 3,
            entries: [{ time: '20:00', mainTitle: '타래 엮기', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 4,
            entries: [{ time: '20:00', mainTitle: '자유 방송', isGuerrilla: false }],
            isOffline: true,
          },
          {
            day: 5,
            entries: [{ time: '18:00', mainTitle: '노래 방송', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 6,
            entries: [{ time: '18:00', mainTitle: 'CCS 합방', isGuerrilla: false }],
            isOffline: false,
          },
        ],
        created_at: DUMMY_CREATED_AT,
        updated_at: DUMMY_CREATED_AT,
        user: {
          id: 275,
          name: 'saeback',
          email: 'saeback@example.com',
        },
      },
    },
    {
      user_id: 276,
      success: true,
      schedule: {
        id: '6774a90d-d9de-4355-8ac1-9285f6697f61',
        user_id: 276,
        week_start_date: DUMMY_WEEK_START_DATE,
        schedule_data: [
          {
            day: 0,
            entries: [{ time: '19:00', mainTitle: '토크 방송', isGuerrilla: false }],
            isOffline: true,
          },
          {
            day: 1,
            entries: [{ time: '20:00', mainTitle: '자유 방송', isGuerrilla: false }],
            isOffline: true,
          },
          {
            day: 2,
            entries: [{ time: '21:00', mainTitle: '특집 컨텐츠', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 3,
            entries: [{ time: '20:00', mainTitle: '게임 방송', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 4,
            entries: [{ time: '19:00', mainTitle: '정기 방송', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 5,
            entries: [{ time: '19:00', mainTitle: '주말 자유 방송', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 6,
            entries: [{ time: '18:00', mainTitle: 'CCS 합방', isGuerrilla: false }],
            isOffline: false,
          },
        ],
        created_at: DUMMY_CREATED_AT,
        updated_at: DUMMY_CREATED_AT,
        user: {
          id: 276,
          name: 'ira',
          email: 'ira@example.com',
        },
      },
    },
    {
      user_id: 277,
      success: true,
      schedule: {
        id: '4f9e7fdb-32f7-4582-9b1f-b9477cdc16d0',
        user_id: 277,
        week_start_date: DUMMY_WEEK_START_DATE,
        schedule_data: [
          {
            day: 0,
            entries: [{ time: '09:00', mainTitle: '주간 킥오프', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 1,
            entries: [{ time: '15:00', mainTitle: '백로그 정리', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 2,
            entries: [{ time: '12:30', mainTitle: '크로스 팀 미팅', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 3,
            entries: [{ time: '20:30', mainTitle: '야간 빌드', isGuerrilla: true }],
            isOffline: false,
          },
          {
            day: 4,
            entries: [{ time: '14:30', mainTitle: '아이디어 워크숍', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 5,
            entries: [{ time: '17:30', mainTitle: '주간 회고', isGuerrilla: false }],
            isOffline: false,
          },
          {
            day: 6,
            entries: [{ time: '18:00', mainTitle: 'CCS 합방', isGuerrilla: false }],
            isOffline: false,
          },
        ],
        created_at: DUMMY_CREATED_AT,
        updated_at: DUMMY_CREATED_AT,
        user: {
          id: 277,
          name: 'cosmo',
          email: 'cosmo@example.com',
        },
      },
    },
    {
      user_id: 280,
      success: false,
      schedule: null,
    },
  ],
  userIds: [22, 248, 275, 276, 277, 280],
  weekStartDate: DUMMY_WEEK_START_DATE,
};

export const dummyData: UserScheduleData[] = dummyResponse.schedules;
