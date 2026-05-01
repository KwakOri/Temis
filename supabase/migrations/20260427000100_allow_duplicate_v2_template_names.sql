-- Treat v2 template names as display labels.
-- Template identity is managed by id, so duplicate names should be allowed.

ALTER TABLE public.v2_templates
  DROP CONSTRAINT IF EXISTS v2_templates_name_key;
