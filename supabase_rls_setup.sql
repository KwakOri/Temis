-- =====================================================
-- Temis 프로젝트 RLS (Row Level Security) 설정
-- =====================================================

-- 1. RLS 활성화
-- =====================================================

-- Users 테이블 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Templates 테이블 RLS 활성화  
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Template_access 테이블 RLS 활성화
ALTER TABLE template_access ENABLE ROW LEVEL SECURITY;

-- 2. 관리자 역할 생성 및 함수
-- =====================================================

-- 관리자 이메일 확인 함수
CREATE OR REPLACE FUNCTION is_admin_email(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 관리자 이메일 목록 (환경에 따라 수정 필요)
  RETURN user_email = ANY(ARRAY[
    'admin@temis.com',
    'admin@example.com'
    -- 필요에 따라 추가 관리자 이메일 추가
  ]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 현재 사용자 ID 가져오기 함수 (JWT 토큰 기반)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER AS $$
BEGIN
  -- JWT 토큰에서 user_id claim 추출
  RETURN (current_setting('request.jwt.claims', true)::json->>'user_id')::integer;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 현재 사용자 이메일 가져오기 함수
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
DECLARE
  user_id INTEGER;
  user_email TEXT;
BEGIN
  user_id := get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT email INTO user_email
  FROM users 
  WHERE id = user_id;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 현재 사용자가 관리자인지 확인하는 함수
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  user_email := get_current_user_email();
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN is_admin_email(user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Users 테이블 RLS 정책
-- =====================================================

-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;  
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- 사용자는 자신의 정보만 조회 가능, 관리자는 모든 사용자 조회 가능
CREATE POLICY "users_select_policy" ON users
  FOR SELECT
  USING (
    id = get_current_user_id() OR is_current_user_admin()
  );

-- 사용자 등록은 누구나 가능 (회원가입)
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT
  WITH CHECK (true);

-- 사용자는 자신의 정보만 수정 가능, 관리자는 모든 사용자 수정 가능
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE
  USING (
    id = get_current_user_id() OR is_current_user_admin()
  )
  WITH CHECK (
    id = get_current_user_id() OR is_current_user_admin()
  );

-- 사용자 삭제는 관리자만 가능
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE
  USING (is_current_user_admin());

-- 4. Templates 테이블 RLS 정책
-- =====================================================

-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "templates_select_policy" ON templates;
DROP POLICY IF EXISTS "templates_insert_policy" ON templates;
DROP POLICY IF EXISTS "templates_update_policy" ON templates;
DROP POLICY IF EXISTS "templates_delete_policy" ON templates;

-- 템플릿 조회: 공개 템플릿 + 자신이 접근 권한이 있는 템플릿 + 관리자는 모든 템플릿
CREATE POLICY "templates_select_policy" ON templates
  FOR SELECT
  USING (
    is_public = true OR 
    is_current_user_admin() OR
    has_template_access(id::text, get_current_user_id()::text)
  );

-- 템플릿 생성: 관리자만 가능
CREATE POLICY "templates_insert_policy" ON templates
  FOR INSERT
  WITH CHECK (is_current_user_admin());

-- 템플릿 수정: 관리자만 가능
CREATE POLICY "templates_update_policy" ON templates
  FOR UPDATE
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 템플릿 삭제: 관리자만 가능
CREATE POLICY "templates_delete_policy" ON templates
  FOR DELETE
  USING (is_current_user_admin());

-- 5. Template_access 테이블 RLS 정책
-- =====================================================

-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "template_access_select_policy" ON template_access;
DROP POLICY IF EXISTS "template_access_insert_policy" ON template_access;
DROP POLICY IF EXISTS "template_access_update_policy" ON template_access;
DROP POLICY IF EXISTS "template_access_delete_policy" ON template_access;

-- 템플릿 접근 권한 조회: 자신과 관련된 권한 + 관리자는 모든 권한
CREATE POLICY "template_access_select_policy" ON template_access
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR 
    granted_by = get_current_user_id() OR
    is_current_user_admin()
  );

-- 템플릿 접근 권한 생성: 관리자만 가능
CREATE POLICY "template_access_insert_policy" ON template_access
  FOR INSERT
  WITH CHECK (is_current_user_admin());

-- 템플릿 접근 권한 수정: 관리자만 가능
CREATE POLICY "template_access_update_policy" ON template_access
  FOR UPDATE
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 템플릿 접근 권한 삭제: 관리자만 가능
CREATE POLICY "template_access_delete_policy" ON template_access
  FOR DELETE
  USING (is_current_user_admin());

-- 6. 기존 has_template_access 함수 업데이트
-- =====================================================

-- 기존 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS has_template_access(text, text);

CREATE OR REPLACE FUNCTION has_template_access(p_template_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  user_id_int INTEGER;
  access_count INTEGER;
BEGIN
  -- p_user_id가 제공되지 않으면 현재 사용자 ID 사용
  IF p_user_id IS NULL OR p_user_id = '' THEN
    user_id_int := get_current_user_id();
  ELSE
    user_id_int := p_user_id::integer;
  END IF;
  
  -- 사용자 ID가 없으면 false 반환
  IF user_id_int IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 관리자는 항상 접근 가능
  IF is_current_user_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- 템플릿이 공개되어 있으면 접근 가능
  SELECT COUNT(*) INTO access_count
  FROM templates
  WHERE id = p_template_id::uuid AND is_public = true;
  
  IF access_count > 0 THEN
    RETURN TRUE;
  END IF;
  
  -- 명시적인 접근 권한이 있는지 확인
  SELECT COUNT(*) INTO access_count
  FROM template_access
  WHERE template_id = p_template_id::uuid 
    AND user_id = user_id_int
    AND access_level IN ('read', 'write', 'admin');
  
  RETURN access_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 인덱스 최적화
-- =====================================================

-- 성능 향상을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_template_access_user_template ON template_access(user_id, template_id);
CREATE INDEX IF NOT EXISTS idx_template_access_template_id ON template_access(template_id);

-- 8. 보안 강화 설정
-- =====================================================

-- 함수들에 대한 실행 권한 설정
GRANT EXECUTE ON FUNCTION is_admin_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_email TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin TO authenticated;
GRANT EXECUTE ON FUNCTION has_template_access TO authenticated;

-- 익명 사용자에게는 제한적 권한만 부여
GRANT EXECUTE ON FUNCTION has_template_access TO anon;

-- 9. 테스트 및 검증
-- =====================================================

-- RLS 정책이 올바르게 적용되었는지 확인
-- (실제 환경에서는 이 부분을 제거하고 별도로 테스트)

/*
-- 테스트 쿼리 예시:

-- 1. 공개 템플릿 조회 (인증되지 않은 사용자)
SELECT * FROM templates WHERE is_public = true;

-- 2. 사용자 자신의 정보 조회
SELECT * FROM users WHERE id = get_current_user_id();

-- 3. 관리자의 모든 템플릿 조회
SELECT * FROM templates; -- 관리자로 로그인했을 때만 성공

-- 4. 템플릿 접근 권한 확인
SELECT has_template_access('template-uuid-here');
*/

-- =====================================================
-- 설정 완료
-- =====================================================

-- 설정 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Temis RLS 설정이 완료되었습니다.';
  RAISE NOTICE '관리자 이메일을 is_admin_email 함수에서 업데이트해주세요.';
  RAISE NOTICE 'JWT 토큰 설정이 올바른지 확인해주세요.';
END $$;