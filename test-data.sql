-- 템플릿 상품 정보 테이블 생성
CREATE TABLE IF NOT EXISTS template_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detailed_description TEXT,
  price INTEGER NOT NULL, -- 가격 (원 단위)
  features TEXT[], -- 특징/기능 배열
  requirements TEXT, -- 요구사항
  delivery_time INTEGER, -- 배송시간 (일 단위)
  sample_images TEXT[], -- 샘플 이미지 URL 배열
  is_available BOOLEAN DEFAULT true, -- 판매 가능 여부
  is_custom_order BOOLEAN DEFAULT false, -- 맞춤 제작 여부
  purchase_instructions TEXT, -- 구매 안내사항
  bank_account_info TEXT, -- 계좌 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 구매 신청 테이블 생성
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  admin_notes TEXT, -- 관리자 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 먼저 일부 템플릿을 공개로 설정
UPDATE templates 
SET is_public = true 
WHERE id IN (
  'ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020', -- 세라님의 시간표
  '83b56e00-b93b-4dc0-81ff-0521c891ee26', -- 도화비님의 시간표
  'e3053d98-d745-4adf-8b32-ce9210b9ee37'  -- 이루희님의 시간표
);

-- 템플릿 상품 정보 더미 데이터 삽입
INSERT INTO template_products (
  template_id, 
  title, 
  detailed_description, 
  price, 
  features, 
  requirements, 
  delivery_time, 
  sample_images,
  is_available,
  purchase_instructions,
  bank_account_info
) VALUES 
(
  'ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020',
  '세라님 스타일 시간표 템플릿',
  '깔끔하고 모던한 디자인의 시간표 템플릿입니다. 세라님의 시그니처 색상과 폰트를 사용하여 제작되었으며, 방송 스케줄 관리에 최적화되어 있습니다.',
  15000,
  ARRAY['고화질 PNG 파일', '편집 가능한 소스 파일', '색상 변경 가이드', '폰트 파일 포함', '사용법 설명서'],
  '웹 브라우저만 있으면 사용 가능합니다',
  1,
  ARRAY[],
  true,
  '구매 신청 후 24시간 이내에 이메일로 파일을 전송해드립니다. 계좌 정보는 신청 후 안내됩니다.',
  '국민은행 123-456-789012 (예금주: 템미스)'
),
(
  '83b56e00-b93b-4dc0-81ff-0521c891ee26',
  '도화비님 감성 시간표 템플릿',
  '따뜻하고 감성적인 느낌의 시간표 템플릿입니다. 파스텔 톤의 색상과 손글씨 느낌의 폰트로 친근한 분위기를 연출할 수 있습니다.',
  18000,
  ARRAY['고화질 PNG 파일', '편집 가능한 소스 파일', '3가지 색상 변형', '커스텀 아이콘 세트', '브랜딩 가이드'],
  '포토샵 또는 웹 브라우저에서 편집 가능',
  2,
  ARRAY[],
  true,
  '구매 확인 후 1-2일 이내에 모든 파일을 이메일로 전송해드립니다.',
  '카카오뱅크 3333-01-1234567 (예금주: 템미스)'
),
(
  'e3053d98-d745-4adf-8b32-ce9210b9ee37',
  '이루희님 미니멀 시간표 템플릿',
  '심플하고 깔끔한 미니멀 디자인의 시간표입니다. 불필요한 장식 없이 정보만 명확하게 전달하는 것에 중점을 둔 디자인입니다.',
  12000,
  ARRAY['고화질 PNG 파일', '편집 가능한 소스 파일', '다크/라이트 모드', '반응형 디자인', '접근성 최적화'],
  '최신 브라우저 환경',
  1,
  ARRAY[],
  true,
  '구매 즉시 다운로드 링크를 이메일로 발송해드립니다.',
  '신한은행 110-123-456789 (예금주: 템미스)'
);

-- 구매 신청 더미 데이터 삽입 (테스트용)
INSERT INTO purchase_requests (
  template_id,
  customer_name,
  customer_email,
  customer_phone,
  message,
  status,
  admin_notes
) VALUES 
(
  'ef9fa34f-47c8-4e8e-8ed4-b84ef8eae020',
  '김버튜버',
  'test@example.com',
  '010-1234-5678',
  '방송용으로 사용하려고 합니다. 색상 변경 가능한지 궁금해요.',
  'pending',
  NULL
),
(
  '83b56e00-b93b-4dc0-81ff-0521c891ee26',
  '이시간표',
  'buyer@test.com',
  '010-9876-5432',
  '급하게 필요해요! 빠른 배송 가능한가요?',
  'processing',
  '고객 요청사항 확인 완료. 24시간 내 배송 예정'
),
(
  'e3053d98-d745-4adf-8b32-ce9210b9ee37',
  '박스트리머',
  'streamer@live.com',
  '010-5555-1234',
  '깔끔한 디자인이 마음에 들어요.',
  'completed',
  '2024-08-15 파일 전송 완료'
);

-- 생성된 테이블 확인
SELECT 'template_products' as table_name, COUNT(*) as record_count FROM template_products
UNION ALL
SELECT 'purchase_requests' as table_name, COUNT(*) as record_count FROM purchase_requests;