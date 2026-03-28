-- Migration: Change template_purchase_requests.plan to plan_id
-- Date: 2025-01-12
-- Description:
--   1. Add plan_id column as foreign key to template_plans
--   2. Copy data from plan to plan_id (if needed)
--   3. Drop old plan column
--   4. Add NOT NULL constraint to plan_id

-- Step 1: Add plan_id column as UUID with foreign key constraint
ALTER TABLE template_purchase_requests
ADD COLUMN plan_id UUID REFERENCES template_plans(id) ON DELETE RESTRICT;

-- Step 2: (Optional) If there's existing data mapping needed, add here
-- For now, this will be handled by the data migration script

-- Step 3: Drop the old plan column (after data migration is complete)
-- IMPORTANT: Only run this after verifying data migration is successful
-- ALTER TABLE template_purchase_requests DROP COLUMN plan;

-- Step 4: Add NOT NULL constraint (after data migration is complete)
-- IMPORTANT: Only run this after all existing records have plan_id set
-- ALTER TABLE template_purchase_requests ALTER COLUMN plan_id SET NOT NULL;

-- Note: Steps 3 and 4 are commented out for safety.
-- Uncomment and run them after:
-- 1. Running the data migration script
-- 2. Verifying all records have valid plan_id values
-- 3. Ensuring no application code is still using the old 'plan' column
