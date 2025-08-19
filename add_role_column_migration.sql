-- users 테이블에 role 컬럼 추가
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'unauthorized'));

-- 기존 사용자들은 모두 'user' 역할로 설정 (이미 DEFAULT가 'user'이므로 자동 적용됨)

-- tokens 테이블의 type 체크 제약조건에 'email_verification' 추가
ALTER TABLE tokens 
DROP CONSTRAINT IF EXISTS tokens_type_check;

ALTER TABLE tokens 
ADD CONSTRAINT tokens_type_check 
CHECK (type IN ('password_reset', 'signup_invite', 'email_verification'));