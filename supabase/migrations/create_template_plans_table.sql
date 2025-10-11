-- Create template_plans table for managing plan features per template
-- Separates plan features from product pricing

CREATE TABLE IF NOT EXISTS template_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL DEFAULT 'lite' CHECK (plan IN ('lite', 'pro')),
  is_artist BOOLEAN DEFAULT false,
  is_memo BOOLEAN DEFAULT false,
  is_multi_schedule BOOLEAN DEFAULT false,
  is_guerrilla BOOLEAN DEFAULT false,
  is_offline_memo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),

  -- Ensure one plan per template (unique constraint)
  UNIQUE(template_id, plan)
);

-- Add comments for documentation
COMMENT ON TABLE template_plans IS 'Stores feature configurations for each template plan (lite/pro)';
COMMENT ON COLUMN template_plans.template_id IS 'Reference to the template';
COMMENT ON COLUMN template_plans.plan IS 'Plan type: lite or pro';
COMMENT ON COLUMN template_plans.is_artist IS 'Artist profile feature enabled';
COMMENT ON COLUMN template_plans.is_memo IS 'Memo feature enabled';
COMMENT ON COLUMN template_plans.is_multi_schedule IS 'Multiple schedule feature enabled';
COMMENT ON COLUMN template_plans.is_guerrilla IS 'Guerrilla schedule feature enabled';
COMMENT ON COLUMN template_plans.is_offline_memo IS 'Offline memo feature enabled';

-- Create index for faster lookups
CREATE INDEX idx_template_plans_template_id ON template_plans(template_id);
CREATE INDEX idx_template_plans_plan ON template_plans(plan);
