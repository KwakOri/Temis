import { Tables, TablesInsert, TablesUpdate } from "./supabase";

// Base types from Supabase
export type User = Tables<"users">;
export type Template = Tables<"templates">;
export type Thumbnail = Tables<"thumbnails">;
export type ShopTemplate = Tables<"shop_templates">;
export type TemplatePlan = Tables<"template_plans">;
export type PurchaseRequest = Tables<"purchase_requests">;
export type TemplatePurchaseRequest = Tables<"template_purchase_requests">;
export type TemplateAccess = Tables<"template_access">;
export type Artist = Tables<"artists">;
export type TemplateArtist = Tables<"template_artists">;
export type TemplateSale = Tables<"template_sales">;
export type TemplateSaleRoyalty = Tables<"template_sale_royalties">;
export type TemplateSaleRoyaltyDetail = Tables<"template_sale_royalty_details">;
export type ArtistRoyaltyRule = Tables<"artist_royalty_rules">;
export type RoyaltySettlementBatch = Tables<"royalty_settlement_batches">;

// Extended types
export interface TemplateWithShopTemplate extends Template {
  shop_templates: ShopTemplate[];
}

export interface TemplateArtistWithArtist extends TemplateArtist {
  artist?: Artist | null;
}

export interface ArtistWithLinkedUser extends Artist {
  linked_user?: Pick<User, "id" | "name" | "email"> | null;
}

export interface TemplateWithShopTemplateAndPlans extends Template {
  shop_templates: ShopTemplate[];
  template_plans: TemplatePlan[];
  template_artists?: TemplateArtistWithArtist[];
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
  name?: string;
  description?: string;
  detailed_description?: string;
  is_public?: boolean;
  is_shop_visible?: boolean;
  thumbnail_url?: string;
}

// Thumbnail Management (same structure as Template)
export interface CreateThumbnailData {
  name: string;
  description: string;
  detailed_description?: string;
  thumbnail_url?: string;
  is_public: boolean;
}

export interface UpdateThumbnailData {
  is_public?: boolean;
  is_shop_visible?: boolean;
  thumbnail_url?: string;
}

export type CreateShopTemplateData = TablesInsert<"shop_templates">;

export type UpdateShopTemplateData = TablesUpdate<"shop_templates">;

// Template Plan Management (types already defined at top from Supabase)
export type CreateTemplatePlanData = TablesInsert<"template_plans">;
export type UpdateTemplatePlanData = TablesUpdate<"template_plans">;

// Template Purchase Request Management (types already defined at top from Supabase)
export type CreateTemplatePurchaseRequestData = TablesInsert<"template_purchase_requests">;
export type UpdateTemplatePurchaseRequestData = TablesUpdate<"template_purchase_requests">;

