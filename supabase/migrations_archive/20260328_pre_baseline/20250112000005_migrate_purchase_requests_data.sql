-- =====================================================
-- Data Migration: purchase_requests → template_purchase_requests
-- =====================================================
--
-- This migration moves all data from the old purchase_requests table
-- to the new template_purchase_requests table with the following transformations:
-- 1. Looks up user_id from users table by matching customer_email
-- 2. Sets plan_id to the hardcoded UUID: 54bc7f78-8671-4275-b849-f5ae013646d8
-- 3. Maps customer_name to customer_phone (since depositor_name doesn't exist)
--
-- IMPORTANT: Run this migration AFTER confirming:
-- - template_purchase_requests table has plan_id column
-- - All users in purchase_requests exist in the users table
--
-- To rollback: DELETE FROM template_purchase_requests WHERE plan_id = '54bc7f78-8671-4275-b849-f5ae013646d8'::uuid;
-- =====================================================

-- Step 1: Add depositor_name column if it doesn't exist
ALTER TABLE template_purchase_requests
ADD COLUMN IF NOT EXISTS depositor_name TEXT;

-- Step 2: Migrate data
INSERT INTO template_purchase_requests (
  id,
  user_id,
  template_id,
  plan_id,
  depositor_name,
  customer_phone,
  message,
  status,
  created_at,
  updated_at
)
SELECT
  pr.id,
  u.id as user_id,
  pr.template_id,
  '54bc7f78-8671-4275-b849-f5ae013646d8'::uuid as plan_id,
  pr.customer_name as depositor_name,
  pr.customer_phone,
  pr.message,
  pr.status,
  pr.created_at,
  pr.created_at as updated_at
FROM purchase_requests pr
INNER JOIN users u ON u.email = pr.customer_email
WHERE NOT EXISTS (
  -- Prevent duplicate inserts if migration is run multiple times
  SELECT 1 FROM template_purchase_requests tpr WHERE tpr.id = pr.id
);

-- Step 3: Verify migration
-- This should return the count of migrated records (should be 17)
DO $$
DECLARE
  migrated_count INTEGER;
  original_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM template_purchase_requests;
  SELECT COUNT(*) INTO original_count FROM purchase_requests;

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Original records in purchase_requests: %', original_count;
  RAISE NOTICE '  Migrated records in template_purchase_requests: %', migrated_count;

  IF migrated_count < original_count THEN
    RAISE WARNING 'Some records were not migrated! Check for users without matching emails.';
  ELSE
    RAISE NOTICE '  ✓ All records migrated successfully!';
  END IF;
END $$;
