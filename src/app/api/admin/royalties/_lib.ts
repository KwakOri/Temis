import {
  RoyaltyBatchStatus,
  RoyaltyRuleType,
  RoyaltySaleItem,
  RoyaltySettlementBatch,
  RoyaltySettlementBatchItem,
  RoyaltySource,
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

export function parseRoyaltyBatchStatus(
  value?: string | null
): RoyaltyBatchStatus | "all" {
  if (value === "draft" || value === "paid" || value === "cancelled") {
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

export function parseRoyaltyRuleInput(body: {
  royaltyType?: unknown;
  royaltyValue?: unknown;
}) {
  const royaltyType = body.royaltyType;
  const royaltyValue = body.royaltyValue;

  if (royaltyType === null || royaltyValue === null) {
    return { deleteRule: true as const };
  }

  if (royaltyType !== "fixed" && royaltyType !== "percentage") {
    return {
      error: "royaltyType은 fixed 또는 percentage만 가능합니다.",
    } as const;
  }

  const numericValue =
    typeof royaltyValue === "number" ? royaltyValue : Number(royaltyValue);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return { error: "royaltyValue는 0 이상의 숫자여야 합니다." } as const;
  }

  if (royaltyType === "percentage" && numericValue > 100) {
    return { error: "비율 로열티는 100%를 초과할 수 없습니다." } as const;
  }

  return {
    deleteRule: false as const,
    royaltyType: royaltyType as RoyaltyRuleType,
    royaltyValue: Math.round(numericValue * 100) / 100,
  };
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
    royaltySource: parseRoyaltySource(row.royalty_source),
    royaltyRuleId: row.royalty_rule_id,
    royaltyTypeSnapshot: parseRoyaltyRuleType(row.royalty_type_snapshot),
    royaltyValueSnapshot: row.royalty_value_snapshot,
    settlementBatchId: row.settlement_batch_id,
    settlementBatchTitle: row.settlement_batch_title,
    settlementBatchStatus: parseRoyaltyBatchStatusValue(
      row.settlement_batch_status
    ),
  };
}

export function toRoyaltySettlementBatchItem(
  row: RoyaltySettlementBatch
): RoyaltySettlementBatchItem {
  return {
    id: row.id,
    settlementMonth: row.settlement_month,
    periodFrom: row.period_from,
    periodTo: row.period_to,
    title: row.title,
    status: parseRoyaltyBatchStatusValue(row.status) || "paid",
    totalAmount: row.total_amount,
    totalCount: row.total_count,
    paidAt: row.paid_at,
    paidBy: row.paid_by,
    createdAt: row.created_at,
  };
}

function parseRoyaltySource(value: string | null): RoyaltySource {
  if (
    value === "artist" ||
    value === "template" ||
    value === "manual" ||
    value === "missing"
  ) {
    return value;
  }

  return "missing";
}

function parseRoyaltyRuleType(value: string | null): RoyaltyRuleType | null {
  if (value === "fixed" || value === "percentage") {
    return value;
  }

  return null;
}

function parseRoyaltyBatchStatusValue(
  value: string | null
): RoyaltyBatchStatus | null {
  if (value === "draft" || value === "paid" || value === "cancelled") {
    return value;
  }

  return null;
}
