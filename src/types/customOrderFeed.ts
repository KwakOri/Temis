import type { CustomOrderWithStatus } from "@/types/customOrder";
import type {
  ThumbnailCustomOrder,
  ThumbnailCustomOrderStatus,
} from "@/types/customThumbnailOrder";

export type CustomOrderKind = "timetable" | "thumbnail";
export type CustomOrderFeedStatus =
  | CustomOrderWithStatus["status"]
  | ThumbnailCustomOrderStatus;

interface CustomOrderFeedBase {
  id: string;
  type: CustomOrderKind;
  status: CustomOrderFeedStatus;
  title: string;
  summary: string;
  priceQuoted: number | null;
  depositorName: string | null;
  adminNotes: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TimetableCustomOrderFeedItem = CustomOrderFeedBase & {
  type: "timetable";
  order: CustomOrderWithStatus;
};

export type ThumbnailCustomOrderFeedItem = CustomOrderFeedBase & {
  type: "thumbnail";
  order: ThumbnailCustomOrder;
};

export type CustomOrderFeedItem =
  | TimetableCustomOrderFeedItem
  | ThumbnailCustomOrderFeedItem;

export interface CustomOrderFeedResponse {
  orders: CustomOrderFeedItem[];
}
