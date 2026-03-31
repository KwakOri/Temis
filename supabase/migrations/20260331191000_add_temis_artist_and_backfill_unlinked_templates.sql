-- =====================================================
-- 테미스 작가 추가 + 작가 미연결 템플릿 백필
-- =====================================================

WITH existing_temis AS (
  SELECT id
  FROM public.artists
  WHERE slug = 'temis'
     OR name = '테미스'
  ORDER BY CASE WHEN slug = 'temis' THEN 0 ELSE 1 END, created_at ASC
  LIMIT 1
),
inserted_temis AS (
  INSERT INTO public.artists (
    name,
    slug,
    bio,
    is_active
  )
  SELECT
    '테미스',
    'temis',
    '기본 연결용 내부 작가',
    true
  WHERE NOT EXISTS (SELECT 1 FROM existing_temis)
  RETURNING id
),
temis_artist AS (
  SELECT id FROM inserted_temis
  UNION ALL
  SELECT id FROM existing_temis
  LIMIT 1
),
templates_without_artist AS (
  SELECT t.id AS template_id
  FROM public.templates t
  LEFT JOIN public.template_artists ta
    ON ta.template_id = t.id
  GROUP BY t.id
  HAVING COUNT(ta.id) = 0
)
INSERT INTO public.template_artists (
  template_id,
  artist_id,
  role,
  is_primary,
  display_order
)
SELECT
  t.template_id,
  a.id,
  'creator',
  true,
  0
FROM templates_without_artist t
CROSS JOIN temis_artist a
ON CONFLICT (template_id, artist_id) DO NOTHING;
