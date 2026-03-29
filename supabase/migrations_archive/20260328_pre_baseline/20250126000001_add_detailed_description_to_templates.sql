-- Add detailed_description column to templates table
ALTER TABLE templates
ADD COLUMN detailed_description TEXT;

-- Add comment for the new column
COMMENT ON COLUMN templates.detailed_description IS '템플릿 상세 설명 (HTML 포함 가능)';