-- Add plan and feature options to template_products table
-- Plan types: 'lite' and 'pro'
-- Feature flags for customization options

ALTER TABLE template_products
ADD COLUMN plan VARCHAR(20) DEFAULT 'lite' CHECK (plan IN ('lite', 'pro')),
ADD COLUMN is_artist BOOLEAN DEFAULT false,
ADD COLUMN is_memo BOOLEAN DEFAULT false,
ADD COLUMN is_multi_schedule BOOLEAN DEFAULT false,
ADD COLUMN is_guerrilla BOOLEAN DEFAULT false,
ADD COLUMN is_offline_memo BOOLEAN DEFAULT false;

-- Add comment for plan column
COMMENT ON COLUMN template_products.plan IS 'Product plan type: lite or pro';

-- Add comments for feature flags
COMMENT ON COLUMN template_products.is_artist IS 'Artist profile feature enabled';
COMMENT ON COLUMN template_products.is_memo IS 'Memo feature enabled';
COMMENT ON COLUMN template_products.is_multi_schedule IS 'Multiple schedule feature enabled';
COMMENT ON COLUMN template_products.is_guerrilla IS 'Guerrilla schedule feature enabled';
COMMENT ON COLUMN template_products.is_offline_memo IS 'Offline memo feature enabled';
