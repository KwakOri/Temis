-- Extend the existing templates table into the canonical root for every template engine.
-- Apply locally first. Remote application is intentionally deferred.

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS template_engine TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS created_by BIGINT;

UPDATE public.templates
SET template_engine = 'legacy'
WHERE template_engine IS NULL;

UPDATE public.templates
SET status = 'published'
WHERE status IS NULL;

ALTER TABLE public.templates
  ALTER COLUMN template_engine SET DEFAULT 'legacy',
  ALTER COLUMN template_engine SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'published',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.templates'::regclass
      AND conname = 'templates_template_engine_check'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_template_engine_check
      CHECK (template_engine IN ('legacy', 'studio'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.templates'::regclass
      AND conname = 'templates_status_check'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_status_check
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.templates'::regclass
      AND conname = 'templates_created_by_fkey'
  ) THEN
    ALTER TABLE public.templates
      ADD CONSTRAINT templates_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_templates_engine_status_updated_at
  ON public.templates(template_engine, status, updated_at DESC);

COMMENT ON COLUMN public.templates.template_engine IS
  'Template authoring/runtime engine: legacy or studio.';

COMMENT ON COLUMN public.templates.status IS
  'Template publication lifecycle: draft, published, or archived.';

COMMENT ON COLUMN public.templates.created_by IS
  'User who created the template when known. Historical templates may be null.';

COMMENT ON COLUMN public.templates.is_public IS
  'Product classification: true for generally sold templates, false for private/custom templates. This is not usage entitlement.';

