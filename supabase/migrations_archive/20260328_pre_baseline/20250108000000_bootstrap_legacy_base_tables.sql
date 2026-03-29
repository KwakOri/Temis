-- Bootstrap migration for legacy pre-migration tables.
-- This migration makes shadow DB replay resilient for diff/pull operations.
-- It is intentionally defensive and should be a no-op on existing environments.

-- Core reference tables used by early migrations.
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS name TEXT;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Legacy table expected by later ALTER migrations.
CREATE TABLE IF NOT EXISTS template_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  plan VARCHAR(20) DEFAULT 'lite',
  title VARCHAR(255),
  sample_images TEXT[],
  purchase_instructions TEXT,
  delivery_time TEXT,
  bank_account_info TEXT,
  is_artist BOOLEAN DEFAULT false,
  is_memo BOOLEAN DEFAULT false,
  is_multi_schedule BOOLEAN DEFAULT false,
  is_guerrilla BOOLEAN DEFAULT false,
  is_offline_memo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_template_products_template_id
ON template_products(template_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'templates'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'template_products_template_id_fkey'
  ) THEN
    ALTER TABLE template_products
    ADD CONSTRAINT template_products_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Legacy source table for purchase migration.
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'templates'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_requests_template_id_fkey'
  ) THEN
    ALTER TABLE purchase_requests
    ADD CONSTRAINT purchase_requests_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Legacy orders table expected by file/order migrations.
CREATE TABLE IF NOT EXISTS custom_timetable_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER,
  template_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'custom_timetable_orders_user_id_fkey'
  ) THEN
    ALTER TABLE custom_timetable_orders
    ADD CONSTRAINT custom_timetable_orders_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'templates'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'custom_timetable_orders_template_id_fkey'
  ) THEN
    ALTER TABLE custom_timetable_orders
    ADD CONSTRAINT custom_timetable_orders_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Legacy access table expected by template access migrations.
CREATE TABLE IF NOT EXISTS template_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER,
  template_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'template_access_user_id_fkey'
  ) THEN
    ALTER TABLE template_access
    ADD CONSTRAINT template_access_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'templates'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'template_access_template_id_fkey'
  ) THEN
    ALTER TABLE template_access
    ADD CONSTRAINT template_access_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Legacy table that was previously defined in a non-timestamp migration.
CREATE TABLE IF NOT EXISTS template_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  plan VARCHAR(20) NOT NULL DEFAULT 'lite' CHECK (plan IN ('lite', 'pro')),
  is_artist BOOLEAN DEFAULT false,
  is_memo BOOLEAN DEFAULT false,
  is_multi_schedule BOOLEAN DEFAULT false,
  is_guerrilla BOOLEAN DEFAULT false,
  is_offline_memo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  UNIQUE(template_id, plan)
);

CREATE INDEX IF NOT EXISTS idx_template_plans_template_id
ON template_plans(template_id);

CREATE INDEX IF NOT EXISTS idx_template_plans_plan
ON template_plans(plan);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'templates'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'template_plans_template_id_fkey'
  ) THEN
    ALTER TABLE template_plans
    ADD CONSTRAINT template_plans_template_id_fkey
    FOREIGN KEY (template_id)
    REFERENCES templates(id)
    ON DELETE CASCADE;
  END IF;
END $$;
