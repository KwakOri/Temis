-- Restructure template_plans to reference shop_templates instead of templates
-- This makes the relationship clearer: shop_templates owns the pricing plans

-- Step 1: Add new column for shop_template_id
ALTER TABLE template_plans
ADD COLUMN IF NOT EXISTS shop_template_id UUID;

-- Step 2: Migrate existing data
-- For each template_plan, find the corresponding shop_template and link them
UPDATE template_plans tp
SET shop_template_id = st.id
FROM shop_templates st
WHERE tp.template_id = st.template_id;

-- Step 3: Add foreign key constraint
ALTER TABLE template_plans
ADD CONSTRAINT fk_template_plans_shop_template
FOREIGN KEY (shop_template_id)
REFERENCES shop_templates(id)
ON DELETE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_template_plans_shop_template_id
ON template_plans(shop_template_id);

-- Step 5: Make shop_template_id NOT NULL after data migration
ALTER TABLE template_plans
ALTER COLUMN shop_template_id SET NOT NULL;

-- Step 6: Drop old foreign key constraint and column
-- Note: Keep template_id for now for backward compatibility
-- You can remove it later after confirming everything works
ALTER TABLE template_plans
DROP CONSTRAINT IF EXISTS template_plans_template_id_fkey;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN template_plans.shop_template_id IS 'References shop_templates - plans are tied to shop products, not base templates';
COMMENT ON COLUMN template_plans.template_id IS 'DEPRECATED - Use shop_template_id instead. Kept for backward compatibility.';
