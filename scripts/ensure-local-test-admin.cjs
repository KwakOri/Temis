#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const LOCAL_TEST_ADMIN_EMAIL = "admin@admin.com";
const LOCAL_TEST_ADMIN_NAME = "Local Test Admin";
const LOCAL_TEST_ADMIN_PASSWORD_HASH =
  "$2b$12$O90HbFXOiOIKIV9syeCP7uYftNAOh3s4QPxPbaDZU.bTjL/mh7lFO";
const PREFERRED_LOCAL_TEST_ADMIN_ID = 9000001;

function ensureLocalTestAdmin(localDbUrl, run = runCommand) {
  if (!localDbUrl || !/^postgres(?:ql)?:\/\//.test(localDbUrl)) {
    throw new Error("A local Postgres connection URL is required.");
  }

  run(
    "psql",
    [
      localDbUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-c",
      buildLocalTestAdminSql(),
    ],
    { captureStdout: true },
  );
}

function buildLocalTestAdminSql() {
  const email = sqlLiteral(LOCAL_TEST_ADMIN_EMAIL);
  const name = sqlLiteral(LOCAL_TEST_ADMIN_NAME);
  const passwordHash = sqlLiteral(LOCAL_TEST_ADMIN_PASSWORD_HASH);

  return `
    BEGIN;

    DO $local_test_admin$
    DECLARE
      v_user_id BIGINT;
      v_email_count BIGINT;
      v_candidate_id BIGINT;
    BEGIN
      SELECT COUNT(*), MIN(id)
      INTO v_email_count, v_user_id
      FROM public.users
      WHERE email = ${email};

      IF v_email_count > 1 THEN
        RAISE EXCEPTION 'Local test admin email is duplicated: %', ${email};
      END IF;

      IF v_user_id IS NULL THEN
        SELECT GREATEST(COALESCE(MAX(id), 0) + 1, ${PREFERRED_LOCAL_TEST_ADMIN_ID})
        INTO v_candidate_id
        FROM public.users;

        WHILE EXISTS (
          SELECT 1 FROM public.users WHERE id = v_candidate_id
        ) LOOP
          v_candidate_id := v_candidate_id + 1;
        END LOOP;

        INSERT INTO public.users (
          id, created_at, updated_at, name, email, password, role
        )
        VALUES (
          v_candidate_id, now(), now(), ${name}, ${email}, ${passwordHash}, 'admin'
        );
      ELSE
        UPDATE public.users
        SET
          name = ${name},
          password = ${passwordHash},
          role = 'admin',
          updated_at = now()
        WHERE id = v_user_id;
      END IF;

      PERFORM setval(
        pg_get_serial_sequence('public.users', 'id'),
        GREATEST((SELECT MAX(id) FROM public.users), 1),
        true
      );
    END
    $local_test_admin$;

    CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
      LANGUAGE plpgsql SECURITY DEFINER
      AS $is_admin_user$
      DECLARE
        current_user_id INTEGER;
        user_email TEXT;
      BEGIN
        current_user_id := public.get_current_user_id();

        IF current_user_id IS NULL THEN
          RETURN FALSE;
        END IF;

        SELECT email
        INTO user_email
        FROM public.users
        WHERE id = current_user_id;

        RETURN user_email IN (
          'admin@temis.com',
          'admin@example.com',
          'admin@admin.com'
        );
      END;
      $is_admin_user$;

    COMMIT;
  `;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.captureStdout ? ["inherit", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(
      `${command} failed: ${`${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim()}`,
    );
  }

  return result.stdout ?? "";
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

module.exports = {
  LOCAL_TEST_ADMIN_EMAIL,
  LOCAL_TEST_ADMIN_NAME,
  LOCAL_TEST_ADMIN_PASSWORD_HASH,
  buildLocalTestAdminSql,
  ensureLocalTestAdmin,
};
