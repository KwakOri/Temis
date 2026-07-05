import {
  StudioTemplateDocument,
  StudioTimetableCapabilities,
  StudioTimetableCapabilityKey,
  StudioTimetableDomain,
  StudioTimetableStatusDefinition,
} from "@/types/template-studio";

export const STUDIO_TIMETABLE_CAPABILITY_KEYS = [
  "multi",
  "offlineMemo",
] as const satisfies StudioTimetableCapabilityKey[];

export const STUDIO_DEFAULT_TIMETABLE_CAPABILITIES: StudioTimetableCapabilities =
  {
    multi: { enabled: false },
    offlineMemo: { enabled: false },
  };

export const getStudioTimetableCapabilities = (
  timetable?: StudioTimetableDomain,
): StudioTimetableCapabilities => ({
  multi: {
    enabled:
      timetable?.capabilities?.multi?.enabled ??
      STUDIO_DEFAULT_TIMETABLE_CAPABILITIES.multi.enabled,
  },
  offlineMemo: {
    enabled:
      timetable?.capabilities?.offlineMemo?.enabled ??
      STUDIO_DEFAULT_TIMETABLE_CAPABILITIES.offlineMemo.enabled,
  },
});

export const isStudioTimetableCapabilityEnabled = (
  timetable: StudioTimetableDomain | undefined,
  capabilityKey: StudioTimetableCapabilityKey,
): boolean => getStudioTimetableCapabilities(timetable)[capabilityKey].enabled;

export const getStudioStatusRequiredCapability = (
  statusId: string,
): StudioTimetableCapabilityKey | null => {
  if (statusId === "multi") return "multi";
  if (statusId === "offlineMemo") return "offlineMemo";
  return null;
};

export const isStudioTimetableStatusAvailable = (
  timetable: StudioTimetableDomain | undefined,
  statusId: string,
): boolean => {
  const requiredCapability = getStudioStatusRequiredCapability(statusId);
  if (!requiredCapability) return true;
  return isStudioTimetableCapabilityEnabled(timetable, requiredCapability);
};

export const getStudioAvailableTimetableStatuses = (
  document: StudioTemplateDocument,
): StudioTimetableStatusDefinition[] => {
  const timetable = document.domains?.timetable;
  if (!timetable) return [];

  return Object.values(timetable.statuses).filter((status) =>
    isStudioTimetableStatusAvailable(timetable, status.id),
  );
};
