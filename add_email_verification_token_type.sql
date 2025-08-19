-- tokens 테이블의 type 체크 제약조건에 'email_verification' 추가
ALTER TABLE tokens 
DROP CONSTRAINT IF EXISTS tokens_type_check;

ALTER TABLE tokens 
ADD CONSTRAINT tokens_type_check 
CHECK (type IN ('password_reset', 'signup_invite', 'email_verification'));