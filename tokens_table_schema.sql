-- tokens 테이블 생성 (비밀번호 리셋 및 회원가입 초대용)
CREATE TABLE tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('password_reset', 'signup_invite')),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_tokens_token ON tokens(token);
CREATE INDEX idx_tokens_email ON tokens(email);
CREATE INDEX idx_tokens_type ON tokens(type);
CREATE INDEX idx_tokens_expires_at ON tokens(expires_at);

-- 만료된 토큰 자동 정리를 위한 함수 (선택사항)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM tokens 
    WHERE expires_at < NOW() 
    OR (used = TRUE AND created_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;