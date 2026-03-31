-- =====================================================
-- 판매 전 단계 정책 보강: "작가 없음" 시스템 작가 + 기존 공개 템플릿 백필
-- =====================================================

-- 1) 시스템 작가 "작가 없음" upsert
INSERT INTO public.artists (
  name,
  slug,
  bio,
  is_active
)
VALUES (
  '작가 없음',
  'no-artist',
  '작가 미연결 템플릿의 판매 가능 상태를 위한 시스템 작가',
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  bio = EXCLUDED.bio,
  is_active = true;

-- 2) 공개 템플릿 중 작가 미연결 템플릿을 "작가 없음"으로 백필
WITH no_artist AS (
  SELECT id
  FROM public.artists
  WHERE slug = 'no-artist'
  ORDER BY created_at ASC
  LIMIT 1
),
public_templates_without_artist AS (
  SELECT t.id AS template_id
  FROM public.templates t
  LEFT JOIN public.template_artists ta
    ON ta.template_id = t.id
  WHERE t.is_public = true
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
FROM public_templates_without_artist t
CROSS JOIN no_artist a
ON CONFLICT (template_id, artist_id) DO NOTHING;
