-- Update existing template_products table to add missing columns
ALTER TABLE template_products
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS sample_images TEXT[],
ADD COLUMN IF NOT EXISTS purchase_instructions TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Add comments for new columns
COMMENT ON COLUMN template_products.title IS '상품명';
COMMENT ON COLUMN template_products.sample_images IS '샘플 이미지 URL 목록';
COMMENT ON COLUMN template_products.purchase_instructions IS '구매 안내사항';

-- Add unique constraint to ensure one product per template (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_template_products_template_id') THEN
        CREATE UNIQUE INDEX idx_template_products_template_id ON template_products(template_id);
    END IF;
END $$;

-- Add trigger to update updated_at (if not exists)
CREATE OR REPLACE FUNCTION update_template_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_template_products_updated_at ON template_products;
CREATE TRIGGER update_template_products_updated_at
  BEFORE UPDATE ON template_products
  FOR EACH ROW
  EXECUTE FUNCTION update_template_products_updated_at();