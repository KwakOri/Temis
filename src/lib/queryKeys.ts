export const queryKeys = {
  user: {
    all: ['user'] as const,
    templates: () => [...queryKeys.user.all, 'templates'] as const,
  },
  template: {
    all: ['template'] as const,
    detail: (id: string | number) => [...queryKeys.template.all, 'detail', id] as const,
    shopDetail: (id: string | number) => [...queryKeys.template.all, 'shopDetail', id] as const,
  },
  customOrder: {
    all: ['customOrder'] as const,
    history: () => [...queryKeys.customOrder.all, 'history'] as const,
    orders: () => [...queryKeys.customOrder.all, 'orders'] as const,
  },
  file: {
    all: ['file'] as const,
    byOrderId: (orderId: string) => [...queryKeys.file.all, 'byOrderId', orderId] as const,
  },
  pricing: {
    all: ['pricing'] as const,
    settings: () => [...queryKeys.pricing.all, 'settings'] as const,
  },
  workSchedule: {
    all: ['workSchedule'] as const,
    orders: () => [...queryKeys.workSchedule.all, 'orders'] as const,
  },
  shop: {
    all: ['shop'] as const,
    templates: (sortOrder?: string) => [...queryKeys.shop.all, 'templates', sortOrder] as const,
    userAccess: (userId?: string) => [...queryKeys.shop.all, 'userAccess', userId] as const,
  },
  purchaseHistory: {
    all: ['purchaseHistory'] as const,
    list: () => [...queryKeys.purchaseHistory.all, 'list'] as const,
  },
  auth: {
    all: ['auth'] as const,
    signupTokenValidate: (token: string) => [...queryKeys.auth.all, 'signupTokenValidate', token] as const,
    resetPasswordTokenValidate: (token: string) => [...queryKeys.auth.all, 'resetPasswordTokenValidate', token] as const,
  },
} as const