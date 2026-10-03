/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const directory = mkdtempSync(path.join(os.tmpdir(), "temis-legacy-pg-"));
const data = path.join(directory, "data");
const docker = process.argv.includes("--docker");
function run(command, args, input) {
  const result = spawnSync(command, args, { input, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}
try {
  if (!docker) {
    run("initdb", [
      "-D",
      data,
      "--auth=trust",
      "--no-locale",
      "-U",
      "postgres",
    ]);
    run("pg_ctl", [
      "-D",
      data,
      "-l",
      path.join(directory, "postgres.log"),
      "-o",
      `-k ${directory} -h '' -p 55439`,
      "-w",
      "start",
    ]);
  }
  const sql = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE public.users(id integer PRIMARY KEY);
CREATE TABLE public.templates(id uuid PRIMARY KEY);
CREATE TABLE public.team_templates(id uuid PRIMARY KEY);
CREATE TABLE public.thumbnails(id uuid PRIMARY KEY);
INSERT INTO users VALUES(1);
INSERT INTO templates VALUES('00000000-0000-4000-8000-000000000001');
INSERT INTO team_templates VALUES('00000000-0000-4000-8000-000000000001');
${readFileSync(path.join(__dirname, "../supabase/migrations/20261004000000_create_legacy_template_assets.sql"), "utf8")}
DO $$ DECLARE a uuid; b uuid; v uuid; foreign_v uuid; r uuid; restored uuid;
BEGIN
 INSERT INTO legacy_template_asset_sets(template_id,expected_slots) VALUES('00000000-0000-4000-8000-000000000001','{"first":["profileBG","onlineCard"]}') RETURNING id INTO a;
 INSERT INTO legacy_template_asset_sets(team_template_id,expected_slots) VALUES('00000000-0000-4000-8000-000000000001','{"first":["profileBG"]}') RETURNING id INTO b;
 INSERT INTO legacy_template_asset_versions(asset_set_id,asset_id,content_hash,storage_path,mime_type,byte_size,width,height,original_filename)
 VALUES(a,repeat('a',64),repeat('b',64),'legacy-template-assets/local/a.png','image/png',100,1,1,'camelName.PNG') RETURNING id INTO v;
 INSERT INTO legacy_template_asset_versions(asset_set_id,asset_id,content_hash,storage_path,mime_type,byte_size,width,height,original_filename)
 VALUES(b,repeat('a',64),repeat('b',64),'legacy-template-assets/local/b.png','image/png',100,1,1,'camelName.PNG') RETURNING id INTO foreign_v;
 r := apply_legacy_template_asset_revision(a,NULL,jsonb_build_object('first',jsonb_build_object('profileBG',v,'onlineCard',v)),1,'initial','local');
 BEGIN PERFORM apply_legacy_template_asset_revision(a,NULL,jsonb_build_object('first',jsonb_build_object('profileBG',v,'onlineCard',v)),1);
   RAISE EXCEPTION 'conflict was accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM apply_legacy_template_asset_revision(a,r,jsonb_build_object('first',jsonb_build_object('profileBG',foreign_v,'onlineCard',v)),1);
   RAISE EXCEPTION 'foreign version was accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM apply_legacy_template_asset_revision(a,r,jsonb_build_object('first',jsonb_build_object('profileBG',v)),1);
   RAISE EXCEPTION 'missing slot was accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 restored := apply_legacy_template_asset_revision(a,r,jsonb_build_object('first',jsonb_build_object('profileBG',v,'onlineCard',v)),1,'restore');
 IF restored = r OR (SELECT count(*) FROM legacy_template_asset_revisions WHERE asset_set_id=a) <> 2 THEN RAISE EXCEPTION 'history overwritten'; END IF;
 BEGIN UPDATE legacy_template_asset_sets SET active_revision_id=restored WHERE id=b;
   RAISE EXCEPTION 'foreign active revision was accepted'; EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 IF has_table_privilege('anon','legacy_template_asset_sets','SELECT') OR has_table_privilege('authenticated','legacy_template_asset_versions','INSERT') OR has_table_privilege('service_role','legacy_template_asset_versions','UPDATE') OR has_function_privilege('anon','apply_legacy_template_asset_revision(uuid,uuid,jsonb,integer,text,text)','EXECUTE') THEN RAISE EXCEPTION 'unsafe privileges'; END IF;
END $$;
`;
  if (docker) {
    run(
      "docker",
      [
        "run",
        "--rm",
        "-i",
        "--network",
        "none",
        "--cpus",
        "1",
        "--memory",
        "512m",
        "--user",
        "postgres",
        "--entrypoint",
        "bash",
        "public.ecr.aws/supabase/postgres:17.6.1.127",
        "-c",
        "set -e\ninitdb -D /tmp/legacy-assets-pg --auth=trust --no-locale -U postgres >/dev/null\npg_ctl -D /tmp/legacy-assets-pg -l /tmp/legacy-assets-pg.log -o \"-k /tmp -h '' -p 55439\" -w start >/dev/null\npsql -h /tmp -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1",
      ],
      sql,
    );
  } else
    run(
      "psql",
      [
        "-h",
        directory,
        "-p",
        "55439",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      sql,
    );
  console.log(
    "Legacy asset DB checks passed in isolated temporary PostgreSQL: typed ownership, complete slots, optimistic conflicts, foreign-version rejection, append-only restore and privileges.",
  );
} finally {
  if (!docker)
    spawnSync("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"], {
      stdio: "ignore",
    });
  rmSync(directory, { recursive: true, force: true });
}
