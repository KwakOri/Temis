/**
 * Thumbnail order status/access contract guard.
 *
 * The database migration is intentionally applied separately from the app. This
 * read-only source check keeps the API and UI from silently regressing to the
 * old one-to-one/result-template behavior while local or remote DB checks are
 * unavailable.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const migration = read(
  "supabase/migrations/20260829020000_decouple_thumbnail_order_status_and_grants.sql",
);
const statusRoute = read("src/app/api/admin/custom-orders/thumbnail/[id]/route.ts");
const completeRoute = read(
  "src/app/api/admin/custom-orders/thumbnail/[id]/complete/route.ts",
);
const revokeRoute = read(
  "src/app/api/admin/custom-orders/thumbnail/[id]/grants/[grantId]/revoke/route.ts",
);
const orderModal = read("src/components/admin/ThumbnailOrderDetailModal.tsx");

assert.match(
  migration,
  /CREATE TABLE IF NOT EXISTS public\.custom_thumbnail_order_template_grants/,
  "Per-order grant history table is missing.",
);
assert.match(
  migration,
  /custom_thumbnail_order_template_grants_active_key[\s\S]*WHERE revoked_at IS NULL/,
  "Active order/template grants must be unique.",
);
assert.match(
  migration,
  /DROP CONSTRAINT IF EXISTS custom_thumbnail_orders_completed_consistency_check/,
  "Completed status must not require a result template/access row.",
);
assert.doesNotMatch(
  migration,
  /user_id\s*<>\s*v_order\.user_id/,
  "Completion still contains the old one-to-one customer guard.",
);
assert.match(
  migration,
  /status = 'completed'[\s\S]*custom_thumbnail_order_template_grants/,
  "Completion must update status and record a grant in one transaction.",
);
assert.match(
  migration,
  /revoke_custom_thumbnail_order_template_grant[\s\S]*revoked_at = now\(\)/,
  "Explicit grant revocation is missing.",
);
assert.match(
  migration,
  /template_plan_id IS NULL[\s\S]*template_purchase_requests/,
  "Purchase-derived access must be protected from order-grant revocation.",
);

assert.match(statusRoute, /if \(status !== undefined\) updateData\.status = status;/);
assert.doesNotMatch(
  statusRoute,
  /썸네일 주문 완료는 결과 템플릿을 검증하는 전용 action/,
  "Status changes must allow completed as a normal workflow state.",
);
assert.match(completeRoute, /resultTemplateId/);
assert.match(completeRoute, /grant: data\.grant/);
assert.match(revokeRoute, /revoke_custom_thumbnail_order_template_grant/);

for (const expected of [
  'value: "completed"',
  "template_grants",
  "템플릿 추가 부여",
  "권한 부여 완료",
  "회수",
]) {
  assert.ok(
    orderModal.includes(expected),
    `Order detail UI contract is missing: ${expected}`,
  );
}

console.log("Thumbnail order status/grant contract checks passed.");
