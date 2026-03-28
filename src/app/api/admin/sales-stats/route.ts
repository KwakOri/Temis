import { requireAdmin } from "@/lib/auth/middleware";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type SalesRow = {
  id: string;
  amount_paid: number;
  paid_at: string;
  status: string;
  template_id: string;
  template_name_snapshot: string;
  artist_names_snapshot: string[] | null;
  plan: { plan: string } | null;
};

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateRange(from?: string | null, to?: string | null) {
  const today = new Date();
  const defaultTo = formatDate(today);
  const defaultFrom = formatDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

  const fromDate = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defaultFrom;
  const toDate = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : defaultTo;

  return { fromDate, toDate };
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);

  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(request.url);
    const { fromDate, toDate } = parseDateRange(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const fromIso = `${fromDate}T00:00:00.000Z`;
    const toIso = `${toDate}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from("template_sales")
      .select(
        `
        id,
        amount_paid,
        paid_at,
        status,
        template_id,
        template_name_snapshot,
        artist_names_snapshot,
        plan:template_plans(plan)
      `
      )
      .gte("paid_at", fromIso)
      .lte("paid_at", toIso)
      .neq("status", "cancelled")
      .order("paid_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data || []) as SalesRow[];
    const grossSales = rows.reduce((sum, row) => sum + (row.amount_paid || 0), 0);
    const salesCount = rows.length;
    const averageOrderValue = salesCount > 0 ? Math.round(grossSales / salesCount) : 0;

    const templateMap = new Map<string, { templateId: string; templateName: string; salesCount: number; revenue: number }>();
    const planMap = new Map<string, { plan: string; salesCount: number; revenue: number }>();
    const artistMap = new Map<string, { artistName: string; salesCount: number; revenue: number }>();
    const dailyMap = new Map<string, { date: string; salesCount: number; revenue: number }>();

    for (const row of rows) {
      const amount = row.amount_paid || 0;
      const templateKey = row.template_id;
      const planKey = row.plan?.plan || "unknown";
      const artistName = row.artist_names_snapshot?.[0] || "미지정";
      const date = row.paid_at.slice(0, 10);

      const templateStat = templateMap.get(templateKey) || {
        templateId: row.template_id,
        templateName: row.template_name_snapshot,
        salesCount: 0,
        revenue: 0,
      };
      templateStat.salesCount += 1;
      templateStat.revenue += amount;
      templateMap.set(templateKey, templateStat);

      const planStat = planMap.get(planKey) || {
        plan: planKey,
        salesCount: 0,
        revenue: 0,
      };
      planStat.salesCount += 1;
      planStat.revenue += amount;
      planMap.set(planKey, planStat);

      const artistStat = artistMap.get(artistName) || {
        artistName,
        salesCount: 0,
        revenue: 0,
      };
      artistStat.salesCount += 1;
      artistStat.revenue += amount;
      artistMap.set(artistName, artistStat);

      const dailyStat = dailyMap.get(date) || {
        date,
        salesCount: 0,
        revenue: 0,
      };
      dailyStat.salesCount += 1;
      dailyStat.revenue += amount;
      dailyMap.set(date, dailyStat);
    }

    return NextResponse.json({
      summary: {
        from: fromDate,
        to: toDate,
        salesCount,
        grossSales,
        averageOrderValue,
      },
      byTemplate: Array.from(templateMap.values()).sort((a, b) => b.revenue - a.revenue),
      byPlan: Array.from(planMap.values()).sort((a, b) => b.revenue - a.revenue),
      byArtist: Array.from(artistMap.values()).sort((a, b) => b.revenue - a.revenue),
      daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error("Sales stats fetch error:", error);
    return NextResponse.json(
      { error: "매출 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

