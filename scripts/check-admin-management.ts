import assert from "node:assert/strict";
import {
  getAdminTeamUsage,
  matchesAdminTeamScope,
} from "../src/utils/admin-team-usage";
import {
  getAdminTabIdBySegment,
  getAdminPathByTabId,
  LEGACY_ADMIN_TAB_IDS,
  STUDIO_TEMPLATE_ADMIN_TAB_IDS,
} from "../src/lib/adminTabs";

assert.equal(getAdminTeamUsage(false, false), "unconnected");
assert.equal(getAdminTeamUsage(true, false), "legacy");
assert.equal(getAdminTeamUsage(false, true), "studio");
assert.equal(getAdminTeamUsage(true, true), "mixed");
for (const scope of ["legacy", "studio"] as const) {
  assert.equal(matchesAdminTeamScope(scope, scope), true);
  assert.equal(matchesAdminTeamScope("mixed", scope), true);
  assert.equal(matchesAdminTeamScope("unconnected", scope), true);
  assert.equal(
    matchesAdminTeamScope(scope === "legacy" ? "studio" : "legacy", scope),
    false,
  );
}
for (const usage of ["legacy", "studio", "mixed", "unconnected"] as const) {
  assert.equal(matchesAdminTeamScope(usage, "all"), true);
}
assert.equal(getAdminPathByTabId("studioTeams"), "/admin/studio-teams");
assert.equal(getAdminTabIdBySegment("legacy"), "legacy");
for (const tab of [
  "templates",
  "thumbnails",
  "teams",
  "teamTemplates",
  "legacyTemplateAssets",
] as const) {
  assert.equal(
    getAdminTabIdBySegment(getAdminPathByTabId(tab).split("/")[2]),
    tab,
  );
  assert.equal(LEGACY_ADMIN_TAB_IDS.includes(tab), true);
}
assert.equal(getAdminPathByTabId("studioTemplates"), "/admin/studio-templates");
for (const tab of ["studioTemplates", "templateStudio", "thumbnailStudio", "teamTimetableStudio"] as const) {
  assert.equal(getAdminTabIdBySegment(getAdminPathByTabId(tab).split("/")[2]), tab);
  assert.equal(STUDIO_TEMPLATE_ADMIN_TAB_IDS.includes(tab), true);
  assert.equal(LEGACY_ADMIN_TAB_IDS.includes(tab), false);
}
console.log("Admin team classification and navigation checks passed.");
