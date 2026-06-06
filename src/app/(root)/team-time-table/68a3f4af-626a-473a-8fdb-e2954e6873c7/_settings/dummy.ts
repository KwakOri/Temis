import type {
  TeamSchedulesResponse,
  UserScheduleData,
} from '@/types/team-timetable';
import { createTeamDummyResponse } from '@/utils/team-time-table/dummy';
import {
  dummyUnregisteredMemberIds,
  memberIdsMap,
  memberNamesMap,
  team_ids,
} from './settings';

export const createDummyResponse = (
  weekStartDate?: string
): TeamSchedulesResponse =>
  createTeamDummyResponse({
    teamIds: team_ids,
    weekStartDate,
    unregisteredMemberIds: dummyUnregisteredMemberIds,
    memberIdsMap,
    memberNamesMap,
  });

export const dummyResponse: TeamSchedulesResponse = createDummyResponse();

export const dummyData: UserScheduleData[] = dummyResponse.schedules;
