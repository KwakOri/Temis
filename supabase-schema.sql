-- Supabase 데이터베이스 전체 스키마
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- ================================
-- 1. 공통 함수 생성
-- ================================
-- updated_at 자동 업데이트를 위한 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================
-- 2. users 테이블 생성
-- ================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 이메일에 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- updated_at 자동 업데이트 트리거 생성
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- 3. templates 테이블 생성
-- ================================
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- templates 테이블 RLS (Row Level Security) 설정
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- templates 정책: 소유자는 모든 권한, 공개 템플릿은 읽기 가능
CREATE POLICY "Templates: 소유자는 모든 권한" ON public.templates
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Templates: 공개 템플릿은 읽기 가능" ON public.templates
    FOR SELECT USING (is_public = true);

-- templates updated_at 트리거
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON public.templates 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================
-- 4. template_access 조인 테이블 생성
-- ================================
CREATE TABLE IF NOT EXISTS public.template_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 동일한 사용자가 같은 템플릿에 중복 접근 권한을 가질 수 없도록 제약
    UNIQUE(template_id, user_id)
);

-- template_access 테이블 RLS 설정
ALTER TABLE public.template_access ENABLE ROW LEVEL SECURITY;

-- template_access 정책들
CREATE POLICY "Template Access: 권한 있는 사용자만 조회" ON public.template_access
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT created_by FROM public.templates WHERE id = template_id
        )
    );

CREATE POLICY "Template Access: 소유자만 권한 관리" ON public.template_access
    FOR ALL USING (
        auth.uid() IN (
            SELECT created_by FROM public.templates WHERE id = template_id
        )
    );

-- ================================
-- 5. 인덱스 생성 (성능 최적화)
-- ================================
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.templates(is_public);
CREATE INDEX IF NOT EXISTS idx_template_access_template_id ON public.template_access(template_id);
CREATE INDEX IF NOT EXISTS idx_template_access_user_id ON public.template_access(user_id);
CREATE INDEX IF NOT EXISTS idx_template_access_composite ON public.template_access(template_id, user_id);

-- ================================
-- 6. 함수 생성 (템플릿 접근 권한 확인)
-- ================================
CREATE OR REPLACE FUNCTION public.has_template_access(
    p_template_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. 템플릿 소유자인지 확인
    IF EXISTS (
        SELECT 1 FROM public.templates 
        WHERE id = p_template_id AND created_by = p_user_id
    ) THEN
        RETURN true;
    END IF;
    
    -- 2. 공개 템플릿인지 확인
    IF EXISTS (
        SELECT 1 FROM public.templates 
        WHERE id = p_template_id AND is_public = true
    ) THEN
        RETURN true;
    END IF;
    
    -- 3. 명시적 접근 권한이 있는지 확인
    IF EXISTS (
        SELECT 1 FROM public.template_access 
        WHERE template_id = p_template_id AND user_id = p_user_id
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- RLS (Row Level Security) 정책 설정 (선택적)
-- 필요에 따라 활성화하세요
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (개발용)
-- 운영 환경에서는 더 엄격한 정책을 설정하세요
-- CREATE POLICY "Allow all operations on users" ON users
--   FOR ALL USING (true) WITH CHECK (true);

-- 테스트용 초기 데이터 삽입 (선택적)
INSERT INTO users (email, name, password) VALUES
  ('admin@example.com', '관리자', '$2b$12$lUM3Aj.qdD.XzNYVxjQnMO9mSuoNY.l386fppPP9x7X62.xWL3DTK'),
  ('user@example.com', '사용자', '$2b$12$lUM3Aj.qdD.XzNYVxjQnMO9mSuoNY.l386fppPP9x7X62.xWL3DTK')
ON CONFLICT (email) DO NOTHING;