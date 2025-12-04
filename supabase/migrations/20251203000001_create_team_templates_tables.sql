-- Create team_templates table
CREATE TABLE IF NOT EXISTS public.team_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  descriptions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create relations_team_template_and_team junction table
CREATE TABLE IF NOT EXISTS public.relations_team_template_and_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_template_id UUID NOT NULL REFERENCES public.team_templates(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_template_id, team_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_relations_team_template_id ON public.relations_team_template_and_team(team_template_id);
CREATE INDEX IF NOT EXISTS idx_relations_team_id ON public.relations_team_template_and_team(team_id);

-- Add comments for documentation
COMMENT ON TABLE public.team_templates IS 'Stores team template definitions with name and descriptions';
COMMENT ON TABLE public.relations_team_template_and_team IS 'Junction table linking team templates to teams (many-to-many relationship)';
COMMENT ON COLUMN public.team_templates.name IS 'Name of the team template';
COMMENT ON COLUMN public.team_templates.descriptions IS 'Detailed descriptions of the team template';
COMMENT ON COLUMN public.relations_team_template_and_team.team_template_id IS 'Reference to team_templates table';
COMMENT ON COLUMN public.relations_team_template_and_team.team_id IS 'Reference to teams table';
