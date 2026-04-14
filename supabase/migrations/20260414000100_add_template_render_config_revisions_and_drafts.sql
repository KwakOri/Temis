-- v2 template render config 확장
-- 1) revisions: 발행(저장) 히스토리 보관
-- 2) drafts: 사용자별 임시 저장(autosave) 보관

CREATE TABLE IF NOT EXISTS public.template_render_config_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  config_version INTEGER NOT NULL DEFAULT 1 CHECK (config_version > 0),
  render_config JSONB NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'publish'
    CHECK (source IN ('publish', 'backfill', 'system')),
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(template_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_template_render_config_revisions_template_created_at
  ON public.template_render_config_revisions(template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_render_config_revisions_created_by_created_at
  ON public.template_render_config_revisions(created_by, created_at DESC);

COMMENT ON TABLE public.template_render_config_revisions IS '템플릿 렌더링 설정 발행 히스토리';
COMMENT ON COLUMN public.template_render_config_revisions.revision_no IS 'template_id 기준 1부터 증가하는 리비전 번호';
COMMENT ON COLUMN public.template_render_config_revisions.source IS '리비전 생성 출처(publish/backfill/system)';

-- 기존 본문 테이블 데이터를 revision 1로 백필
INSERT INTO public.template_render_config_revisions (
  template_id,
  revision_no,
  config_version,
  render_config,
  source,
  created_at
)
SELECT
  trc.template_id,
  1,
  trc.config_version,
  trc.render_config,
  'backfill',
  COALESCE(trc.updated_at, trc.created_at, timezone('utc'::text, now()))
FROM public.template_render_configs trc
ON CONFLICT (template_id, revision_no) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.template_render_config_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  config_version INTEGER NOT NULL DEFAULT 1 CHECK (config_version > 0),
  render_config JSONB NOT NULL,
  base_revision_no INTEGER CHECK (base_revision_no IS NULL OR base_revision_no > 0),
  is_autosave BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_render_config_drafts_user_updated_at
  ON public.template_render_config_drafts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_render_config_drafts_template_updated_at
  ON public.template_render_config_drafts(template_id, updated_at DESC);

COMMENT ON TABLE public.template_render_config_drafts IS '템플릿 렌더링 설정 사용자별 draft/autosave';
COMMENT ON COLUMN public.template_render_config_drafts.base_revision_no IS 'draft가 기반한 발행 리비전 번호';
COMMENT ON COLUMN public.template_render_config_drafts.is_autosave IS '자동 저장으로 생성된 draft 여부';

CREATE OR REPLACE FUNCTION update_template_render_config_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_template_render_config_drafts_updated_at
  ON public.template_render_config_drafts;

CREATE TRIGGER trigger_template_render_config_drafts_updated_at
  BEFORE UPDATE ON public.template_render_config_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_template_render_config_drafts_updated_at();
