import type {
  GetCustomOrdersParams,
  GetRoyaltyBatchesParams,
  GetRoyaltySalesParams,
  GetUsersParams,
} from "@/types/admin";
import type { TemplateHubListParams } from "@/types/template-hub";

export const queryKeys = {
  user: {
    all: ["user"] as const,
    templates: () => [...queryKeys.user.all, "templates"] as const,
    artistProfile: () => [...queryKeys.user.all, "artistProfile"] as const,
  },
  template: {
    all: ["template"] as const,
    detail: (id: string | number) =>
      [...queryKeys.template.all, "detail", id] as const,
    shopDetail: (id: string | number) =>
      [...queryKeys.template.all, "shopDetail", id] as const,
    v2Templates: (params?: {
      limit?: number;
      offset?: number;
      search?: string;
    }) => [...queryKeys.template.all, "v2Templates", params] as const,
    renderConfig: (id: string | number) =>
      [...queryKeys.template.all, "renderConfig", id] as const,
    templateStudioPreview: (id: string | number) =>
      [...queryKeys.template.all, "templateStudioPreview", id] as const,
    templateStudioRuntime: (id: string | number) =>
      [...queryKeys.template.all, "templateStudioRuntime", id] as const,
    thumbnailStudioRuntime: (id: string | number) =>
      [...queryKeys.template.all, "thumbnailStudioRuntime", id] as const,
  },
  customOrder: {
    all: ["customOrder"] as const,
    history: () => [...queryKeys.customOrder.all, "history"] as const,
    orders: () => [...queryKeys.customOrder.all, "orders"] as const,
    estimatedDeadline: () =>
      [...queryKeys.customOrder.all, "estimatedDeadline"] as const,
  },
  file: {
    all: ["file"] as const,
    byOrderId: (orderId: string) =>
      [...queryKeys.file.all, "byOrderId", orderId] as const,
  },
  pricing: {
    all: ["pricing"] as const,
    settings: () => [...queryKeys.pricing.all, "settings"] as const,
    options: (category?: string) =>
      [...queryKeys.pricing.all, "options", category] as const,
  },
  workSchedule: {
    all: ["workSchedule"] as const,
    orders: () => [...queryKeys.workSchedule.all, "orders"] as const,
  },
  shop: {
    all: ["shop"] as const,
    templates: (sortOrder?: string) =>
      [...queryKeys.shop.all, "templates", sortOrder] as const,
    userAccess: (userId?: string) =>
      [...queryKeys.shop.all, "userAccess", userId] as const,
  },
  purchaseHistory: {
    all: ["purchaseHistory"] as const,
    list: () => [...queryKeys.purchaseHistory.all, "list"] as const,
  },
  auth: {
    all: ["auth"] as const,
    signupTokenValidate: (token: string) =>
      [...queryKeys.auth.all, "signupTokenValidate", token] as const,
    resetPasswordTokenValidate: (token: string) =>
      [...queryKeys.auth.all, "resetPasswordTokenValidate", token] as const,
  },
  team: {
    all: ["team"] as const,
    userTeams: () => [...queryKeys.team.all, "userTeams"] as const,
    schedules: (teamId: string, weekStartDate: string) =>
      [...queryKeys.team.all, "schedules", teamId, weekStartDate] as const,
    userSchedule: (teamId: string, weekStartDate: string) =>
      [...queryKeys.team.all, "userSchedule", teamId, weekStartDate] as const,
    schedulesByWeek: (teamId: string, weekStartDate: string) =>
      [
        ...queryKeys.team.all,
        "schedulesByWeek",
        teamId,
        weekStartDate,
      ] as const,
  },
  admin: {
    all: ["admin"] as const,
    permission: () => [...queryKeys.admin.all, "permission"] as const,
    users: (params?: GetUsersParams) =>
      [...queryKeys.admin.all, "users", params] as const,
    userTemplates: (userId: string) =>
      [...queryKeys.admin.all, "userTemplates", userId] as const,
    templates: () => [...queryKeys.admin.all, "templates"] as const,
    template: (templateId: string) =>
      [...queryKeys.admin.all, "template", templateId] as const,
    templatePlans: (templateId?: string) =>
      [...queryKeys.admin.all, "templatePlans", templateId] as const,
    v2TemplateRenderConfig: (templateId: string) =>
      [...queryKeys.admin.all, "v2TemplateRenderConfig", templateId] as const,
    templateHub: () => [...queryKeys.admin.all, "templateHub"] as const,
    templateHubList: (params?: TemplateHubListParams) =>
      [...queryKeys.admin.templateHub(), "list", params] as const,
    templateHubItem: (templateId: string) =>
      [...queryKeys.admin.templateHub(), "item", templateId] as const,
    templateStudioTemplates: (templateKind?: "timetable" | "thumbnail") =>
      templateKind
        ? ([
            ...queryKeys.admin.all,
            "templateStudioTemplates",
            templateKind,
          ] as const)
        : ([...queryKeys.admin.all, "templateStudioTemplates"] as const),
    templateStudioTemplate: (templateId: string) =>
      [...queryKeys.admin.templateStudioTemplates(), templateId] as const,
    templateStudioDraft: (templateId: string) =>
      [...queryKeys.admin.templateStudioTemplate(templateId), "draft"] as const,
    customOrdersRoot: () => [...queryKeys.admin.all, "customOrders"] as const,
    customOrders: (params?: GetCustomOrdersParams) =>
      params
        ? ([...queryKeys.admin.customOrdersRoot(), params] as const)
        : queryKeys.admin.customOrdersRoot(),
    calendarRoot: (type: "custom" | "legacy") =>
      [...queryKeys.admin.all, "calendar", type] as const,
    calendar: (type: "custom" | "legacy", startDate: string, endDate: string) =>
      [...queryKeys.admin.calendarRoot(type), startDate, endDate] as const,
    purchaseRequests: () =>
      [...queryKeys.admin.all, "purchaseRequests"] as const,
    workSchedule: () => [...queryKeys.admin.all, "workSchedule"] as const,
    files: (fileIds: string[]) =>
      [...queryKeys.admin.all, "files", fileIds] as const,
    emailTest: () => [...queryKeys.admin.all, "emailTest"] as const,
    templateAccess: (templateId: string) =>
      [...queryKeys.admin.all, "templateAccess", templateId] as const,
    migrationStatus: () => [...queryKeys.admin.all, "migrationStatus"] as const,
    priceOptions: (category?: string) =>
      [...queryKeys.admin.all, "priceOptions", category] as const,
    adminOptions: (category?: string) =>
      [...queryKeys.admin.all, "adminOptions", category] as const,
    teamTemplates: () => [...queryKeys.admin.all, "teamTemplates"] as const,
    teams: () => [...queryKeys.admin.all, "teams"] as const,
    artists: () => [...queryKeys.admin.all, "artists"] as const,
    templateArtists: (templateId: string) =>
      [...queryKeys.admin.all, "templateArtists", templateId] as const,
    salesStats: (from?: string, to?: string) =>
      [...queryKeys.admin.all, "salesStats", from, to] as const,
    royaltySummary: (from?: string, to?: string, status?: string) =>
      [...queryKeys.admin.all, "royaltySummary", from, to, status] as const,
    royaltySales: (params?: GetRoyaltySalesParams) =>
      [...queryKeys.admin.all, "royaltySales", params] as const,
    royaltyBatches: (params?: GetRoyaltyBatchesParams) =>
      [...queryKeys.admin.all, "royaltyBatches", params] as const,
    royaltyBatch: (batchId: string) =>
      [...queryKeys.admin.all, "royaltyBatch", batchId] as const,
    royaltyStatement: (month?: string, artistId?: string) =>
      [...queryKeys.admin.all, "royaltyStatement", month, artistId] as const,
    royaltySettlementRun: (month?: string) =>
      [...queryKeys.admin.all, "royaltySettlementRun", month] as const,
    royaltySettingsArtists: () =>
      [...queryKeys.admin.all, "royaltySettingsArtists"] as const,
    royaltySettingsArtistTemplates: (artistId?: string) =>
      [
        ...queryKeys.admin.all,
        "royaltySettingsArtistTemplates",
        artistId,
      ] as const,
    royaltySettingsTemplate: (templateId?: string) =>
      [...queryKeys.admin.all, "royaltySettingsTemplate", templateId] as const,
  },
  adminOptions: {
    all: ["adminOptions"] as const,
    options: (category?: string) =>
      ["adminOptions", "options", category] as const,
  },
} as const;
