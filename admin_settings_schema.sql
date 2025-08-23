-- 관리자 설정 테이블
CREATE TABLE admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(50) NOT NULL UNIQUE, -- 설정 키 (예: 'custom_order_pricing', 'fast_delivery_enabled')
  setting_value JSONB NOT NULL, -- 설정 값 (JSON 형태로 유연하게 저장)
  description TEXT, -- 설정에 대한 설명
  category VARCHAR(20) DEFAULT 'general', -- 설정 카테고리 (pricing, delivery, notification 등)
  is_active BOOLEAN DEFAULT true, -- 설정 활성화 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 업데이트 시간 자동 갱신을 위한 트리거
CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 초기 설정 데이터 삽입
INSERT INTO admin_settings (setting_key, setting_value, description, category) VALUES 
(
  'custom_order_pricing', 
  '{
    "base_price": 80000,
    "fast_delivery": {
      "price": 30000,
      "enabled": true,
      "description": "빠른 마감"
    },
    "portfolio_private": {
      "price": 30000,
      "enabled": true,
      "description": "포폴 비공개"
    },
    "review_event": {
      "discount": 10000,
      "enabled": true,
      "description": "후기 이벤트 참여"
    }
  }',
  '맞춤형 시간표 제작 가격 설정',
  'pricing'
),
(
  'custom_order_delivery',
  '{
    "standard_days": "14-28",
    "fast_delivery_days": "7-14",
    "max_concurrent_orders": 10,
    "current_orders": 0
  }',
  '맞춤형 시간표 제작 배송 설정',
  'delivery'
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_admin_settings_key ON admin_settings(setting_key);
CREATE INDEX idx_admin_settings_category ON admin_settings(category);
CREATE INDEX idx_admin_settings_active ON admin_settings(is_active);