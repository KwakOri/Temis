-- 파일 메타데이터를 저장하는 테이블 생성
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_key VARCHAR(512) NOT NULL,           -- R2에 저장되는 파일 키 (경로 포함)
  original_name VARCHAR(255) NOT NULL,      -- 원본 파일명
  file_size BIGINT NOT NULL,                -- 파일 크기 (bytes)
  mime_type VARCHAR(100) NOT NULL,          -- MIME 타입
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by BIGINT REFERENCES users(id),   -- 업로드한 사용자 (bigint 타입으로 수정)
  is_deleted BOOLEAN DEFAULT FALSE,         -- 소프트 삭제 플래그
  deleted_at TIMESTAMP WITH TIME ZONE,      -- 삭제된 시간
  UNIQUE(file_key)
);

-- 인덱스 생성
CREATE INDEX idx_files_created_by ON files(created_by);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_is_deleted ON files(is_deleted);
CREATE INDEX idx_files_file_key ON files(file_key);



