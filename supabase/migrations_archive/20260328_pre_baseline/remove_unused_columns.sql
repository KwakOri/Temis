-- Remove unused columns from template_products table
-- delivery_time, bank_account_info, sample_images are no longer used

ALTER TABLE template_products
DROP COLUMN IF EXISTS delivery_time,
DROP COLUMN IF EXISTS bank_account_info,
DROP COLUMN IF EXISTS sample_images;
