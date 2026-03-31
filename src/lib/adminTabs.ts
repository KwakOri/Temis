export type AdminTabId =
  | "workCalendar"
  | "customOrders"
  | "purchases"
  | "salesStats"
  | "templates"
  | "artists"
  | "thumbnails"
  | "portfolios"
  | "users"
  | "teams"
  | "teamTemplates"
  | "emailPreview"
  | "access"
  | "settings";

export const ADMIN_DEFAULT_TAB_ID: AdminTabId = "workCalendar";

export const ADMIN_TAB_SEGMENT_BY_ID: Record<AdminTabId, string> = {
  workCalendar: "work-calendar",
  customOrders: "custom-orders",
  purchases: "purchases",
  salesStats: "sales-stats",
  templates: "templates",
  artists: "artists",
  thumbnails: "thumbnails",
  portfolios: "portfolios",
  users: "users",
  teams: "teams",
  teamTemplates: "team-templates",
  emailPreview: "email-preview",
  access: "access",
  settings: "settings",
};

export const ADMIN_TAB_ID_BY_SEGMENT = Object.entries(
  ADMIN_TAB_SEGMENT_BY_ID
).reduce<Record<string, AdminTabId>>((acc, [tabId, segment]) => {
  acc[segment] = tabId as AdminTabId;
  return acc;
}, {});

export const getAdminPathByTabId = (tabId: AdminTabId): string =>
  `/admin/${ADMIN_TAB_SEGMENT_BY_ID[tabId]}`;

export const getAdminTabIdBySegment = (
  segment: string
): AdminTabId | null => ADMIN_TAB_ID_BY_SEGMENT[segment] || null;

export const getAdminTabIdFromQuery = (
  rawTab: string | null | undefined
): AdminTabId | null => {
  if (!rawTab) {
    return null;
  }

  const bySegment = getAdminTabIdBySegment(rawTab);
  if (bySegment) {
    return bySegment;
  }

  if (Object.hasOwn(ADMIN_TAB_SEGMENT_BY_ID, rawTab)) {
    return rawTab as AdminTabId;
  }

  return null;
};
