-- Append-only operational audit events for Template Studio save/publish flows.
-- Store summaries and diagnostics only; raw documents and image data URLs must
-- never be written here.

CREATE TABLE IF NOT EXISTS public.template_studio_save_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL,
  template_id UUID NOT NULL,
  user_id BIGINT,
  operation VARCHAR(30) NOT NULL,
  stage VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_code TEXT,
  error_message TEXT,
  diagnostics JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT template_studio_save_events_operation_check
    CHECK (operation IN ('save_draft', 'publish', 'preview')),
  CONSTRAINT template_studio_save_events_stage_check
    CHECK (
      stage IN (
        'client_validation',
        'asset_sync',
        'server_validation',
        'draft_persistence',
        'publish_persistence'
      )
    ),
  CONSTRAINT template_studio_save_events_status_check
    CHECK (status IN ('started', 'succeeded', 'failed')),
  CONSTRAINT template_studio_save_events_diagnostics_check
    CHECK (jsonb_typeof(diagnostics) = 'array'),
  CONSTRAINT template_studio_save_events_document_summary_check
    CHECK (jsonb_typeof(document_summary) = 'object'),
  CONSTRAINT template_studio_save_events_metadata_check
    CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE public.template_studio_save_events IS
  'Append-only Template Studio save/publish audit events. Raw documents and image bytes are intentionally excluded.';
COMMENT ON COLUMN public.template_studio_save_events.attempt_id IS
  'Client-generated correlation id shared by asset sync and draft/publish persistence requests.';
COMMENT ON COLUMN public.template_studio_save_events.template_id IS
  'Template id snapshot. No foreign key is used so audit history survives template deletion.';

CREATE INDEX IF NOT EXISTS idx_template_studio_save_events_attempt_created_at
  ON public.template_studio_save_events(attempt_id, created_at);
CREATE INDEX IF NOT EXISTS idx_template_studio_save_events_template_created_at
  ON public.template_studio_save_events(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_studio_save_events_failed_created_at
  ON public.template_studio_save_events(created_at DESC)
  WHERE status = 'failed';

ALTER TABLE public.template_studio_save_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.template_studio_save_events FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.template_studio_save_events TO service_role;
