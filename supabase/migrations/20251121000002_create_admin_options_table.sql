-- admin_options 테이블 생성
-- 관리자 설정 옵션을 저장하는 테이블

CREATE TABLE admin_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL DEFAULT 0,
    is_discount BOOLEAN NOT NULL DEFAULT false,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_admin_options_category ON admin_options(category);
CREATE INDEX idx_admin_options_value ON admin_options(value);
CREATE INDEX idx_admin_options_is_enabled ON admin_options(is_enabled);




-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_admin_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_options_updated_at
    BEFORE UPDATE ON admin_options
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_options_updated_at();

-- 기본 데이터 삽입 (일반 설정)
INSERT INTO admin_options (category, label, value, description, price, is_discount, is_enabled) VALUES
('general', '맞춤 시간표 접수', 'custom_timetable_orders', '맞춤 시간표 제작 주문 접수를 활성화합니다', 0, false, true);
