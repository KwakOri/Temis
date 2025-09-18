import type { GetCustomOrdersParams, GetUsersParams } from "@/types/admin";

export const queryKeys = {
  user: {
    all: ["user"] as const,
    templates: () => [...queryKeys.user.all, "templates"] as const,
  },
  template: {
    all: ["template"] as const,
    detail: (id: string | number) =>
      [...queryKeys.template.all, "detail", id] as const,
    shopDetail: (id: string | number) =>
      [...queryKeys.template.all, "shopDetail", id] as const,
  },
  customOrder: {
    all: ["customOrder"] as const,
    history: () => [...queryKeys.customOrder.all, "history"] as const,
    orders: () => [...queryKeys.customOrder.all, "orders"] as const,
  },
  file: {
    all: ["file"] as const,
    byOrderId: (orderId: string) =>
      [...queryKeys.file.all, "byOrderId", orderId] as const,
  },
  pricing: {
    all: ["pricing"] as const,
    settings: () => [...queryKeys.pricing.all, "settings"] as const,
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
  },
  admin: {
    all: ["admin"] as const,
    permission: () => [...queryKeys.admin.all, "permission"] as const,
    users: (params?: GetUsersParams) =>
      [...queryKeys.admin.all, "users", params] as const,
    userTemplates: (userId: string) =>
      [...queryKeys.admin.all, "userTemplates", userId] as const,
    templates: () => [...queryKeys.admin.all, "templates"] as const,
    customOrders: (params?: GetCustomOrdersParams) =>
      [...queryKeys.admin.all, "customOrders", params] as const,
    calendar: (type: "custom" | "legacy", startDate: string, endDate: string) =>
      [...queryKeys.admin.all, "calendar", type, startDate, endDate] as const,
    purchaseRequests: () =>
      [...queryKeys.admin.all, "purchaseRequests"] as const,
    workSchedule: () => [...queryKeys.admin.all, "workSchedule"] as const,
    files: (fileIds: string[]) =>
      [...queryKeys.admin.all, "files", fileIds] as const,
    emailTest: () => [...queryKeys.admin.all, "emailTest"] as const,
    templateAccess: (templateId: string) =>
      [...queryKeys.admin.all, "templateAccess", templateId] as const,
    migrationStatus: () => [...queryKeys.admin.all, "migrationStatus"] as const,
  },
} as const;
