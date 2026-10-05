-- Team membership and schedules remain in the existing tables. A Studio
-- template has one connected team; a team may use multiple Studio designs.
CREATE TABLE public.team_studio_connections (
  template_id UUID PRIMARY KEY REFERENCES public.templates(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  member_bindings JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(member_bindings) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX team_studio_connections_team_id_idx
  ON public.team_studio_connections(team_id);

ALTER TABLE public.team_studio_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_studio_connections FROM anon, authenticated;
GRANT ALL ON public.team_studio_connections TO service_role;

COMMENT ON TABLE public.team_studio_connections IS
  'Server-managed Studio template team assignment and slot-to-user mapping; no schedule copies.';
