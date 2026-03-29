-- Add plan option fields back to template_products table
-- These fields indicate whether the template has these features available
-- (different from template_plans which indicate whether a specific plan can use the features)

ALTER TABLE template_products
ADD COLUMN IF NOT EXISTS is_artist BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_memo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_multi_schedule BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_guerrilla BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_offline_memo BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN template_products.is_artist IS 'Whether the template has artist profile feature available';
COMMENT ON COLUMN template_products.is_memo IS 'Whether the template has memo feature available';
COMMENT ON COLUMN template_products.is_multi_schedule IS 'Whether the template has multiple schedule feature available';
COMMENT ON COLUMN template_products.is_guerrilla IS 'Whether the template has guerrilla schedule feature available';
COMMENT ON COLUMN template_products.is_offline_memo IS 'Whether the template has offline memo feature available';
