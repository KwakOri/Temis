-- Add is_shop_visible column to templates table
ALTER TABLE templates
ADD COLUMN is_shop_visible BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment for the new column
COMMENT ON COLUMN templates.is_shop_visible IS '상점에서 노출 여부 (공개 템플릿만 해당)';