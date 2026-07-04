// Team timetable related types
import type { Tables } from "./supabase";
import type { TDefaultCard } from "./time-table/data";

// Base entry structure - all entries must have time and mainTitle
export interface TimeTableEntry {
  time: string;
  mainTitle: string;
  subTitle?: string;
  isGuerrilla: boolean; // 게릴라방송 여부 (필수, 기본값 false)
  [key: string]: string | number | boolean | undefined; // Allow additional dynamic properties per template
}

// Day structure - represents one day in the week
export interface TimeTableDay {
  day: number; // 0-6 (Monday to Sunday)
  isOffline: boolean;
  entries: TimeTableEntry[];
}

// Full week timetable data (7 days)
export type TimeTableWeekData = TimeTableDay[];

// Simplified entry for team timetable storage
export interface TeamTimeTableEntry {
  time: string;
  mainTitle: string;
  subTitle: string;
  isGuerrilla: boolean; // 게릴라방송 여부 (필수, 기본값 false)
}

// Simplified day structure for team timetable storage
export interface TeamTimeTableDay {
  day: number;
  isOffline: boolean;
  entries: TeamTimeTableEntry[];
}

// Simplified week data for team timetable storage
export type TeamTimeTableWeekData = TeamTimeTableDay[];

// Team-related types - using Supabase database schema
export type Team = Tables<"teams"> & {
  team_template?: {
    id: string;
    name: string;
    descriptions: string | null;
  } | null;
};
export type TeamMember = Tables<"team_members">;

// Team member with user information
export interface TeamMemberWithUser extends TeamMember {
  users?: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
}

// TeamSchedule extends the database type but with proper typing for schedule_data
export interface TeamSchedule
  extends Omit<Tables<"team_schedules">, "schedule_data" | "team_id"> {
  schedule_data: TeamTimeTableWeekData;
}

// TeamSchedule with user information
export interface TeamScheduleWithUser extends TeamSchedule {
  user?: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
}

// Wrapped schedule data for each user
export interface UserScheduleData {
  user_id: number;
  success: boolean;
  schedule: TeamScheduleWithUser | null;
}

// Multiple team schedules response
export interface TeamSchedulesResponse {
  schedules: UserScheduleData[];
  userIds: number[];
  weekStartDate: string;
}

// Team with members info for display
export interface TeamWithMembers extends Team {
  members?: TeamMemberWithUser[];
  memberCount?: number;
}

// Function to convert full timetable data to team timetable data
export function convertToTeamTimeTableData(
  fullData: TimeTableWeekData
): TeamTimeTableWeekData {
  return fullData.map((day) => ({
    day: day.day,
    isOffline: day.isOffline,
    entries: day.entries.map((entry) => ({
      time: entry.time,
      mainTitle: entry.mainTitle,
      subTitle: typeof entry.subTitle === "string" ? entry.subTitle : "",
      isGuerrilla: entry.isGuerrilla,
    })),
  })) as TeamTimeTableWeekData;
}

// Function to convert dynamic card data to team timetable data
export function convertDynamicCardsToTeamTimeTableData(
  dynamicCards: TDefaultCard[]
): TeamTimeTableWeekData {
  if (dynamicCards.length !== 7) {
    throw new Error("Dynamic cards must contain exactly 7 days");
  }

  return dynamicCards.map((card) => ({
    day: card.day,
    isOffline: card.isOffline,
    entries: card.entries.map((entry) => {
      // time과 mainTitle은 이제 필수 속성이므로 직접 접근 가능
      const time = entry.time || "";
      const mainTitle =
        entry.mainTitle ||
        (entry.title as string) ||
        (entry.subject as string) ||
        (entry.content as string) ||
        "";
      const subTitle = typeof entry.subTitle === "string" ? entry.subTitle : "";

      return {
        time,
        mainTitle,
        subTitle,
        isGuerrilla: entry.isGuerrilla || false, // isGuerrilla 속성 포함
      };
    }),
  })) as TeamTimeTableWeekData;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (value: unknown): string =>
  typeof value === "string" ? value : "";

const getMainTitle = (entry: Record<string, unknown>): string =>
  getStringValue(entry.mainTitle) ||
  getStringValue(entry.title) ||
  getStringValue(entry.subject) ||
  getStringValue(entry.content);

export function normalizeTeamTimeTableData(
  data: unknown
): TeamTimeTableWeekData | null {
  if (!Array.isArray(data) || data.length !== 7) {
    return null;
  }

  const normalizedDays = data.map((day, index): TeamTimeTableDay | null => {
    if (!isRecord(day) || !Array.isArray(day.entries)) {
      return null;
    }

    const entries = day.entries.map((entry): TeamTimeTableEntry | null => {
      if (!isRecord(entry)) {
        return null;
      }

      return {
        time: getStringValue(entry.time),
        mainTitle: getMainTitle(entry),
        subTitle: getStringValue(entry.subTitle),
        isGuerrilla:
          typeof entry.isGuerrilla === "boolean" ? entry.isGuerrilla : false,
      };
    });

    if (entries.some((entry) => entry === null)) {
      return null;
    }

    return {
      day: typeof day.day === "number" ? day.day : index,
      isOffline: typeof day.isOffline === "boolean" ? day.isOffline : false,
      entries: entries as TeamTimeTableEntry[],
    };
  });

  if (normalizedDays.some((day) => day === null)) {
    return null;
  }

  const normalized = normalizedDays as TeamTimeTableWeekData;
  return normalized.every((day, index) => day.day === index)
    ? normalized
    : null;
}

// Function to validate team timetable data structure
export function validateTeamTimeTableData(
  data: unknown
): data is TeamTimeTableWeekData {
  return normalizeTeamTimeTableData(data) !== null;
}
