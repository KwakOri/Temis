import type {
  StudioRuntimeValues,
  StudioTeamDefinition,
  StudioTeamRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import type { StudioTimetableGraphDocument } from "@/types/studio-timetable-graph";
import type { UserScheduleData } from "@/types/team-timetable";
import { normalizeTeamTimeTableData } from "@/types/team-timetable";
import { createStudioTimetableGraphDocument } from "./timetable-graph-document";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "./timetable-graph-presets";
import { createStudioInitialRuntimeValues } from "./input-values";
import { resolveStudioTimetableGraphGeometry } from "./timetable-graph-commands";
import { ensureStudioTimetableEntryGroupContract } from "./entry-groups";

export const STUDIO_TEAM_LAYOUTS = [
  {
    id: "day-columns",
    label: "요일별 열",
    referenceId: "34d14470-65c6-4e46-a76b-dec8e16c20e9",
  },
  {
    id: "day-grid",
    label: "요일 블록",
    referenceId: "ed524dfa-8477-4a2e-a117-4eb656a025be",
  },
  {
    id: "member-rows",
    label: "멤버별 행",
    referenceId: "e792576d-41ba-4324-9085-33c4ad162469",
  },
] as const;

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;
const string = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max;

export function validateStudioTeamDefinition(
  document: StudioTemplateDocument,
): string[] {
  const team: unknown = document.domains?.timetable?.team;
  if (team === undefined) return [];
  if (
    !record(team) ||
    !Array.isArray(team.memberSlotIds) ||
    !integer(team.memberSlotIds.length, 1, 12) ||
    !team.memberSlotIds.every(
      (id) =>
        typeof id === "string" &&
        /^[a-zA-Z0-9_-]{1,64}$/.test(id) &&
        !["__proto__", "constructor", "prototype"].includes(id),
    ) ||
    new Set(team.memberSlotIds).size !== team.memberSlotIds.length ||
    !STUDIO_TEAM_LAYOUTS.some((layout) => layout.id === team.layout) ||
    !integer(team.columns, 1, 7) ||
    !integer(team.gap, 0, 40) ||
    !["member", "time"].includes(String(team.order)) ||
    (team.layout === "member-rows" && team.order !== "member")
  ) {
    return ["Invalid team repeat definition."];
  }
  const name = document.inputs[String(team.memberNameInputId)];
  const image = document.inputs[String(team.memberImageInputId)];
  const errors: string[] = [];
  if (document.domains?.timetable?.dayIds.length !== 7)
    errors.push("Team templates require seven timetable days.");
  if (
    !name ||
    name.type !== "text" ||
    name.scope !== "global" ||
    !image ||
    image.type !== "image" ||
    image.scope !== "global"
  )
    errors.push("Team member bindings require global name and image inputs.");
  if (document.version !== 8 || document.metadata.kind !== "timetable")
    errors.push("Team templates require native v8 timetable documents.");
  if (!document.domains?.timetable?.statuses.missing)
    errors.push("Team templates require a missing schedule status.");
  try {
    const cells = getStudioTeamCells(
      document as StudioTimetableGraphDocument,
      createStudioInitialRuntimeValues(document),
    );
    if (cells.some((cell) => cell.width < 48 || cell.height < 18))
      errors.push("Team cards require at least 48 x 18 pixels.");
  } catch {
    errors.push("Invalid team generator geometry.");
  }
  return errors;
}

export function isStudioTeamRuntimeValues(
  value: unknown,
): value is StudioTeamRuntimeValues {
  if (
    !record(value) ||
    !record(value.members) ||
    Object.keys(value.members).length > 12
  )
    return false;
  return Object.values(value.members).every(
    (member) =>
      record(member) &&
      string(member.name, 80) &&
      string(member.image, 2048) &&
      (!member.image || isStudioTeamImageUrl(member.image)) &&
      record(member.days) &&
      Object.keys(member.days).length <= 7 &&
      Object.values(member.days).every(
        (day) =>
          record(day) &&
          ["online", "offline", "missing"].includes(String(day.status)) &&
          Array.isArray(day.entries) &&
          day.entries.length <= 20 &&
          day.entries.every(
            (entry) =>
              record(entry) &&
              string(entry.mainTitle, 500) &&
              string(entry.subTitle, 500) &&
              string(entry.time, 40) &&
              typeof entry.isGuerrilla === "boolean",
          ),
      ),
  );
}

export function isStudioTeamImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (!value) return true;
  if (
    /^\/(images|thumbnail|team-thumbnails|_next\/static\/media)\/[\w./-]+$/.test(
      value,
    ) &&
    !value.includes("..")
  )
    return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateStudioTeamRuntime(
  document: StudioTemplateDocument,
  value: unknown,
): string[] {
  const team = document.domains?.timetable?.team;
  if (!team)
    return value === undefined
      ? []
      : ["Team runtime requires a team template."];
  if (value === undefined) return []; // Missing runtime resolves to missing slots, never fabricated broadcasts.
  if (!isStudioTeamRuntimeValues(value))
    return ["Invalid team runtime values."];
  const ids = new Set(team.memberSlotIds);
  const days = new Set(document.domains!.timetable!.dayIds);
  return Object.entries(value.members).some(
    ([id, member]) =>
      !ids.has(id) || Object.keys(member.days).some((day) => !days.has(day)),
  )
    ? ["Unknown team member or day."]
    : [];
}

export function createStudioTeamDocument(): StudioTimetableGraphDocument {
  const document = createStudioTimetableGraphDocument();
  const timetable = document.domains.timetable;
  document.metadata.name = "Team Timetable";
  document.metadata.description = "";
  document.canvas = { width: 200, height: 240, background: "transparent" };
  document.assets = {};
  document.inputs = {
    team_member_name: {
      id: "team_member_name",
      type: "text",
      scope: "global",
      label: "멤버 이름",
      defaultValue: "멤버",
    },
    team_member_image: {
      id: "team_member_image",
      type: "image",
      scope: "global",
      label: "멤버 이미지",
      defaultUrl: "",
    },
  };
  document.graph = { rootNodeIds: [], nodes: {} };
  document.styles = {};
  timetable.canvas = { width: 1600, height: 1000, backgroundColor: "#f4f4f5" };
  timetable.team = {
    memberSlotIds: ["member-a", "member-b", "member-c"],
    layout: "day-columns",
    columns: 4,
    gap: 12,
    order: "member",
    memberNameInputId: "team_member_name",
    memberImageInputId: "team_member_image",
  };
  timetable.components = {};
  timetable.statuses = {
    online: { id: "online", label: "방송", kind: "base", baseStatus: "online" },
    offline: {
      id: "offline",
      label: "휴방",
      kind: "base",
      baseStatus: "offline",
    },
    missing: {
      id: "missing",
      label: "미등록",
      kind: "derived",
      baseStatus: "offline",
      fallbackStatusId: "offline",
    },
  };
  const componentId = "team-card";
  timetable.entryComponentId = componentId;
  timetable.mountNodeId = "team-online";
  timetable.components[componentId] = {
    id: componentId,
    label: "Team Card",
    defaultStatusId: "online",
    frame: { left: 0, top: 0, width: 200, height: 240 },
    variants: {},
  };
  const add = (
    id: string,
    parentId: string | null,
    type: "group" | "text" | "image",
    style: Record<string, string | number>,
    binding?: NonNullable<
      StudioTemplateDocument["graph"]["nodes"][string]["binding"]
    >,
  ) => {
    const styleId = `style_${id}`;
    document.styles[styleId] = style;
    document.graph.nodes[id] = {
      id,
      label: id.replace(/^team-/, ""),
      type,
      parentId,
      childIds: [],
      styleId,
      ...(binding ? { binding } : {}),
    };
    if (parentId) document.graph.nodes[parentId].childIds.push(id);
    else document.graph.rootNodeIds.push(id);
  };
  for (const status of ["online", "offline", "missing"] as const) {
    const root = `team-${status}`;
    add(root, null, "group", {
      left: 0,
      top: 0,
      width: 200,
      height: 240,
      backgroundColor:
        status === "online"
          ? "#ffffff"
          : status === "offline"
            ? "#fce7f3"
            : "#e4e4e7",
      borderRadius: 6,
      overflow: "hidden",
    });
    timetable.components[componentId].variants[status] = {
      statusId: status,
      rootNodeId: root,
    };
    add(
      `${root}-name`,
      root,
      "text",
      {
        left: 14,
        top: 12,
        width: 124,
        height: 28,
        fontSize: 21,
        fontWeight: 700,
        color: "#047857",
      },
      { kind: "inputText", inputId: "team_member_name" },
    );
    add(
      `${root}-image`,
      root,
      "image",
      { left: 154, top: 10, width: 36, height: 36, borderRadius: 18 },
      { kind: "inputImage", inputId: "team_member_image" },
    );
    document.graph.nodes[`${root}-image`].fit = "cover";
    add(
      `${root}-day`,
      root,
      "text",
      {
        left: 14,
        top: 44,
        width: 172,
        height: 24,
        fontSize: 15,
        color: "#52525b",
      },
      { kind: "builtinField", fieldId: "day.short_label" },
    );
    if (status === "online") {
      add(
        "node_c3",
        root,
        "text",
        {
          left: 14,
          top: 90,
          width: 172,
          height: 52,
          fontSize: 24,
          fontWeight: 700,
          color: "#18181b",
        },
        { kind: "builtinField", fieldId: "entry.main_title" },
      );
      add(
        `${root}-time`,
        root,
        "text",
        {
          left: 14,
          top: 160,
          width: 172,
          height: 24,
          fontSize: 18,
          color: "#18181b",
        },
        { kind: "builtinField", fieldId: "entry.time", timeFormat: "full" },
      );
      add(
        `${root}-subtitle`,
        root,
        "text",
        {
          left: 14,
          top: 195,
          width: 172,
          height: 30,
          fontSize: 15,
          color: "#71717a",
        },
        { kind: "builtinField", fieldId: "entry.sub_title" },
      );
    } else {
      add(
        `${root}-status`,
        root,
        "text",
        {
          left: 14,
          top: 94,
          width: 172,
          height: 60,
          fontSize: 26,
          fontWeight: 700,
          color: "#3f3f46",
        },
        { kind: "builtinField", fieldId: "entry.status_label" },
      );
    }
  }
  add(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID, null, "group", {
    left: 32,
    top: 130,
    width: 1536,
    height: 830,
    opacity: 1,
    rotateDeg: 0,
  });
  document.graph.nodes[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID].label =
    "Team Cards";
  timetable.rootNodeIds = [STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID];
  timetable.nodeExtensions = {
    [STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID]: {
      presetId: "dayCards",
      generator: { kind: "dayCards" },
    },
  };
  // Titles remain editable graph nodes, not renderer-only decoration.
  add(
    "team-title",
    null,
    "text",
    {
      left: 32,
      top: 28,
      width: 1100,
      height: 64,
      fontSize: 40,
      fontWeight: 800,
      color: "#18181b",
    },
    { kind: "staticText", value: "TEAM WEEKLY SCHEDULE" },
  );
  timetable.rootNodeIds.unshift("team-title");
  ensureStudioTimetableEntryGroupContract(document);
  return document;
}

export function createStudioTeamPreview(
  document: StudioTemplateDocument,
): StudioTeamRuntimeValues {
  const timetable = document.domains!.timetable!;
  return {
    members: Object.fromEntries(
      timetable.team!.memberSlotIds.map((id, index) => [
        id,
        {
          name: `멤버 ${String.fromCharCode(65 + index)}`,
          image: "",
          days: Object.fromEntries(
            timetable.dayIds.map((day, i) => [
              day,
              {
                status:
                  i === (index + 5) % 7
                    ? "offline"
                    : i === (index + 6) % 7
                      ? "missing"
                      : "online",
                entries: [
                  {
                    mainTitle: "주간 방송",
                    subTitle: "게임 · 토크",
                    time: `${18 + (index % 4)}:00`,
                    isGuerrilla: i === 2 && index === 0,
                  },
                ],
              },
            ]),
          ),
        },
      ]),
    ),
  };
}

export function adaptStudioTeamSchedules(
  document: StudioTemplateDocument,
  bindings: Array<{
    slotId: string;
    userId: number;
    name: string;
    image?: string;
  }>,
  schedules: UserScheduleData[],
): StudioTeamRuntimeValues {
  const timetable = document.domains!.timetable!;
  return {
    members: Object.fromEntries(
      bindings
        .filter((binding) =>
          timetable.team!.memberSlotIds.includes(binding.slotId),
        )
        .map((binding) => {
          const response = schedules.find(
            (item) => item.user_id === binding.userId,
          );
          const week = response?.success
            ? normalizeTeamTimeTableData(response.schedule?.schedule_data)
            : null;
          return [
            binding.slotId,
            {
              name: binding.name,
              image: binding.image ?? "",
              days: Object.fromEntries(
                timetable.dayIds.map((day, i) => [
                  day,
                  {
                    status: !week
                      ? "missing"
                      : week[i].isOffline
                        ? "offline"
                        : "online",
                    entries: week?.[i].entries ?? [],
                  },
                ]),
              ),
            },
          ];
        }),
    ),
  };
}

export function getStudioTeamMemberOrder(
  team: StudioTeamDefinition,
  values: StudioTeamRuntimeValues | undefined,
  dayId: string,
): string[] {
  const earliest = (id: string) => {
    const day = values?.members[id]?.days[dayId];
    if (day?.status !== "online") return Infinity;
    return day.entries.reduce((best, entry) => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(entry.time);
      return entry.isGuerrilla ||
        !match ||
        Number(match[1]) > 23 ||
        Number(match[2]) > 59
        ? best
        : Math.min(best, Number(match[1]) * 60 + Number(match[2]));
    }, Infinity);
  };
  return [...team.memberSlotIds].sort((a, b) =>
    team.order === "time"
      ? earliest(a) - earliest(b) ||
        team.memberSlotIds.indexOf(a) - team.memberSlotIds.indexOf(b)
      : 0,
  );
}

