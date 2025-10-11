// admin_settings 테이블의 setting_value에 저장되는 가격 설정 타입
export interface PricingSettings {
  base_price: number;
  fast_delivery: {
    price: number;
    enabled: boolean;
    description: string;
  };
  portfolio_private: {
    price: number;
    enabled: boolean;
    description: string;
  };
  review_event: {
    discount: number;
    enabled: boolean;
    description: string;
  };
}

// 가격 설정 API 응답 타입
export interface PricingSettingsResponse {
  setting: {
    setting_value: PricingSettings;
  };
}
