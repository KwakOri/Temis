-- Supabase 테이블 생성 스크립트
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행

-- ================================
-- 1. templates 테이블 생성
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

-- ================================
-- 2. template_access 조인 테이블 생성
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

-- template_access 정책: 템플릿 소유자와 권한을 부여받은 사용자만 조회 가능
CREATE POLICY "Template Access: 권한 있는 사용자만 조회" ON public.template_access
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (
            SELECT created_by FROM public.templates WHERE id = template_id
        )
    );

-- template_access 정책: 템플릿 소유자만 권한 관리 가능
CREATE POLICY "Template Access: 소유자만 권한 관리" ON public.template_access
    FOR ALL USING (
        auth.uid() IN (
            SELECT created_by FROM public.templates WHERE id = template_id
        )
    );

-- ================================
-- 3. 인덱스 생성 (성능 최적화)
-- ================================
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.templates(is_public);
CREATE INDEX IF NOT EXISTS idx_template_access_template_id ON public.template_access(template_id);
CREATE INDEX IF NOT EXISTS idx_template_access_user_id ON public.template_access(user_id);
CREATE INDEX IF NOT EXISTS idx_template_access_composite ON public.template_access(template_id, user_id);

-- ================================
-- 4. 함수 생성 (템플릿 접근 권한 확인)
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

-- ================================
-- 5. 트리거 생성 (updated_at 자동 업데이트)
-- ================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON public.templates 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================
-- 6. 샘플 데이터 (선택사항)
-- ================================
-- 주석을 제거하고 실행하면 샘플 데이터가 생성됩니다
/*
INSERT INTO public.templates (name, description, is_public, content) VALUES 
('기본 템플릿', '모든 사용자가 사용할 수 있는 기본 템플릿', true, '{"type": "basic", "layout": "default"}'),
('프리미엄 템플릿', '특별한 기능이 포함된 프리미엄 템플릿', false, '{"type": "premium", "layout": "advanced"}');
*/