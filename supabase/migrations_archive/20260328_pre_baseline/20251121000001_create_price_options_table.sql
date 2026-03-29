-- Create price_options table for managing pricing options
CREATE TABLE price_options (
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

-- Create index for faster queries by category
CREATE INDEX idx_price_options_category ON price_options(category);

-- Create index for enabled options
CREATE INDEX idx_price_options_enabled ON price_options(is_enabled);



-- Insert default timetable options based on current hardcoded values
INSERT INTO price_options (category, label, value, description, price, is_discount, is_enabled) VALUES
('timetable', '기본 제작비', 'base_price', '맞춤형 시간표 기본 제작 비용', 80000, false, true),
('timetable', '빠른 마감', 'fast_delivery', '맨 앞 순서로 작업을 진행하여 일주일 안에 완성됩니다', 30000, false, true),
('timetable', '포트폴리오 비공개', 'portfolio_private', '포트폴리오에 공개하지 않습니다', 10000, false, true),
('timetable', '후기 이벤트 참여', 'review_event', 'SNS에 후기를 작성해주시면 할인됩니다', 10000, true, true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_price_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_price_options_updated_at
    BEFORE UPDATE ON price_options
    FOR EACH ROW
    EXECUTE FUNCTION update_price_options_updated_at();
