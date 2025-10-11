export interface WorkScheduleOrder {
  id: string;
  email_prefix: string;
  deadline: string | null;
  status: "accepted" | "in_progress";
  selected_options?: string; // 내부 주문의 경우에만 존재
  created_at: string;
  source: "internal" | "legacy";
}

export interface WorkScheduleResponse {
  orders: WorkScheduleOrder[];
}

export type DeadlineStatus = "none" | "overdue" | "urgent" | "normal";
