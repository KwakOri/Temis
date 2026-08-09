import { CustomOrderService } from "@/services/customOrderService";
import { CustomThumbnailOrderService } from "@/services/customThumbnailOrderService";
import type {
  CustomOrderFeedResponse,
  ThumbnailCustomOrderFeedItem,
  TimetableCustomOrderFeedItem,
} from "@/types/customOrderFeed";
import type { CustomOrderWithStatus } from "@/types/customOrder";
import type { ThumbnailCustomOrder } from "@/types/customThumbnailOrder";

const toTimestamp = (value: string) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const toTimetableFeedItem = (
  order: CustomOrderWithStatus,
): TimetableCustomOrderFeedItem => ({
  id: order.id,
  type: "timetable",
  status: order.status,
  title: order.youtube_sns_address || "맞춤형 시간표",
  summary: order.order_requirements,
  priceQuoted: order.price_quoted ?? null,
  depositorName: order.depositor_name ?? null,
  adminNotes: order.admin_notes ?? null,
  deadline: order.deadline ?? null,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  order,
});

const toThumbnailFeedItem = (
  order: ThumbnailCustomOrder,
): ThumbnailCustomOrderFeedItem => ({
  id: order.id,
  type: "thumbnail",
  status: order.status,
  title: order.purpose || "맞춤형 썸네일",
  summary: order.requirements,
  priceQuoted: order.price_quoted,
  depositorName: order.depositor_name,
  adminNotes: order.admin_notes,
  deadline: order.deadline,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  order,
});

export class CustomOrderFeedService {
  static async getHistory(): Promise<CustomOrderFeedResponse> {
    const [timetableResponse, thumbnailResponse] = await Promise.all([
      CustomOrderService.getCustomOrderHistory(),
      CustomThumbnailOrderService.getHistory(),
    ]);

    const orders = [
      ...timetableResponse.orders.map(toTimetableFeedItem),
      ...thumbnailResponse.orders.map(toThumbnailFeedItem),
    ].sort((left, right) =>
      toTimestamp(right.createdAt) - toTimestamp(left.createdAt),
    );

    return { orders };
  }
}
