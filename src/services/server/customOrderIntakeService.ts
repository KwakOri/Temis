import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import type { CustomOrderIntakeStatus } from "@/types/customOrderIntake";

export async function getTimetableOrderIntakeStatus(): Promise<CustomOrderIntakeStatus> {
  const { data, error } = await supabaseAdminServer
    .from("admin_options")
    .select("is_enabled")
    .eq("category", "general")
    .eq("value", "custom_timetable_orders")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const accepting = Boolean(data?.is_enabled);
  return {
    accepting,
    message: accepting
      ? "시간표 주문제작 신청이 가능합니다."
      : "현재 시간표 주문제작 접수가 마감되었습니다.",
  };
}
