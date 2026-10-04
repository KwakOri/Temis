import type { StudioTemplateDocument } from "./template-studio";
import type { UserScheduleData } from "./team-timetable";

export interface TeamStudioOptions {
  templates: Array<{ id: string; name: string; memberSlotCount: number }>;
  teams: Array<{ id: string; name: string }>;
}
export interface TeamStudioWeek {
  document: StudioTemplateDocument;
  revisionNo: number;
  template: { id: string; name: string };
  team: { id: string; name: string };
  weekStartDate: string;
  members: Array<{ userId: number; name: string }>;
  schedules: UserScheduleData[];
}
