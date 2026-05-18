import {
  RoyaltySaleItem,
  RoyaltyStatus,
  TemplateSaleRoyaltyDetail,
} from "@/types/admin";

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateRange(from?: string | null, to?: string | null) {
  const today = new Date();
  const defaultTo = formatDate(today);
  const defaultFrom = formatDate(
    new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
  );

  const fromDate = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defaultFrom;
  const toDate = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : defaultTo;

  return {
    fromDate,
    toDate,
    fromIso: `${fromDate}T00:00:00.000Z`,
    toIso: `${toDate}T23:59:59.999Z`,
  };
}

export function parseRoyaltyStatus(
  value?: string | null
): RoyaltyStatus | "all" {
  if (value === "paid" || value === "unpaid") {
    return value;
  }

  return "all";
}

export function parsePagination(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get("page") || "1");
  const rawLimit = Number(searchParams.get("limit") || "50");
  const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 100)
    : 50;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function toRoyaltySaleItem(
  row: TemplateSaleRoyaltyDetail
): RoyaltySaleItem | null {
  if (
    !row.id ||
    !row.template_sale_id ||
    !row.artist_id ||
    !row.artist_name_snapshot ||
    !row.template_id ||
    !row.template_name_snapshot ||
    !row.sale_paid_at ||
    (row.status !== "paid" && row.status !== "unpaid")
  ) {
    return null;
  }

  return {
    id: row.id,
    templateSaleId: row.template_sale_id,
    artistId: row.artist_id,
    artistName: row.artist_name_snapshot,
    templateId: row.template_id,
    templateName: row.template_name_snapshot,
    planName: row.plan_name,
    salePaidAt: row.sale_paid_at,
    saleAmount: row.sale_amount || 0,
    royaltyAmount: row.royalty_amount || 0,
    status: row.status,
    paidAt: row.paid_at,
    depositorName: row.depositor_name,
  };
}