export function getStudioTeamCells(
  document: StudioTimetableGraphDocument,
  values: StudioRuntimeValues,
) {
  const timetable = document.domains.timetable,
    team = timetable.team!;
  const bounds = resolveStudioTimetableGraphGeometry(
    document,
    STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
  );
  const columns =
    team.layout === "day-grid" ? team.columns : timetable.dayIds.length;
  const blocks =
    team.layout === "day-grid"
      ? Math.ceil(timetable.dayIds.length / columns)
      : 1;
  const memberHeaderWidth =
    team.layout === "member-rows" ? Math.min(180, bounds.width * 0.15) : 0;
  const width =
    (bounds.width -
      memberHeaderWidth -
      (memberHeaderWidth ? team.gap : 0) -
      team.gap * (columns - 1)) /
    columns;
  const blockHeight = (bounds.height - team.gap * (blocks - 1)) / blocks;
  const height =
    (blockHeight - team.gap * (team.memberSlotIds.length - 1)) /
    team.memberSlotIds.length;
  return timetable.dayIds.flatMap((dayId, dayIndex) =>
    getStudioTeamMemberOrder(team, values.team, dayId).map((slotId, index) => ({
      slotId,
      dayId,
      width,
      height,
      left:
        (memberHeaderWidth ? memberHeaderWidth + team.gap : 0) +
        (dayIndex % columns) * (width + team.gap),
      top:
        Math.floor(dayIndex / columns) * (blockHeight + team.gap) +
        index * (height + team.gap),
      memberHeaderWidth,
    })),
  );
}

/** Each broadcast uses the shared card engine; no Multi two-slot limit or truncation. */
export function getStudioTeamCellRuntime(
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  slotId: string,
  dayId: string,
  index = 0,
): StudioRuntimeValues {
  const team = document.domains!.timetable!.team!;
  const member = values.team?.members[slotId],
    day = member?.days[dayId];
  const entry = day?.status === "online" ? day.entries[index] : undefined;
  const status = day?.status ?? "missing";
  const defaults = createStudioInitialRuntimeValues(document);
  return {
    ...defaults,
    global: {
      ...defaults.global,
      ...values.global,
      [team.memberNameInputId]: member?.name ?? slotId,
      [team.memberImageInputId]: member?.image ?? "",
    },
    timetable: {
      ...defaults.timetable,
      weekStartDate: values.timetable.weekStartDate,
      entriesByDay: {
        ...defaults.timetable.entriesByDay,
        [dayId]: [
          { id: `${slotId}:${dayId}:${index}`, statusId: status, ...entry },
        ],
      },
    },
  };
}
