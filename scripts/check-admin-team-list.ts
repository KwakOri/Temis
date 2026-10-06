import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";
import type { TeamWithMembers } from "../src/types/team-timetable";
import { createAdminTeamManagementService } from "../src/services/server/adminTeamManagementService";

async function main() {
  const teams: TeamWithMembers[] = ["legacy", "studio", "mixed", "unconnected"].map((id) => ({
    id,
    name: id,
    members: [],
    memberCount: 0,
    created_at: null,
    created_by: 1,
    description: null,
    is_active: true,
    updated_at: null,
  }));
  let studioError: { code: string } | null = null;
  let legacyError: { code: string } | null = null;
  let teamsFail = false;
  const db = {
    from(table: string) {
      return {
        select() {
          const studio = table === "team_studio_connections";
          const error = studio ? studioError : legacyError;
          return Promise.resolve({
            error,
            data: error
              ? null
              : [studio ? "studio" : "legacy", "mixed"].map((team_id) => ({
                  team_id,
                })),
          });
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  const service = createAdminTeamManagementService({
    db,
    getAllTeams: async () => {
      if (teamsFail) throw new Error("Team query failed");
      return teams;
    },
  });
  const ids = (result: Awaited<ReturnType<typeof service.list>>) =>
    result.teams.map((team) => team.id);
  assert.deepEqual(ids(await service.list("legacy")), [
    "legacy",
    "mixed",
    "unconnected",
  ]);
  assert.deepEqual(ids(await service.list("studio")), [
    "studio",
    "mixed",
    "unconnected",
  ]);
  assert.equal((await service.list("all")).studioConnectionsAvailable, true);
  for (const code of ["42P01", "PGRST205"]) {
    studioError = { code };
    const legacy = await service.list("legacy");
    assert.equal(legacy.studioConnectionsAvailable, false);
    assert.deepEqual(ids(legacy), ["legacy", "studio", "mixed", "unconnected"]);
    assert.deepEqual(ids(await service.list("studio")), [
      "studio",
      "unconnected",
    ]);
  }
  // Only the absent Studio relation is optional; real failures must remain errors.
  studioError = { code: "42501" };
  await assert.rejects(
    service.list("legacy"),
    (error) => error === studioError,
  );
  studioError = null;
  legacyError = { code: "42P01" };
  await assert.rejects(
    service.list("studio"),
    (error) => error === legacyError,
  );
  legacyError = null;
  teamsFail = true;
  await assert.rejects(service.list("all"), /Team query failed/);
  const empty = createAdminTeamManagementService({ db, getAllTeams: async () => [] });
  assert.deepEqual(await empty.list("studio"), {
    teams: [], studioConnectionsAvailable: true,
  });
  console.log(
    "Admin team list checks passed: scoped lists, missing Studio storage, real errors.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
