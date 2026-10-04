import type { TeamStudioWeek } from "@/types/team-studio-runtime";
import type { StudioTemplateDocument } from "@/types/template-studio";
import { createStudioInitialRuntimeValues } from "./input-values";
import {
  adaptStudioTeamSchedules,
  isStudioTeamImageUrl,
} from "./team-timetable";
import { parseStudioIsoDateParts } from "./date-template";

export const isTeamStudioMonday = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parseStudioIsoDateParts(date))
    return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    parsed.getUTCDay() === 1
  );
};

export function getDefaultTeamStudioBindings(
  document: StudioTemplateDocument,
  members: TeamStudioWeek["members"],
): Record<string, number> {
  return Object.fromEntries(
    (document.domains?.timetable?.team?.memberSlotIds ?? []).flatMap(
      (slotId, index) =>
        members[index] ? [[slotId, members[index].userId]] : [],
    ),
  );
}

export function createConnectedTeamStudioValues(
  week: TeamStudioWeek,
  bindings: Record<string, number>,
  images: Record<number, string> = {},
) {
  const slots = week.document.domains?.timetable?.team?.memberSlotIds ?? [];
  const members = new Map(
    week.members.map((member) => [member.userId, member]),
  );
  const seen = new Set<number>();
  const resolved = slots.flatMap((slotId) => {
    const member = members.get(bindings[slotId]);
    if (!member || seen.has(member.userId)) return [];
    seen.add(member.userId);
    return [
      {
        slotId,
        userId: member.userId,
        name: member.name,
        image: isStudioTeamImageUrl(images[member.userId])
          ? images[member.userId]
          : "",
      },
    ];
  });
  const values = createStudioInitialRuntimeValues(week.document);
  values.timetable.weekStartDate = week.weekStartDate;
  values.team = adaptStudioTeamSchedules(
    week.document,
    resolved,
    week.schedules,
  );
  return {
    values,
    unassigned: week.members.filter((member) => !seen.has(member.userId)),
  };
}
