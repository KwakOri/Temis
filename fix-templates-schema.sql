-- 템플릿 관리 오류 수정을 위한 스키마 수정
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 기존 templates 테이블의 created_by 외래키 제약 조건 제거 (있다면)
ALTER TABLE IF EXISTS public.templates DROP CONSTRAINT IF EXISTS templates_created_by_fkey;

-- 2. templates 테이블을 public.users 테이블을 참조하도록 수정
ALTER TABLE public.templates 
DROP CONSTRAINT IF EXISTS templates_created_by_fkey;

ALTER TABLE public.templates 
ADD CONSTRAINT templates_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. template_access 테이블도 public.users를 참조하도록 수정
ALTER TABLE public.template_access 
DROP CONSTRAINT IF EXISTS template_access_user_id_fkey;

ALTER TABLE public.template_access 
DROP CONSTRAINT IF EXISTS template_access_granted_by_fkey;

ALTER TABLE public.template_access 
ADD CONSTRAINT template_access_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.template_access 
ADD CONSTRAINT template_access_granted_by_fkey 
FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. 기존 RLS 정책들 삭제 (auth.uid() 기반이므로 작동하지 않음)
DROP POLICY IF EXISTS "Templates: 소유자는 모든 권한" ON public.templates;
DROP POLICY IF EXISTS "Templates: 공개 템플릿은 읽기 가능" ON public.templates;
DROP POLICY IF EXISTS "Template Access: 권한 있는 사용자만 조회" ON public.template_access;
DROP POLICY IF EXISTS "Template Access: 소유자만 권한 관리" ON public.template_access;

-- 5. RLS 비활성화 (JWT 기반 인증 사용하므로)
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_access DISABLE ROW LEVEL SECURITY;

-- 6. 테스트용 템플릿 데이터 삽입 (사용자가 있는 경우에만)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- 첫 번째 사용자의 ID 가져오기
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- 테스트 템플릿 삽입
        INSERT INTO public.templates (name, description, content, is_public, created_by) VALUES
            ('샘플 시간표 템플릿', '기본 시간표 템플릿입니다', '{"type": "timetable", "data": []}', true, test_user_id),
            ('개인 스케줄 템플릿', '개인용 스케줄 관리 템플릿', '{"type": "schedule", "data": []}', false, test_user_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 실행 완료 메시지
SELECT 'Templates schema has been fixed successfully!' as message;