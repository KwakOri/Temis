#!/usr/bin/env tsx
/**
 * 01단계 canonical DB schema 검증.
 *
 * 실제 local PostgREST에서 필수 컬럼을 select해 migration 적용 여부를 확인하고,
 * 승인 RPC가 설치되어 있는지 무작위 request probe로 확인한다. unique 제약의
 * 동작 검증과 fixture/API 검증은 check-user-template-ui-baseline.ts가 담당한다.
 */

import { randomUUID } from "node:crypto";

import { supabaseAdminServer } from "../src/lib/supabase-admin-server";

interface DbError {
  code?: string;
  message: string;
}

interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

type SchemaQuery = PromiseLike<DbResult<unknown>> & {
  limit(count: number): SchemaQuery;
  select(columns?: string): SchemaQuery;
};

type SchemaClient = {
  from(table: string): SchemaQuery;
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<DbResult<unknown>>;
};

const db = supabaseAdminServer as unknown as SchemaClient;

const REQUIRED_SCHEMAS: Array<{ table: string; columns: string[] }> = [
  {
    table: "templates",
    columns: [
      "id",
      "name",
      "thumbnail_url",
      "is_public",
      "template_engine",
      "template_kind",
      "status",
      "created_by",
    ],
  },
  {
    table: "template_access",
    columns: [
      "id",
      "template_id",
      "user_id",
      "access_level",
      "granted_at",
      "granted_by",
      "template_plan_id",
    ],
  },
  {
    table: "template_studio_documents",
    columns: [
      "id",
      "template_id",
      "document_version",
      "document",
      "runtime_values",
      "published_revision_no",
    ],
  },
  {
    table: "template_studio_document_revisions",
    columns: [
      "id",
      "template_id",
      "revision_no",
      "document_version",
      "document",
      "runtime_values",
      "source",
      "created_by",
    ],
  },
  {
    table: "template_studio_document_drafts",
    columns: [
      "id",
      "template_id",
      "user_id",
      "document_version",
      "document",
      "runtime_values",
      "base_revision_no",
      "is_autosave",
    ],
  },
  {
    table: "template_studio_assets",
    columns: [
      "id",
      "template_id",
      "asset_id",
      "storage_provider",
      "storage_path",
      "public_url",
      "content_hash",
      "mime_type",
      "width",
      "height",
      "byte_size",
      "created_by",
      "last_synced_at",
    ],
  },
  {
    table: "template_studio_user_states",
    columns: [
      "id",
      "template_id",
      "user_id",
      "base_revision_no",
      "runtime_values",
      "version",
      "created_at",
      "updated_at",
    ],
  },
  {
    table: "shop_templates",
    columns: ["id", "template_id", "is_shop_visible"],
  },
  {
    table: "template_purchase_requests",
    columns: ["id", "template_id", "user_id", "plan_id", "status"],
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertLocalSupabaseUrl(): void {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  assert(
    supabaseUrl.startsWith("http://127.0.0.1:") ||
      supabaseUrl.startsWith("http://localhost:"),
    "Refusing to run the 01 schema check against a non-local Supabase URL.",
  );
}

async function main(): Promise<void> {
  assertLocalSupabaseUrl();
  console.log("01단계 canonical DB schema 검증 시작");

  for (const schema of REQUIRED_SCHEMAS) {
    const result = await db
      .from(schema.table)
      .select(schema.columns.join(","))
      .limit(0);
    assert(
      !result.error,
      `${schema.table} schema check failed: ${result.error?.message ?? "unknown error"}`,
    );
    console.log(`✅ ${schema.table}: ${schema.columns.length}개 핵심 컬럼`);
  }

  const rpcProbe = await db.rpc("approve_template_purchase_request", {
    p_request_id: randomUUID(),
    p_admin_id: 9190101,
  });
  assert(
    rpcProbe.error,
    "Approval RPC probe unexpectedly succeeded for a random request.",
  );
  const rpcError = `${rpcProbe.error.code ?? ""} ${rpcProbe.error.message}`;
  assert(
    !/pgrst202|function .*approve_template_purchase_request|could not find the function/i.test(
      rpcError,
    ),
    `approve_template_purchase_request is not installed: ${rpcError}`,
  );
  console.log("✅ approve_template_purchase_request RPC installed");
  console.log("DB schema 검증 통과");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
