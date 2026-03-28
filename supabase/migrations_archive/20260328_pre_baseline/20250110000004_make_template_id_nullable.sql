-- Make template_id nullable in template_plans table
-- This completes the migration to shop_template_id by removing the NOT NULL constraint

ALTER TABLE template_plans
ALTER COLUMN template_id DROP NOT NULL;

COMMENT ON COLUMN template_plans.template_id IS 'DEPRECATED - Use shop_template_id instead. Kept nullable for backward compatibility.';
