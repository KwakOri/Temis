-- Remove plan option fields from template_products table
-- These are now managed in the template_plans table

ALTER TABLE template_products
DROP COLUMN IF EXISTS is_artist,
DROP COLUMN IF EXISTS is_memo,
DROP COLUMN IF EXISTS is_multi_schedule,
DROP COLUMN IF EXISTS is_guerrilla,
DROP COLUMN IF EXISTS is_offline_memo;

-- Note: plan column is kept in template_products for pricing differentiation
