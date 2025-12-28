export type TabType =
  | "templates"
  | "thumbnails"
  | "users"
  | "teams"
  | "teamTemplates"
  | "access"
  | "emailPreview"
  | "purchases"
  | "customOrders"
  | "workCalendar"
  | "portfolios"
  | "settings";

export interface AdminTabOrder {
  id: string;
  tab_id: TabType;
  order_index: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateTabOrderRequest {
  orders: {
    tab_id: TabType;
    order_index: number;
    is_visible?: boolean;
  }[];
}