export interface TemplatePurchaseRequestWithRelations extends TemplatePurchaseRequest {
  template?: Template | null;
  template_plan?: TemplatePlan | null;
  user?: Pick<User, 'id' | 'name' | 'email'> | null;
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

// Artist Management
export type CreateArtistData = Omit<
  TablesInsert<"artists">,
  "id" | "created_at" | "updated_at"
>;
export type UpdateArtistData = TablesUpdate<"artists">;

export interface TemplateArtistInput {
  artist_id: string;
  role?: string;
  is_primary?: boolean;
  display_order?: number;
}

// Sales Statistics
export interface SalesSummary {
  from: string;
  to: string;
  salesCount: number;
  grossSales: number;
  averageOrderValue: number;
}

export interface SalesByTemplate {
  templateId: string;
  templateName: string;
  salesCount: number;
  revenue: number;
}

export interface SalesByPlan {
  plan: string;
  salesCount: number;
  revenue: number;
}

export interface SalesByArtist {
  artistName: string;
  salesCount: number;
  revenue: number;
}

export interface DailySalesPoint {
  date: string;
  salesCount: number;
  revenue: number;
}

export interface AdminSalesStatsResponse {
  summary: SalesSummary;
  byTemplate: SalesByTemplate[];
  byPlan: SalesByPlan[];
  byArtist: SalesByArtist[];
  daily: DailySalesPoint[];
}

// Artist Royalty Settlement
export type RoyaltyStatus = "unpaid" | "paid";
export type RoyaltyRuleType = "fixed" | "percentage";
export type RoyaltySource = "artist" | "template" | "manual" | "missing";
export type RoyaltyBatchStatus = "draft" | "paid" | "cancelled";

export interface RoyaltySummary {
  from: string;
  to: string;
  unpaidRoyaltyAmount: number;
  paidRoyaltyAmount: number;
  unpaidCount: number;
  paidCount: number;
  missingRuleCount?: number;
}

export interface RoyaltyByArtist {
  artistId: string;
  artistName: string;
  salesCount: number;
  grossSales: number;
  unpaidRoyaltyAmount: number;
  paidRoyaltyAmount: number;
  unpaidCount: number;
  paidCount: number;
  missingRuleCount?: number;
}

export interface DailyRoyaltyPoint {
  date: string;
  royaltyAmount: number;
  royaltyCount: number;
  missingRuleCount: number;
}

export interface AdminRoyaltySummaryResponse {
  summary: RoyaltySummary;
  byArtist: RoyaltyByArtist[];
  daily?: DailyRoyaltyPoint[];
}

export interface RoyaltySaleItem {
  id: string;
  templateSaleId: string;
  artistId: string;
  artistName: string;
  templateId: string;
  templateName: string;
  planName: string | null;
  salePaidAt: string;
  saleAmount: number;
  royaltyAmount: number;
  status: RoyaltyStatus;
  paidAt: string | null;
  depositorName: string | null;
  royaltySource: RoyaltySource;
  royaltyRuleId: string | null;
  royaltyTypeSnapshot: RoyaltyRuleType | null;
  royaltyValueSnapshot: number | null;
  settlementBatchId: string | null;
  settlementBatchTitle: string | null;
  settlementBatchStatus: RoyaltyBatchStatus | null;
}

export interface GetRoyaltySalesParams {
  from?: string;
  to?: string;
  artistId?: string;
  templateId?: string;
  status?: RoyaltyStatus | "all";
  page?: number;
  limit?: number;
}

export interface GetRoyaltySalesResponse {
  royalties: RoyaltySaleItem[];
  pagination: PaginationInfo;
}

export interface UpdateRoyaltyData {
  status?: RoyaltyStatus;
  royaltyAmount?: number;
}

export interface MarkRoyaltiesPaidData {
  royaltyIds?: string[];
  from?: string;
  to?: string;
  artistIds?: string[];
  templateId?: string;
  settlementMonth?: string;
  title?: string;
  rejectMissingRules?: boolean;
}

export interface MarkRoyaltiesPaidResponse {
  updatedCount: number;
  totalAmount?: number;
  batchId?: string;
  batchTitle?: string;
}

export interface RoyaltySettlementBatchItem {
  id: string;
  settlementMonth: string;
  periodFrom: string;
  periodTo: string;
  title: string;
  status: RoyaltyBatchStatus;
  totalAmount: number;
  totalCount: number;
  paidAt: string | null;
  paidBy: number | null;
  createdAt: string;
}

export interface GetRoyaltyBatchesParams {
  from?: string;
  to?: string;
  status?: RoyaltyBatchStatus | "all";
  page?: number;
  limit?: number;
}

export interface GetRoyaltyBatchesResponse {
  batches: RoyaltySettlementBatchItem[];
  pagination: PaginationInfo;
}

export interface GetRoyaltyBatchResponse {
  batch: RoyaltySettlementBatchItem;
  royalties: RoyaltySaleItem[];
}

export interface RoyaltyStatementSummary {
  month: string;
  settlementMonth: string;
  periodFrom: string | null;
  periodTo: string | null;
  batchCount: number;
  artistCount: number;
  salesCount: number;
  grossSales: number;
  royaltyAmount: number;
  paidAt: string | null;
}

export interface RoyaltyStatementArtist {
  artistId: string;
  artistName: string;
  salesCount: number;
  grossSales: number;
  royaltyAmount: number;
}

export interface GetRoyaltyStatementParams {
  month?: string;
  artistId?: string;
}

export interface GetRoyaltyStatementResponse {
  summary: RoyaltyStatementSummary;
  artists: RoyaltyStatementArtist[];
  batches: RoyaltySettlementBatchItem[];
  royalties: RoyaltySaleItem[];
}

export interface RecalculateRoyaltiesData {
  royaltyIds?: string[];
  from?: string;
  to?: string;
  artistIds?: string[];
  templateId?: string;
  includePaid?: boolean;
  includeManual?: boolean;
}

export interface RecalculateRoyaltiesResponse {
  updatedCount: number;
}

export interface RoyaltySettlementRunArtist {
  artistId: string;
  artistName: string;
  salesCount: number;
  grossSales: number;
  royaltyAmount: number;
  missingRuleCount: number;
  royalties: RoyaltySaleItem[];
}

export interface RoyaltySettlementRunSummary {
  month: string;
  periodFrom: string;
  periodTo: string;
  artistCount: number;
  salesCount: number;
  grossSales: number;
  royaltyAmount: number;
  missingRuleCount: number;
}

export interface AdminRoyaltySettlementRunResponse {
  summary: RoyaltySettlementRunSummary;
  artists: RoyaltySettlementRunArtist[];
}

export interface RoyaltyRuleInput {
  royaltyType: RoyaltyRuleType | null;
  royaltyValue: number | null;
}

export interface ArtistRoyaltySettingsItem {
  artistId: string;
  artistName: string;
  artistSlug: string | null;
  isActive: boolean;
  defaultRule: ArtistRoyaltyRule | null;
  publicTemplateCount: number;
  templateOverrideCount: number;
  missingTemplateCount: number;
}

export interface GetArtistRoyaltySettingsResponse {
  artists: ArtistRoyaltySettingsItem[];
}

export interface TemplateRoyaltySettingsItem {
  templateId: string;
  templateName: string;
  isPublic: boolean;
  isShopVisible: boolean;
  defaultRule: ArtistRoyaltyRule | null;
  templateRule: ArtistRoyaltyRule | null;
  appliedRule: ArtistRoyaltyRule | null;
  appliedSource: "template" | "artist" | "missing";
}

export interface GetTemplateRoyaltySettingsResponse {
  artist: Pick<Artist, "id" | "name" | "slug">;
  templates: TemplateRoyaltySettingsItem[];
}

export interface TemplateProductRoyaltySettingsArtist {
  artistId: string;
  artistName: string;
  artistSlug: string | null;
  defaultRule: ArtistRoyaltyRule | null;
  templateRule: ArtistRoyaltyRule | null;
  appliedRule: ArtistRoyaltyRule | null;
  appliedSource: "template" | "artist" | "missing";
}

export interface GetTemplateProductRoyaltySettingsResponse {
  templateId: string;
  artists: TemplateProductRoyaltySettingsArtist[];
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
