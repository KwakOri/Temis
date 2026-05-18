-- v2 template render config storage
-- 각 템플릿의 렌더링 설정(JSON)을 서버에서 관리하기 위한 테이블

CREATE TABLE IF NOT EXISTS public.template_render_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  config_version INTEGER NOT NULL DEFAULT 1,
  render_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(template_id)
);

CREATE INDEX IF NOT EXISTS idx_template_render_configs_template_id
  ON public.template_render_configs(template_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_template_render_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_template_render_configs_updated_at ON public.template_render_configs;
CREATE TRIGGER trigger_template_render_configs_updated_at
  BEFORE UPDATE ON public.template_render_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_template_render_configs_updated_at();

COMMENT ON TABLE public.template_render_configs IS 'v2 템플릿 렌더링 설정(JSON) 저장 테이블';
COMMENT ON COLUMN public.template_render_configs.template_id IS 'templates.id 참조';
COMMENT ON COLUMN public.template_render_configs.config_version IS '렌더링 설정 스키마 버전';
COMMENT ON COLUMN public.template_render_configs.render_config IS '템플릿 렌더링 설정(JSONB)';
