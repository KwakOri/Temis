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

/** Keep member identities and their designs stable when membership or order changes. */
export function prepareConnectedTeamStudioPreview(
  week: TeamStudioWeek,
  bindings: Record<string, number>,
) {
  if (week.members.length > 12)
    throw new Error("팀 시간표는 최대 12명까지 지원합니다.");
  const team = week.document.domains!.timetable!.team!;
  const validUsers = new Set(week.members.map((member) => member.userId));
  const assigned = new Set<number>();
  const nextBindings: Record<string, number> = {};
  const slots: string[] = [];
  for (const slot of team.memberSlotIds) {
    const id = bindings[slot];
    if (!validUsers.has(id) || assigned.has(id)) continue;
    slots.push(slot);
    nextBindings[slot] = id;
    assigned.add(id);
  }
  for (const member of week.members) {
    if (assigned.has(member.userId)) continue;
    const reusable = team.memberSlotIds.find(
      (slot) => !slots.includes(slot) && !bindings[slot],
    );
    const slot = reusable ?? `member-user-${member.userId}`;
    slots.push(slot);
    nextBindings[slot] = member.userId;
    assigned.add(member.userId);
  }
  const definition = {
    ...team,
    memberSlotIds: slots.length ? slots : [team.memberSlotIds[0]],
    ...(team.memberComponentIds
      ? {
          memberComponentIds: Object.fromEntries(
            Object.entries(team.memberComponentIds).filter(([slot]) =>
              slots.includes(slot),
            ),
          ),
        }
      : {}),
  };
  const document = {
    ...week.document,
    domains: {
      ...week.document.domains,
      timetable: {
        ...week.document.domains!.timetable!,
        team: definition,
      },
    },
  };
  return {
    ...createConnectedTeamStudioValues({ ...week, document }, nextBindings),
    definition,
    bindings: nextBindings,
  };
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
