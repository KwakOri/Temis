-- Add newly introduced admin tabs to admin_tab_order domain and seed missing rows.

ALTER TABLE public.admin_tab_order
  DROP CONSTRAINT IF EXISTS check_tab_id;

ALTER TABLE public.admin_tab_order
  ADD CONSTRAINT check_tab_id
  CHECK (
    tab_id = ANY (
      ARRAY[
        'workCalendar'::varchar,
        'customOrders'::varchar,
        'purchases'::varchar,
        'salesStats'::varchar,
        'templates'::varchar,
        'artists'::varchar,
        'thumbnails'::varchar,
        'portfolios'::varchar,
        'users'::varchar,
        'teams'::varchar,
        'teamTemplates'::varchar,
        'emailPreview'::varchar,
        'access'::varchar,
        'settings'::varchar
      ]
    )
  );

-- Keep existing tab ordering as-is and append new tabs only when missing.
WITH next_idx AS (
  SELECT COALESCE(MAX(order_index), -1) + 1 AS idx
  FROM public.admin_tab_order
)
INSERT INTO public.admin_tab_order (tab_id, order_index, is_visible)
SELECT 'salesStats', idx, true
FROM next_idx
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_tab_order
  WHERE tab_id = 'salesStats'
);

WITH next_idx AS (
  SELECT COALESCE(MAX(order_index), -1) + 1 AS idx
  FROM public.admin_tab_order
)
INSERT INTO public.admin_tab_order (tab_id, order_index, is_visible)
SELECT 'artists', idx, true
FROM next_idx
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_tab_order
  WHERE tab_id = 'artists'
);
