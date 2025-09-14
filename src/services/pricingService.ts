import { PricingSettings, PricingSettingsResponse } from '@/types/pricing'

export class PricingService {
  private static baseUrl = '/api/admin/settings'

  static async getPricingSettings(): Promise<PricingSettings> {
    const response = await fetch(`${this.baseUrl}?key=custom_order_pricing`, {
      credentials: 'include',
    })

    if (!response.ok) {
      // 기본값으로 폴백
      return {
        base_price: 80000,
        fast_delivery: {
          price: 30000,
          enabled: true,
          description: '빠른 마감',
        },
        portfolio_private: {
          price: 10000,
          enabled: true,
          description: '포트폴리오 비공개',
        },
        review_event: {
          discount: 10000,
          enabled: true,
          description: '후기 이벤트 참여',
        },
      }
    }

    const result: PricingSettingsResponse = await response.json()
    return result.setting.setting_value
  }
}