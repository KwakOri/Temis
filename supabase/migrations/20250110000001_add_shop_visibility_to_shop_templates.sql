-- Add shop-related columns to shop_templates table
-- name, description, thumbnail_url are accessed via template_id join
-- Only shop-specific fields are stored here

-- Add new columns
ALTER TABLE shop_templates
ADD COLUMN IF NOT EXISTS detailed_description TEXT,
ADD COLUMN IF NOT EXISTS is_shop_visible BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shop_templates_is_shop_visible ON shop_templates(is_shop_visible) WHERE is_shop_visible = true;

-- Add comments for documentation
COMMENT ON COLUMN shop_templates.detailed_description IS 'Shop-specific detailed description (only used in shop pages)';
COMMENT ON COLUMN shop_templates.is_shop_visible IS 'Whether this product is visible in the shop (replaces templates.is_shop_visible)';
