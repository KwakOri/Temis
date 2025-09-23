// Team timetable related types
import type { Tables } from "./supabase";
import type { TDefaultCard } from "./time-table/data";

// Base entry structure - all entries must have time and mainTitle
export interface TimeTableEntry {
  time: string;
  mainTitle: string;
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

// Simplified entry for team timetable storage (only time and mainTitle)
export interface TeamTimeTableEntry {
  time: string;
  mainTitle: string;
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
export type Team = Tables<"teams">;
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
  extends Omit<Tables<"team_schedules">, "schedule_data"> {
  schedule_data: TeamTimeTableWeekData;
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
    entries: card.entries
      .map((entry) => {
        // time과 mainTitle은 이제 필수 속성이므로 직접 접근 가능
        const time = entry.time || "";
        const mainTitle =
          entry.mainTitle ||
          (entry.title as string) ||
          (entry.subject as string) ||
          (entry.content as string) ||
          "";

        return {
          time,
          mainTitle,
          isGuerrilla: entry.isGuerrilla || false, // isGuerrilla 속성 포함
        };
      })
      .filter((entry) => entry.time && entry.mainTitle), // Filter out empty entries
  })) as TeamTimeTableWeekData;
}

// Function to validate team timetable data structure
export function validateTeamTimeTableData(
  data: unknown
): data is TeamTimeTableWeekData {
  if (!Array.isArray(data) || data.length !== 7) {
    return false;
  }

  return data.every((day, index) => {
    return (
      typeof day === "object" &&
      day !== null &&
      typeof day.day === "number" &&
      day.day === index &&
      typeof day.isOffline === "boolean" &&
      Array.isArray(day.entries) &&
      day.entries.every(
        (entry: TeamTimeTableEntry) =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.time === "string" &&
          typeof entry.mainTitle === "string" &&
          typeof entry.isGuerrilla === "boolean"
      )
    );
  });
}
