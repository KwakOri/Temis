export type AdminTeamScope = "all" | "legacy" | "studio";
export type AdminTeamUsage = "legacy" | "studio" | "mixed" | "unconnected";

export function getAdminTeamUsage(
  hasLegacy: boolean,
  hasStudio: boolean,
): AdminTeamUsage {
  return hasLegacy
    ? hasStudio
      ? "mixed"
      : "legacy"
    : hasStudio
      ? "studio"
      : "unconnected";
}

export function matchesAdminTeamScope(
  usage: AdminTeamUsage,
  scope: AdminTeamScope,
) {
  return (
    scope === "all" ||
    usage === scope ||
    usage === "mixed" ||
    usage === "unconnected"
  );
}
