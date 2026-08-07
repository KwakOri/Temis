export type ThumbnailCustomOrderStatus =
  "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

export type ThumbnailOrderFileRole = "source" | "reference" | "deliverable";

export interface ThumbnailCanvas4K {
  width: 3840;
  height: 2160;
}

export interface ThumbnailCustomOrderFormData {
  kind: "thumbnail";
  contact: string;
  purpose: string;
  requirements: string;
  textRequirements: string;
  imageRequirements: string;
  designKeywords: string;
  canvas: ThumbnailCanvas4K;
  requestedDeadline?: string;
  portfolioConsent: boolean;
  depositorName: string;
  sourceFileIds: string[];
  referenceFileIds: string[];
  orderId?: string;
}

export interface ThumbnailCustomOrderFile {
  id: string;
  order_id: string;
  file_id: string;
  role: ThumbnailOrderFileRole;
  created_at: string;
  file?: {
    id: string;
    file_key: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    created_at: string | null;
  } | null;
}

export interface ThumbnailCustomOrder {
  id: string;
  user_id: number;
  status: ThumbnailCustomOrderStatus;
  price_quoted: number | null;
  depositor_name: string | null;
  contact: string;
  purpose: string;
  requirements: string;
  text_requirements: string | null;
  image_requirements: string | null;
  design_keywords: string | null;
  canvas_width: 3840;
  canvas_height: 2160;
  portfolio_consent: boolean;
  requested_deadline: string | null;
  deadline: string | null;
  result_template_id: string | null;
  admin_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  files?: ThumbnailCustomOrderFile[];
  users?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ThumbnailCustomOrderHistoryResponse {
  orders: ThumbnailCustomOrder[];
}

export interface SubmitThumbnailCustomOrderResponse {
  success: boolean;
  orderId?: string;
  error?: string;
}

export interface ThumbnailEstimatedDeadlineResponse {
  accepting: boolean;
  latestDeadline: string | null;
  estimatedDeadline: string | null;
  timezone: "Asia/Seoul";
  weekdays: [0, 4];
  message: string;
}

export interface UpdateThumbnailCustomOrderData {
  orderId?: string;
  contact?: string;
  purpose?: string;
  requirements?: string;
  textRequirements?: string;
  imageRequirements?: string;
  designKeywords?: string;
  requestedDeadline?: string | null;
  portfolioConsent?: boolean;
  depositorName?: string;
  sourceFileIds?: string[];
  referenceFileIds?: string[];
}

export interface AdminUpdateThumbnailCustomOrderData {
  status?: ThumbnailCustomOrderStatus;
  adminNotes?: string;
  priceQuoted?: number | null;
  deadline?: string | null;
}

export interface ThumbnailCustomOrdersResponse {
  orders: ThumbnailCustomOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompleteThumbnailCustomOrderResponse {
  success: boolean;
  order: ThumbnailCustomOrder;
  access: {
    id: string;
    template_id: string;
    user_id: number;
    access_level: string;
    granted_by: number;
    granted_at: string;
    template_plan_id: string | null;
  };
}
