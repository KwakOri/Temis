-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_portfolios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Legacy compatibility migration:
-- In baseline-first setups, public.users may be created in a later migration.
-- Skip portfolios creation here when users table does not exist yet.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'Skipping portfolios creation in 20251205000001 because public.users is missing.';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_portfolios_category ON public.portfolios(category);
  CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON public.portfolios(created_at DESC);

  DROP TRIGGER IF EXISTS set_portfolios_updated_at ON public.portfolios;
  CREATE TRIGGER set_portfolios_updated_at
    BEFORE UPDATE ON public.portfolios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_portfolios_updated_at();
END
$$;
