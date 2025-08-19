-- 1. users 테이블에 role 컬럼 추가
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'unauthorized'));

-- 2. 기존 사용자들은 모두 'user' 역할로 유지 (DEFAULT 값으로 자동 설정)

-- 3. tokens 테이블의 type 체크 제약조건에 'email_verification' 추가 (이미 적용되어 있을 수 있음)
ALTER TABLE tokens 
DROP CONSTRAINT IF EXISTS tokens_type_check;

ALTER TABLE tokens 
ADD CONSTRAINT tokens_type_check 
CHECK (type IN ('password_reset', 'signup_invite', 'email_verification'));

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);