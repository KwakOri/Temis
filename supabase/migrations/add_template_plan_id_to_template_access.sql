-- Add template_plan_id to template_access table
-- This allows us to track which specific plan (lite/pro) a user has access to

ALTER TABLE template_access
ADD COLUMN IF NOT EXISTS template_plan_id UUID REFERENCES template_plans(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_access_template_plan_id ON template_access(template_plan_id);

-- Add comment for documentation
COMMENT ON COLUMN template_access.template_plan_id IS 'Reference to the specific plan (lite/pro) that the user has access to';
