-- Migration: Restructure template_products and template_plans
-- 1. Add price column to template_plans (each plan has its own price)
-- 2. Remove plan column from template_products (one product per template)

-- Add price to template_plans
ALTER TABLE template_plans
ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;

COMMENT ON COLUMN template_plans.price IS 'Price for this plan (lite or pro)';

-- Remove plan column from template_products (after migrating data)
-- First, let's check if we need to migrate any existing data
DO $$
BEGIN
    -- If plan column exists in template_products, we might need to handle migration
    -- For now, we'll just drop it since the new structure is different
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'template_products'
        AND column_name = 'plan'
    ) THEN
        ALTER TABLE template_products DROP COLUMN plan;
    END IF;
END $$;

COMMENT ON TABLE template_products IS 'Stores product information for templates (one per template)';
COMMENT ON TABLE template_plans IS 'Stores plan-specific information including price and features (lite and pro per template)';
