import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";

// Isolated fixtures only: never connect to a local or remote database.
process.env.SUPABASE_URL = "http://127.0.0.1:1";
process.env.SUPABASE_SECRET_KEY = "sb_secret_intake_test_fixture";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_intake_test_fixture";
process.env.JWT_SECRET = randomBytes(32).toString("hex");
globalThis.fetch = async () => {
  throw new Error("Unexpected network access in intake regression check");
};

async function main() {
  const { supabaseAdminServer } =
    await import("../src/lib/supabase-admin-server");
  const { signJWT } = await import("../src/lib/auth/jwt");
  const { GET } = await import("../src/app/api/shop/custom-order/intake/route");
  const { POST: submitTimetable } =
    await import("../src/app/api/shop/custom-order/route");
  const { POST: submitThumbnail } =
    await import("../src/app/api/shop/custom-order/thumbnail/route");

  let timetableEnabled = false;
  let thumbnailEnabled = false;
  let pricingEnabled = true;
  let databaseError = false;
  type Row = Record<string, string | boolean>;

  supabaseAdminServer.from = ((table: string) => {
    assert.ok(["admin_options", "price_options"].includes(table));
    let rows: Row[] =
      table === "admin_options"
        ? [
            {
              category: "general",
              value: "custom_timetable_orders",
              is_enabled: timetableEnabled,
            },
            {
              category: "general",
              value: "custom_thumbnail_orders",
              is_enabled: thumbnailEnabled,
            },
          ]
        : [
            {
              id: "fixture-price",
              category: "thumbnail",
              is_enabled: pricingEnabled,
            },
          ];
    const result = () => ({
      data: rows,
      error: databaseError ? new Error("Fixture read failure") : null,
    });
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        rows = rows.filter((row) => row[key] === value);
        return query;
      },
      limit: (count: number) => {
        rows = rows.slice(0, count);
        return query;
      },
      maybeSingle: async () => ({ ...result(), data: rows[0] ?? null }),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
        Promise.resolve(result()).then(resolve),
    };
    return query;
  }) as unknown as typeof supabaseAdminServer.from;

  const token = await signJWT({ userId: 1 });
  const request = () =>
    new NextRequest("http://localhost/api/shop/custom-order", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

  let response = await GET();
  assert.equal(
    response.status,
    200,
    "Status must be available without authentication",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  let status = await response.json();
  assert.equal(status.timetable.accepting, false);
  assert.equal(status.thumbnail.accepting, false);
  assert.equal((await submitTimetable(request())).status, 409);
  assert.equal((await submitThumbnail(request())).status, 409);

  timetableEnabled = true;
  thumbnailEnabled = true;
  status = await (await GET()).json();
  assert.equal(status.timetable.accepting, true);
  assert.equal(status.thumbnail.accepting, true);
  assert.equal(
    (await submitTimetable(request())).status,
    400,
    "Open intake proceeds to payload validation",
  );
  assert.equal((await submitThumbnail(request())).status, 400);

  pricingEnabled = false;
  status = await (await GET()).json();
  assert.equal(
    status.thumbnail.accepting,
    false,
    "Disabled prices must block thumbnail intake",
  );
  assert.equal(status.thumbnail.pricingReady, false);
  assert.equal((await submitThumbnail(request())).status, 409);

  databaseError = true;
  response = await GET();
  assert.equal(
    response.status,
    500,
    "Failed reads must not advertise availability",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  console.log(
    "Custom order intake: closed/open, pricing readiness, submission guards and read failure passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
