-- Create admin_tab_order table for managing admin page tab order
CREATE TABLE IF NOT EXISTS public.admin_tab_order (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tab_id varchar NOT NULL UNIQUE,
  order_index integer NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT check_tab_id CHECK (
    tab_id IN (
      'workCalendar',
      'customOrders',
      'purchases',
      'templates',
      'thumbnails',
      'portfolios',
      'users',
      'teams',
      'teamTemplates',
      'emailPreview',
      'access',
      'settings'
    )
  )
);

-- Create index for faster ordering queries
CREATE INDEX idx_admin_tab_order_order_index ON public.admin_tab_order(order_index);

-- Insert default tab order (matching current order in admin page)
INSERT INTO public.admin_tab_order (tab_id, order_index, is_visible) VALUES
  ('workCalendar', 0, true),
  ('customOrders', 1, true),
  ('purchases', 2, true),
  ('templates', 3, true),
  ('thumbnails', 4, true),
  ('portfolios', 5, true),
  ('users', 6, true),
  ('teams', 7, true),
  ('teamTemplates', 8, true),
  ('emailPreview', 9, true),
  ('access', 10, true),
  ('settings', 11, true)
ON CONFLICT (tab_id) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE public.admin_tab_order IS 'Stores the order and visibility of admin dashboard tabs';
COMMENT ON COLUMN public.admin_tab_order.tab_id IS 'Unique identifier for the tab (matches TabType)';
COMMENT ON COLUMN public.admin_tab_order.order_index IS 'Display order of the tab (0-based)';
COMMENT ON COLUMN public.admin_tab_order.is_visible IS 'Whether the tab should be displayed';
