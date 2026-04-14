-- v2 template editor 전용 스키마
-- 모든 신규 객체는 v2_ 접두사 사용

CREATE TABLE IF NOT EXISTS public.v2_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(name)
);

COMMENT ON TABLE public.v2_templates IS 'v2 템플릿 에디터 전용 템플릿 메타데이터';

CREATE OR REPLACE FUNCTION public.update_v2_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_v2_templates_updated_at ON public.v2_templates;
CREATE TRIGGER trigger_v2_templates_updated_at
  BEFORE UPDATE ON public.v2_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_v2_templates_updated_at();

CREATE TABLE IF NOT EXISTS public.v2_template_render_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.v2_templates(id) ON DELETE CASCADE,
  config_version INTEGER NOT NULL DEFAULT 1 CHECK (config_version > 0),
  render_config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_template_render_configs_template_id
  ON public.v2_template_render_configs(template_id);

COMMENT ON TABLE public.v2_template_render_configs IS 'v2 템플릿 렌더링 설정 본문';

CREATE OR REPLACE FUNCTION public.update_v2_template_render_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_v2_template_render_configs_updated_at
  ON public.v2_template_render_configs;

CREATE TRIGGER trigger_v2_template_render_configs_updated_at
  BEFORE UPDATE ON public.v2_template_render_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_v2_template_render_configs_updated_at();

CREATE TABLE IF NOT EXISTS public.v2_template_render_config_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.v2_templates(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  config_version INTEGER NOT NULL DEFAULT 1 CHECK (config_version > 0),
  render_config JSONB NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'publish'
    CHECK (source IN ('publish', 'backfill', 'system')),
  created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_v2_template_render_config_revisions_template_created_at
  ON public.v2_template_render_config_revisions(template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_template_render_config_revisions_created_by_created_at
  ON public.v2_template_render_config_revisions(created_by, created_at DESC);

COMMENT ON TABLE public.v2_template_render_config_revisions IS 'v2 템플릿 렌더링 설정 발행 히스토리';

CREATE TABLE IF NOT EXISTS public.v2_template_render_config_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.v2_templates(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  config_version INTEGER NOT NULL DEFAULT 1 CHECK (config_version > 0),
  render_config JSONB NOT NULL,
  base_revision_no INTEGER CHECK (base_revision_no IS NULL OR base_revision_no > 0),
  is_autosave BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_template_render_config_drafts_user_updated_at
  ON public.v2_template_render_config_drafts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_template_render_config_drafts_template_updated_at
  ON public.v2_template_render_config_drafts(template_id, updated_at DESC);

COMMENT ON TABLE public.v2_template_render_config_drafts IS 'v2 템플릿 렌더링 설정 사용자별 draft/autosave';

CREATE OR REPLACE FUNCTION public.update_v2_template_render_config_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_v2_template_render_config_drafts_updated_at
  ON public.v2_template_render_config_drafts;

CREATE TRIGGER trigger_v2_template_render_config_drafts_updated_at
  BEFORE UPDATE ON public.v2_template_render_config_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_v2_template_render_config_drafts_updated_at();
