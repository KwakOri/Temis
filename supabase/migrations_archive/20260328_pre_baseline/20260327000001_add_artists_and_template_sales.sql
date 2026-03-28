-- =====================================================
-- Artists + Template Artists + Template Sales
-- =====================================================
-- 목적
-- 1) 외부 작가 프로필 관리용 artists 테이블
-- 2) 템플릿-작가 연결용 template_artists (many-to-many)
-- 3) 판매 집계용 template_sales 로그 테이블
-- 4) template_purchase_requests.status = 'completed' 시 판매 로그 자동 생성

-- =====================================================
-- 1) artists
-- =====================================================
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  bio TEXT,
  profile_image_url TEXT,
  contact_email TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE artists IS '외부/내부 템플릿 작가 프로필';
COMMENT ON COLUMN artists.name IS '작가 표시 이름';
COMMENT ON COLUMN artists.slug IS '고유 슬러그(선택)';
COMMENT ON COLUMN artists.is_active IS '활성 작가 여부';

CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_is_active ON artists(is_active);

CREATE OR REPLACE FUNCTION update_artists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_artists_updated_at ON artists;
CREATE TRIGGER trigger_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW
  EXECUTE FUNCTION update_artists_updated_at();

-- =====================================================
-- 2) template_artists (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS template_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'creator',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id, artist_id)
);

COMMENT ON TABLE template_artists IS '템플릿-작가 연결 조인 테이블';
COMMENT ON COLUMN template_artists.role IS '작가 역할(creator, collaborator 등)';
COMMENT ON COLUMN template_artists.is_primary IS '대표 작가 여부';
COMMENT ON COLUMN template_artists.display_order IS '표시 순서';

CREATE INDEX IF NOT EXISTS idx_template_artists_template_id
  ON template_artists(template_id);
CREATE INDEX IF NOT EXISTS idx_template_artists_artist_id
  ON template_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_template_artists_display_order
  ON template_artists(template_id, display_order);

-- 한 템플릿에 대표 작가는 최대 1명
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_artists_primary_per_template
  ON template_artists(template_id)
  WHERE is_primary = true;

-- =====================================================
-- 3) template_sales (집계용 판매 로그)
-- =====================================================
CREATE TABLE IF NOT EXISTS template_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id UUID NOT NULL UNIQUE REFERENCES template_purchase_requests(id) ON DELETE RESTRICT,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES template_plans(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_paid INTEGER NOT NULL CHECK (amount_paid >= 0),
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'partial_refunded', 'cancelled')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  refunded_at TIMESTAMPTZ,
  depositor_name TEXT,
  template_name_snapshot TEXT NOT NULL,
  artist_names_snapshot TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE template_sales IS '템플릿 판매 확정 로그(통계 집계 원본)';
COMMENT ON COLUMN template_sales.purchase_request_id IS '원본 구매 요청 ID(중복 방지)';
COMMENT ON COLUMN template_sales.amount_paid IS '결제 확정 금액(원)';
COMMENT ON COLUMN template_sales.template_name_snapshot IS '판매 시점 템플릿명 스냅샷';
COMMENT ON COLUMN template_sales.artist_names_snapshot IS '판매 시점 작가명 배열 스냅샷';

CREATE INDEX IF NOT EXISTS idx_template_sales_paid_at
  ON template_sales(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_sales_template_id
  ON template_sales(template_id);
CREATE INDEX IF NOT EXISTS idx_template_sales_plan_id
  ON template_sales(plan_id);
CREATE INDEX IF NOT EXISTS idx_template_sales_user_id
  ON template_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_template_sales_status
  ON template_sales(status);

CREATE OR REPLACE FUNCTION update_template_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_template_sales_updated_at ON template_sales;
CREATE TRIGGER trigger_template_sales_updated_at
  BEFORE UPDATE ON template_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_template_sales_updated_at();

-- =====================================================
-- 4) 구매 완료 시 판매 로그 자동 기록
-- =====================================================
CREATE OR REPLACE FUNCTION sync_template_sales_from_purchase_request()
RETURNS TRIGGER AS $$
DECLARE
  v_price INTEGER := 0;
  v_template_name TEXT := '';
  v_artist_names TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- completed 상태일 때만 처리
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- 플랜 가격 조회(없으면 0)
  SELECT COALESCE(tp.price, 0)
    INTO v_price
  FROM template_plans tp
  WHERE tp.id = NEW.plan_id;

  -- 템플릿명 스냅샷
  SELECT COALESCE(t.name, 'Unknown Template')
    INTO v_template_name
  FROM templates t
  WHERE t.id = NEW.template_id;

  -- 작가명 스냅샷 (대표 작가 우선 + 표시 순서)
  SELECT COALESCE(
    array_agg(a.name ORDER BY ta.is_primary DESC, ta.display_order ASC, a.name ASC),
    ARRAY[]::TEXT[]
  )
    INTO v_artist_names
  FROM template_artists ta
  JOIN artists a ON a.id = ta.artist_id
  WHERE ta.template_id = NEW.template_id
    AND a.is_active = true;

  INSERT INTO template_sales (
    purchase_request_id,
    template_id,
    plan_id,
    user_id,
    amount_paid,
    currency,
    status,
    paid_at,
    depositor_name,
    template_name_snapshot,
    artist_names_snapshot
  )
  VALUES (
    NEW.id,
    NEW.template_id,
    NEW.plan_id,
    NEW.user_id,
    v_price,
    'KRW',
    'completed',
    COALESCE(NEW.updated_at, NEW.created_at, timezone('utc'::text, now())),
    NEW.depositor_name,
    v_template_name,
    v_artist_names
  )
  ON CONFLICT (purchase_request_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_template_sales_on_purchase_request
  ON template_purchase_requests;

CREATE TRIGGER trigger_sync_template_sales_on_purchase_request
  AFTER INSERT OR UPDATE OF status ON template_purchase_requests
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION sync_template_sales_from_purchase_request();

-- 기존 completed 데이터 백필
INSERT INTO template_sales (
  purchase_request_id,
  template_id,
  plan_id,
  user_id,
  amount_paid,
  currency,
  status,
  paid_at,
  depositor_name,
  template_name_snapshot,
  artist_names_snapshot
)
SELECT
  tpr.id,
  tpr.template_id,
  tpr.plan_id,
  tpr.user_id,
  COALESCE(tp.price, 0) AS amount_paid,
  'KRW' AS currency,
  'completed' AS status,
  COALESCE(tpr.updated_at, tpr.created_at, timezone('utc'::text, now())) AS paid_at,
  tpr.depositor_name,
  COALESCE(t.name, 'Unknown Template') AS template_name_snapshot,
  COALESCE(artist_data.artist_names, ARRAY[]::TEXT[]) AS artist_names_snapshot
FROM template_purchase_requests tpr
LEFT JOIN template_plans tp
  ON tp.id = tpr.plan_id
LEFT JOIN templates t
  ON t.id = tpr.template_id
LEFT JOIN LATERAL (
  SELECT array_agg(a.name ORDER BY ta.is_primary DESC, ta.display_order ASC, a.name ASC) AS artist_names
  FROM template_artists ta
  JOIN artists a ON a.id = ta.artist_id
  WHERE ta.template_id = tpr.template_id
    AND a.is_active = true
) AS artist_data ON true
WHERE tpr.status = 'completed'
ON CONFLICT (purchase_request_id) DO NOTHING;

