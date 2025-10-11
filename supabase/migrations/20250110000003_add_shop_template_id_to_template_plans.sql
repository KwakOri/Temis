-- Add shop_template_id to template_plans table
-- This restructures the relationship so template_plans references shop_templates instead of templates
-- Reasoning: template_plans are only relevant for shop products, not all templates

-- Step 1: Add new shop_template_id column (nullable initially for safe migration)
ALTER TABLE template_plans
ADD COLUMN IF NOT EXISTS shop_template_id UUID;

-- Step 2: Migrate existing data (if any exists)
-- Link each template_plan to the corresponding shop_template via template_id
-- This step can be skipped if template_plans table is empty
UPDATE template_plans tp
SET shop_template_id = st.id
FROM shop_templates st
WHERE tp.template_id = st.template_id
  AND tp.shop_template_id IS NULL;

-- Step 3: Add foreign key constraint to shop_templates
ALTER TABLE template_plans
ADD CONSTRAINT fk_template_plans_shop_template
FOREIGN KEY (shop_template_id)
REFERENCES shop_templates(id)
ON DELETE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_template_plans_shop_template_id
ON template_plans(shop_template_id);

-- Step 5: Make shop_template_id NOT NULL after data migration
-- Note: This will only succeed if there are no NULL values
-- If template_plans is empty, this constraint will be enforced for future inserts
ALTER TABLE template_plans
ALTER COLUMN shop_template_id SET NOT NULL;

-- Step 6: Drop old foreign key constraint to templates
ALTER TABLE template_plans
DROP CONSTRAINT IF EXISTS template_plans_template_id_fkey;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN template_plans.shop_template_id IS 'References shop_templates - plans are tied to shop products';
COMMENT ON COLUMN template_plans.template_id IS 'DEPRECATED - Use shop_template_id instead. Will be removed in future migration.';

-- Note: template_id column is kept for now for backward compatibility
-- It can be safely removed in a future migration after confirming all code uses shop_template_id
