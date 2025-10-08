import { Tables } from "./supabase";

// Base types from Supabase
export type User = Tables<"users">;
export type Template = Tables<"templates">;
export type TemplateProduct = Tables<"template_products">;
export type PurchaseRequest = Tables<"purchase_requests">;
export type TemplateAccess = Tables<"template_access">;

// Extended types
export interface TemplateWithProducts extends Template {
  template_products: TemplateProduct[];
}

export interface PurchaseRequestWithTemplate extends PurchaseRequest {
  template?: Template | null;
}

export interface TemplateAccessWithUser extends TemplateAccess {
  user?: User;
  template?: Template;
}

// Pagination
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// User Management
export interface GetUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface GetUsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

// Template Management
export interface CreateTemplateData {
  name: string;
  description: string;
  detailed_description?: string;
  thumbnail_url?: string;
  is_public: boolean;
}

export interface UpdateTemplateData {
  is_public?: boolean;
  is_shop_visible?: boolean;
  thumbnail_url?: string;
}

export interface CreateTemplateProductData {
  template_id: string;
  title: string;
  price: number;
  features: string[];
  requirements?: string;
  purchase_instructions?: string;
  plan?: "lite" | "pro";
  is_artist?: boolean;
  is_memo?: boolean;
  is_multi_schedule?: boolean;
  is_guerrilla?: boolean;
  is_offline_memo?: boolean;
}

export interface UpdateTemplateProductData {
  title?: string;
  price?: number;
  features?: string[];
  requirements?: string;
  purchase_instructions?: string;
  plan?: "lite" | "pro";
  is_artist?: boolean;
  is_memo?: boolean;
  is_multi_schedule?: boolean;
  is_guerrilla?: boolean;
  is_offline_memo?: boolean;
}

// Template Plan Management
export interface TemplatePlan {
  id: string;
  template_id: string;
  plan: "lite" | "pro";
  is_artist: boolean;
  is_memo: boolean;
  is_multi_schedule: boolean;
  is_guerrilla: boolean;
  is_offline_memo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplatePlanData {
  template_id: string;
  plan: "lite" | "pro";
  is_artist: boolean;
  is_memo: boolean;
  is_multi_schedule: boolean;
  is_guerrilla: boolean;
  is_offline_memo: boolean;
}

export interface UpdateTemplatePlanData {
  is_artist?: boolean;
  is_memo?: boolean;
  is_multi_schedule?: boolean;
  is_guerrilla?: boolean;
  is_offline_memo?: boolean;
}

// Custom Order Management
export interface FileData {
  id: string;
  file_key: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_category: "character_image" | "reference";
  created_at: string;
}

export interface CustomOrder {
  id: string;
  user_id: number;
  youtube_sns_address: string;
  email_discord: string;
  order_requirements: string;
  has_character_images: boolean;
  wants_omakase: boolean;
  design_keywords: string | null;
  selected_options: string[] | null;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  price_quoted?: number;
  depositor_name?: string;
  admin_notes?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomOrderWithUser extends CustomOrder {
  users: {
    id: number;
    name: string;
    email: string;
  };
  files: FileData[];
}

export interface LegacyOrder {
  id: string;
  email: string;
  nickname: string;
  customer_email: string;
  customer_name: string;
  order_requirements: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  admin_notes?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface GetCustomOrdersParams {
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GetCustomOrdersResponse {
  orders: CustomOrderWithUser[];
  pagination: PaginationInfo;
}

export interface UpdateCustomOrderData {
  status?: string;
  admin_notes?: string;
  price_quoted?: number;
  deadline?: string;
}

export interface CalendarOrder {
  id: string;
  title: string;
  start: string;
  end?: string;
  status: string;
  type?: "custom" | "legacy";
}

export interface GetCalendarResponse {
  orders: CustomOrderWithUser[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Purchase Management
export interface GrantTemplateAccessData {
  template_id: string;
  user_id: number;
  access_level: "read" | "write" | "admin";
  template_plan_id?: string; // Reference to specific plan (lite/pro) user has access to
}

export interface SendAccessGrantedEmailData {
  email: string;
  userName: string;
  templateName: string;
}

// Work Schedule Management
export interface AdminWorkScheduleOrder {
  id: string;
  customer_email: string;
  order_status: string;
  created_at: string;
  updated_at: string;
  // Add other fields as needed
}

export interface GetWorkScheduleResponse {
  orders: AdminWorkScheduleOrder[];
}

// Migration Management
export interface MigrationStatus {
  totalOrders: number;
  ordersWithFiles: number;
  migratedOrders: number;
  needsMigration: number;
}

export interface MigrationResult {
  migratedCount: number;
  message: string;
}

// File Management
export interface FileData {
  id: string;
  filename: string;
  size: number;
  mimetype: string;
  created_at: string;
  // Add other fields as needed
}

export interface GetFilesData {
  fileIds: string[];
}

export interface GetFilesResponse {
  files: FileData[];
}

export interface DownloadZipData {
  fileIds: string[];
}

// Email Management
export interface EmailTestResponse {
  message: string;
  config: object;
}

export interface SendTestEmailData {
  to: string;
}

export interface SendTestEmailResponse {
  messageId: string;
}

// Access Management
export interface GetTemplateAccessParams {
  templateId: string;
}

export interface GetTemplateAccessResponse {
  accessList: TemplateAccessWithUser[];
}

export interface TemplateAccessData {
  templateId: string;
  userId: number;
  accessLevel: "read" | "write" | "admin";
}

export interface RevokeAccessParams {
  templateId: string;
  userId: number;
}
