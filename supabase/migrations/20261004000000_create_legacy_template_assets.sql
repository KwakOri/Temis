-- Legacy layout remains in code. Only image bindings and immutable revisions live here.
CREATE TABLE public.legacy_template_asset_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid UNIQUE REFERENCES public.templates(id) ON DELETE RESTRICT,
  team_template_id uuid UNIQUE REFERENCES public.team_templates(id) ON DELETE RESTRICT,
  thumbnail_id uuid UNIQUE REFERENCES public.thumbnails(id) ON DELETE RESTRICT,
  mode text NOT NULL DEFAULT 'local' CHECK (mode IN ('local', 'r2')),
  expected_slots jsonb NOT NULL CHECK (jsonb_typeof(expected_slots) = 'object' AND expected_slots <> '{}'::jsonb),
  active_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(template_id, team_template_id, thumbnail_id) = 1)
);
CREATE TABLE public.legacy_template_asset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_set_id uuid NOT NULL REFERENCES public.legacy_template_asset_sets(id) ON DELETE RESTRICT,
  asset_id text NOT NULL CHECK (asset_id ~ '^[a-f0-9]{64}$'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  storage_path text NOT NULL UNIQUE CHECK (storage_path LIKE 'legacy-template-assets/%'),
  mime_type text NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp','image/gif','image/avif')),
  byte_size bigint NOT NULL CHECK (byte_size BETWEEN 1 AND 33554432),
  width integer NOT NULL CHECK (width > 0), height integer NOT NULL CHECK (height > 0),
  original_filename text NOT NULL,
  created_by integer REFERENCES public.users(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_set_id, asset_id, content_hash), UNIQUE(asset_set_id, id)
);
CREATE TABLE public.legacy_template_asset_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_set_id uuid NOT NULL REFERENCES public.legacy_template_asset_sets(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL CHECK (revision_no > 0),
  bindings jsonb NOT NULL CHECK (jsonb_typeof(bindings) = 'object'),
  note text NOT NULL DEFAULT '', created_by integer REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_set_id, revision_no), UNIQUE(asset_set_id, id)
);
ALTER TABLE public.legacy_template_asset_sets ADD CONSTRAINT legacy_assets_active_revision_fk
  FOREIGN KEY(id, active_revision_id) REFERENCES public.legacy_template_asset_revisions(asset_set_id, id);
ALTER TABLE public.legacy_template_asset_sets ADD CHECK (mode = 'local' OR active_revision_id IS NOT NULL);

ALTER TABLE public.legacy_template_asset_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_template_asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_template_asset_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_template_asset_sets, public.legacy_template_asset_versions, public.legacy_template_asset_revisions FROM anon, authenticated;
REVOKE ALL ON public.legacy_template_asset_sets, public.legacy_template_asset_versions, public.legacy_template_asset_revisions FROM service_role;
GRANT SELECT, INSERT, UPDATE ON public.legacy_template_asset_sets TO service_role;
GRANT SELECT, INSERT ON public.legacy_template_asset_versions, public.legacy_template_asset_revisions TO service_role;

CREATE FUNCTION public.apply_legacy_template_asset_revision(
  p_set_id uuid, p_expected_revision_id uuid, p_bindings jsonb, p_actor_id integer,
  p_note text DEFAULT '', p_mode text DEFAULT 'r2'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s public.legacy_template_asset_sets%ROWTYPE;
  theme record; slot record; revision_id uuid; next_no integer;
BEGIN
  SELECT * INTO s FROM public.legacy_template_asset_sets WHERE id = p_set_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'asset_set_not_found' USING ERRCODE = 'P0002'; END IF;
  IF s.active_revision_id IS DISTINCT FROM p_expected_revision_id THEN
    RAISE EXCEPTION 'asset_revision_conflict' USING ERRCODE = '40001';
  END IF;
  IF p_mode NOT IN ('local','r2') OR p_mode IS NULL OR p_bindings IS NULL OR jsonb_typeof(p_bindings) <> 'object'
     OR (SELECT count(*) FROM jsonb_object_keys(p_bindings)) <> (SELECT count(*) FROM jsonb_object_keys(s.expected_slots)) THEN
    RAISE EXCEPTION 'invalid_asset_bindings' USING ERRCODE = '22023';
  END IF;
  FOR theme IN SELECT key, value FROM jsonb_each(s.expected_slots) LOOP
    IF jsonb_typeof(theme.value) <> 'array' OR NOT p_bindings ? theme.key OR jsonb_typeof(p_bindings->theme.key) <> 'object'
       OR (SELECT count(*) FROM jsonb_object_keys(p_bindings->theme.key)) <> jsonb_array_length(theme.value) THEN
      RAISE EXCEPTION 'invalid_asset_theme' USING ERRCODE = '22023';
    END IF;
    FOR slot IN SELECT value #>> '{}' AS key FROM jsonb_array_elements(theme.value) LOOP
      IF NOT (p_bindings->theme.key) ? slot.key OR NOT EXISTS (
        SELECT 1 FROM public.legacy_template_asset_versions v
        WHERE v.asset_set_id = s.id AND v.id::text = p_bindings->theme.key->>slot.key
      ) THEN RAISE EXCEPTION 'invalid_asset_slot' USING ERRCODE = '22023'; END IF;
    END LOOP;
  END LOOP;
  SELECT COALESCE(max(revision_no),0)+1 INTO next_no FROM public.legacy_template_asset_revisions WHERE asset_set_id = s.id;
  INSERT INTO public.legacy_template_asset_revisions(asset_set_id, revision_no, bindings, note, created_by)
    VALUES(s.id, next_no, p_bindings, left(COALESCE(p_note,''),1000), p_actor_id) RETURNING id INTO revision_id;
  UPDATE public.legacy_template_asset_sets SET active_revision_id = revision_id, mode = p_mode, updated_at = now() WHERE id = s.id;
  RETURN revision_id;
END $$;
REVOKE ALL ON FUNCTION public.apply_legacy_template_asset_revision(uuid,uuid,jsonb,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_legacy_template_asset_revision(uuid,uuid,jsonb,integer,text,text) TO service_role;
