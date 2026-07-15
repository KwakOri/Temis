-- Step 8: per-user Template Studio runtime state.
-- Published Studio documents are shared; only the values a user enters are
-- stored per user. Admin draft/autosave tables are not reused for this.

CREATE TABLE IF NOT EXISTS public.template_studio_user_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  base_revision_no INTEGER CHECK (
    base_revision_no IS NULL OR base_revision_no > 0
  ),
  runtime_values JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_studio_user_states_user_id
  ON public.template_studio_user_states(user_id);

COMMENT ON TABLE public.template_studio_user_states IS
  'Per-user runtime values entered against a published Template Studio document. Not a document copy.';

DROP TRIGGER IF EXISTS trigger_template_studio_user_states_updated_at
  ON public.template_studio_user_states;

CREATE TRIGGER trigger_template_studio_user_states_updated_at
  BEFORE UPDATE ON public.template_studio_user_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_studio_updated_at();
