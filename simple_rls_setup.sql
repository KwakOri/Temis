-- =====================================================
-- Temis 프로젝트 간소화된 RLS 설정
-- =====================================================

-- 1. RLS 활성화
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY; 
ALTER TABLE template_access ENABLE ROW LEVEL SECURITY;

-- 2. 기본 보안 함수
-- =====================================================

-- 현재 사용자 ID 가져오기 (JWT에서)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json->>'user_id')::integer;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 관리자 이메일 확인 (환경변수 기반)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_id INTEGER;
  user_email TEXT;
BEGIN
  user_id := get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT email INTO user_email FROM users WHERE id = user_id;
  
  -- 관리자 이메일 체크 (필요시 수정)
  RETURN user_email IN ('admin@temis.com', 'admin@example.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Users 테이블 정책
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "users_policy" ON users;

-- 사용자는 자신만, 관리자는 모든 사용자 접근
CREATE POLICY "users_policy" ON users
  FOR ALL
  USING (
    id = get_current_user_id() OR is_admin_user()
  );

-- 회원가입을 위한 INSERT 허용
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT
  WITH CHECK (true);

-- 4. Templates 테이블 정책
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "templates_select_policy" ON templates;
DROP POLICY IF EXISTS "templates_insert_policy" ON templates;
DROP POLICY IF EXISTS "templates_update_policy" ON templates;
DROP POLICY IF EXISTS "templates_delete_policy" ON templates;

-- 공개 템플릿은 누구나, 관리자는 모든 템플릿 조회
CREATE POLICY "templates_select_policy" ON templates
  FOR SELECT
  USING (
    is_public = true OR is_admin_user()
  );

-- 템플릿 생성은 관리자만
CREATE POLICY "templates_insert_policy" ON templates
  FOR INSERT
  WITH CHECK (is_admin_user());

-- 템플릿 수정은 관리자만
CREATE POLICY "templates_update_policy" ON templates
  FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- 템플릿 삭제는 관리자만
CREATE POLICY "templates_delete_policy" ON templates
  FOR DELETE
  USING (is_admin_user());

-- 5. Template_access 테이블 정책
-- =====================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "template_access_select_policy" ON template_access;
DROP POLICY IF EXISTS "template_access_insert_policy" ON template_access;
DROP POLICY IF EXISTS "template_access_update_policy" ON template_access;
DROP POLICY IF EXISTS "template_access_delete_policy" ON template_access;

-- 관리자만 모든 접근 권한 조회
CREATE POLICY "template_access_select_policy" ON template_access
  FOR SELECT
  USING (is_admin_user());

-- 관리자만 접근 권한 생성
CREATE POLICY "template_access_insert_policy" ON template_access
  FOR INSERT
  WITH CHECK (is_admin_user());

-- 관리자만 접근 권한 수정
CREATE POLICY "template_access_update_policy" ON template_access
  FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- 관리자만 접근 권한 삭제
CREATE POLICY "template_access_delete_policy" ON template_access
  FOR DELETE
  USING (is_admin_user());

-- 6. 기본 인덱스
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);

-- 7. 권한 설정
-- =====================================================

GRANT EXECUTE ON FUNCTION get_current_user_id TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated, anon;

-- =====================================================
-- 완료
-- =====================================================

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '간소화된 RLS 설정이 완료되었습니다.';
  RAISE NOTICE 'is_admin_user 함수에서 관리자 이메일을 수정해주세요.';
END $$;