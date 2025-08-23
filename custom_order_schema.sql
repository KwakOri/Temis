-- 맞춤형 시간표 제작 신청 테이블
CREATE TABLE custom_timetable_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  youtube_sns_address TEXT NOT NULL,
  email_discord TEXT NOT NULL,
  
  -- 요청 상세 정보
  order_requirements TEXT NOT NULL, -- 시간표 제작에 필요한 요소들
  has_character_images BOOLEAN NOT NULL DEFAULT false, -- 캐릭터 이미지 첨부 여부
  wants_omakase BOOLEAN NOT NULL DEFAULT false, -- 오마카세 요청 여부
  design_keywords TEXT, -- 시간표에 원하는 디자인이나 간단 키워드
  reference_files TEXT[], -- 원하는 디자인 시안이나 레퍼런스 파일 경로들
  
  -- 상태 관리
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  admin_notes TEXT, -- 관리자 메모
  price_quoted INTEGER, -- 견적 가격 (원)
  
  -- 파일 관리
  character_image_files TEXT[], -- 캐릭터 이미지 파일 경로들
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_custom_timetable_orders_updated_at 
    BEFORE UPDATE ON custom_timetable_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();


-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_custom_orders_user_id ON custom_timetable_orders(user_id);
CREATE INDEX idx_custom_orders_status ON custom_timetable_orders(status);
CREATE INDEX idx_custom_orders_created_at ON custom_timetable_orders(created_at DESC);