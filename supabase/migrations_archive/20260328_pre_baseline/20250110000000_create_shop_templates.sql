-- Create shop_templates table
-- This table replaces template_products for shop-related functionality
-- Price field is removed as it's now stored in template_plans

CREATE TABLE IF NOT EXISTS shop_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  title TEXT,
  features TEXT[],
  requirements TEXT,
  purchase_instructions TEXT,
  is_artist BOOLEAN DEFAULT false,
  is_memo BOOLEAN DEFAULT false,
  is_multi_schedule BOOLEAN DEFAULT false,
  is_guerrilla BOOLEAN DEFAULT false,
  is_offline_memo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shop_templates_template_id ON shop_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_shop_templates_created_at ON shop_templates(created_at DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shop_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shop_templates_updated_at
  BEFORE UPDATE ON shop_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_templates_updated_at();

-- Add comments for documentation
COMMENT ON TABLE shop_templates IS 'Shop template product information - price is stored in template_plans table';
COMMENT ON COLUMN shop_templates.template_id IS 'Reference to the template this shop product is for';
COMMENT ON COLUMN shop_templates.title IS 'Product title displayed in shop';
COMMENT ON COLUMN shop_templates.features IS 'Array of feature descriptions';
COMMENT ON COLUMN shop_templates.requirements IS 'Product requirements or prerequisites';
COMMENT ON COLUMN shop_templates.purchase_instructions IS 'Instructions shown to customers during purchase';
COMMENT ON COLUMN shop_templates.is_artist IS 'Whether template includes artist feature';
COMMENT ON COLUMN shop_templates.is_memo IS 'Whether template includes memo feature';
COMMENT ON COLUMN shop_templates.is_multi_schedule IS 'Whether template includes multi-schedule feature';
COMMENT ON COLUMN shop_templates.is_guerrilla IS 'Whether template includes guerrilla feature';
COMMENT ON COLUMN shop_templates.is_offline_memo IS 'Whether template includes offline memo feature';
