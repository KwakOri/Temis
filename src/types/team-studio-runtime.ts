import type { StudioTemplateDocument } from "./template-studio";
import type { UserScheduleData } from "./team-timetable";

export interface TeamStudioOptions {
  templates: Array<{
    id: string;
    name: string;
    memberSlotCount: number;
    connectedTeamId?: string;
  }>;
  teams: Array<{ id: string; name: string }>;
}
export interface TeamStudioConnection {
  templateId: string;
  teamId: string;
  memberBindings: Record<string, number>;
}
export interface TeamStudioTeamWeek {
  team: { id: string; name: string };
  weekStartDate: string;
  members: Array<{ userId: number; name: string }>;
  schedules: UserScheduleData[];
}
export interface TeamStudioWeek extends TeamStudioTeamWeek {
  document: StudioTemplateDocument;
  revisionNo: number;
  template: { id: string; name: string };
  connection?: TeamStudioConnection | null;
}
